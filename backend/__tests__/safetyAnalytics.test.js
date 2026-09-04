'use strict';

const {
    getSafetyAnalytics,
    REPORT_TIMEZONE,
    _deriveVehicle,
    _emptySummary,
} = require('../src/services/safetyAnalytics');

const PERIOD = {
    from: new Date('2026-08-02T22:00:00Z'),
    to: new Date('2026-08-09T22:00:00Z'),
    days: 7,
};

function vehicleRow(overrides = {}) {
    return {
        vehicle_id: 'V001',
        days_with_events: '3',
        harsh_brakes: '10',
        harsh_accelerations: '4',
        harsh_cornering: '2',
        crashes: '1',
        overspeed_events: '7',
        idling_events: '5',
        total_events: '29',
        safety_score: '45',
        worst_daily_score: '30',
        classification: 'Poor',
        ...overrides,
    };
}

function fleetRow(overrides = {}) {
    return {
        vehicle_days: '4',
        vehicles_with_events: '2',
        safety_score: '62',
        classification: 'Fair',
        ...overrides,
    };
}

function makeDb({
    vehicleRows = [vehicleRow()],
    fleet = fleetRow(),
    hasTelemetry = true,
} = {}) {
    const calls = [];
    return {
        calls,
        query: jest.fn((sql, params) => {
            calls.push({ sql, params });

            if (sql.includes('clean_telemetry')) {
                return Promise.resolve({ rows: [{ has_telemetry: hasTelemetry }], rowCount: 1 });
            }
            if (sql.includes('vehicles_with_events')) {
                return Promise.resolve({ rows: fleet ? [fleet] : [], rowCount: fleet ? 1 : 0 });
            }
            return Promise.resolve({ rows: vehicleRows, rowCount: vehicleRows.length });
        }),
    };
}

describe('safetyAnalytics - guard clauses', () => {
    test('rejects a db handle without a query function', async () => {
        await expect(getSafetyAnalytics(undefined, [], PERIOD)).rejects.toThrow('getSafetyAnalytics requires a pg client or pool');
    });

    test('rejects a vehicleIds value that is not an array', async () => {
        await expect(getSafetyAnalytics(makeDb(), 'V001', PERIOD)).rejects.toThrow('getSafetyAnalytics requires a vehicleIds array from scopeResolver');
    });

    test.each([
        ['a missing period', undefined],
        ['a period with string bounds', { from: '2026-08-03', to: '2026-08-10' }],
    ])('rejects %s', async (_label, period) => {
        await expect(getSafetyAnalytics(makeDb(), ['V001'], period))
            .rejects.toThrow('getSafetyAnalytics requires a resolved period with Date bounds');
    });


});

describe('safetyAnalytics - query construction', () => {
    test('reports in SAST', () => {
        expect(REPORT_TIMEZONE).toBe('Africa/Johannesburg');
    });



    test('issues per-vehicle, fleet and telemetry-presence queries', async () => {
        const db = makeDb();
        await getSafetyAnalytics(db, ['V001'], PERIOD);
        expect(db.query).toHaveBeenCalledTimes(3);

    });

    test('the telemetry probe takes only the scope and the bounds', async () => {
        const db = makeDb();
        await getSafetyAnalytics(db, ['V001', 'V002'], PERIOD);
        const probe = db.calls.find((c) => c.sql.includes('clean_telemetry'));
        expect(probe.params).toEqual([['V001', 'V002'], PERIOD.from, PERIOD.to]);
    });

    test('the aggregate queries receive the reporting timezone', async () => {
        const db = makeDb();
        await getSafetyAnalytics(db, ['V001'], PERIOD);
        const aggregates = db.calls.filter((c) => !c.sql.includes('clean_telemetry'));
        aggregates.forEach((c) => expect(c.params[3]).toBe('Africa/Johannesburg'));

    });



    test('collapses event bursts into incidents using the burst window', async () => {
        const db = makeDb();
        await getSafetyAnalytics(db, ['V001'], PERIOD);
        const sql = db.calls[0].sql;
        expect(sql).toContain('incident_burst_window()');
        expect(sql).toContain('starts_incident = 1');
    });

    test('excludes uncalibrated crash detections', async () => {
        const db = makeDb();
        await getSafetyAnalytics(db, ['V001'], PERIOD);

        expect(db.calls[0].sql).toContain("NOT LIKE '%not calibrated%'");
    });

    test('counts overspeed and idling as event categories', async () => {
        const db = makeDb();
        await getSafetyAnalytics(db, ['V001'], PERIOD);

        expect(db.calls[0].sql).toContain("e.event_category IN ('over_speeding', 'idling')");
    });

    test('reuses the existing scoring weights and classifier', async () => {
        const db = makeDb();
        await getSafetyAnalytics(db, ['V001'], PERIOD);
        const sql = db.calls[0].sql;

        // Weights 2/2/1/25 and classify_safety_score() already exist in the
        // database. The report must not introduce a second scoring scheme.
        expect(sql).toContain('harsh_brakes * 2');
        expect(sql).toContain('harsh_accelerations * 2');
        expect(sql).toContain('harsh_cornering * 1');
        expect(sql).toContain('crashes * 25');
        expect(sql).toContain('classify_safety_score(');
    });

    test('overspeed and idling are counted but excluded from the score', async () => {
        const db = makeDb();
        await getSafetyAnalytics(db, ['V001'], PERIOD);
        const scoreExpression = db.calls[0].sql.split('AS safety_score')[0].split('GREATEST').pop();

        expect(scoreExpression).not.toContain('overspeed_events');
        expect(scoreExpression).not.toContain('idling_events');
    });

    test('does not query at all for an empty scope', async () => {
        const db = makeDb();
        await getSafetyAnalytics(db, [], PERIOD);

        expect(db.query).not.toHaveBeenCalled();
    });
});

describe('_deriveVehicle()', () => {
    test('coerces string columns into numbers', () => {
        const v = _deriveVehicle(vehicleRow());

        expect(v.vehicleId).toBe('V001');
        expect(v.daysWithEvents).toBe(3);
        expect(v.harshBrakes).toBe(10);
        expect(v.harshAccelerations).toBe(4);
        expect(v.harshCornering).toBe(2);
        expect(v.crashes).toBe(1);
        expect(v.totalEvents).toBe(29);
    });

    test('carries overspeed and idling counts through', () => {
        const v = _deriveVehicle(vehicleRow());

        expect(v.overspeedEvents).toBe(7);
        expect(v.idlingEvents).toBe(5);
    });

    test('keeps the average and the worst daily score separate', () => {
        const v = _deriveVehicle(vehicleRow());

        expect(v.safetyScore).toBe(45);
        expect(v.worstDailyScore).toBe(30);
    });

    test('preserves the classification from the database function', () => {
        expect(_deriveVehicle(vehicleRow()).classification).toBe('Poor');
    });

    test('a null score stays null and is not flattened to zero', () => {
        const v = _deriveVehicle(vehicleRow({ safety_score: null, worst_daily_score: null }));

        expect(v.safetyScore).toBeNull();
        expect(v.worstDailyScore).toBeNull();
    });

    test('a real zero score is preserved as zero', () => {
        expect(_deriveVehicle(vehicleRow({ safety_score: '0' })).safetyScore).toBe(0);
    });

    test('a missing classification becomes null rather than undefined', () => {
        expect(_deriveVehicle(vehicleRow({ classification: undefined })).classification).toBeNull();
    });

    test('treats missing counts as zero rather than NaN', () => {
        const v = _deriveVehicle({ vehicle_id: 'V009' });

        expect(v.harshBrakes).toBe(0);
        expect(v.totalEvents).toBe(0);
        expect(Number.isNaN(v.crashes)).toBe(false);
    });
});

describe('_emptySummary()', () => {
    test('a clean period with telemetry scores a perfect 100', () => {
        const s = _emptySummary(5, true);

        expect(s.hasTelemetry).toBe(true);
        expect(s.safetyScore).toBe(100);
        expect(s.totalEvents).toBe(0);
    });

    test('a period with no telemetry has no score at all', () => {
        // "No events because nothing was reported" is not the same result as
        // "no events because everyone drove well".
        const s = _emptySummary(5, false);

        expect(s.hasTelemetry).toBe(false);
        expect(s.safetyScore).toBeNull();
    });

    test('every vehicle in scope is counted as having no events', () => {
        const s = _emptySummary(5, true);

        expect(s.vehiclesInScope).toBe(5);
        expect(s.vehiclesWithEvents).toBe(0);
        expect(s.vehiclesWithoutEvents).toBe(5);
    });

    test('the per-vehicle-day rate is null, not zero, with no vehicle days', () => {
        expect(_emptySummary(5, true).eventsPerVehicleDay).toBeNull();
    });
});

describe('getSafetyAnalytics() - summary aggregation', () => {
    const ROWS = [
        vehicleRow({
            vehicle_id: 'V001',
            harsh_brakes: '10',
            harsh_accelerations: '4',
            harsh_cornering: '2',
            crashes: '1',
            overspeed_events: '7',
            idling_events: '5',
            total_events: '29',
            safety_score: '45',
        }),
        vehicleRow({
            vehicle_id: 'V002',
            harsh_brakes: '2',
            harsh_accelerations: '1',
            harsh_cornering: '0',
            crashes: '0',
            overspeed_events: '3',
            idling_events: '1',
            total_events: '7',
            safety_score: '92',
        }),
    ];

    test('sums event counts across the per-vehicle rows', async () => {
        const { summary } = await getSafetyAnalytics(makeDb({ vehicleRows: ROWS }), ['V001', 'V002'], PERIOD);

        expect(summary.harshBrakes).toBe(12);
        expect(summary.harshAccelerations).toBe(5);
        expect(summary.harshCornering).toBe(2);
        expect(summary.crashes).toBe(1);
        expect(summary.overspeedEvents).toBe(10);
        expect(summary.idlingEvents).toBe(6);
        expect(summary.totalEvents).toBe(36);
    });

    test('takes the fleet score from the database, not from averaging vehicle scores', async () => {
        const db = makeDb({ vehicleRows: ROWS, fleet: fleetRow({ safety_score: '62' }) });
        const { summary } = await getSafetyAnalytics(db, ['V001', 'V002'], PERIOD);

        // A mean of 45 and 92 would be 68.5. The fleet score is averaged over
        // vehicle-days in SQL instead, so it must not be recomputed here.
        expect(summary.safetyScore).toBe(62);
        expect(summary.classification).toBe('Fair');
    });

    test('normalises event volume by vehicle-days', async () => {
        const db = makeDb({ vehicleRows: ROWS, fleet: fleetRow({ vehicle_days: '4' }) });
        const { summary } = await getSafetyAnalytics(db, ['V001', 'V002'], PERIOD);

        expect(summary.vehicleDaysWithEvents).toBe(4);
        expect(summary.eventsPerVehicleDay).toBe(9);
    });

    test('the per-vehicle-day rate is null when there are no vehicle days', async () => {
        const db = makeDb({ vehicleRows: ROWS, fleet: fleetRow({ vehicle_days: '0' }) });
        const { summary } = await getSafetyAnalytics(db, ['V001', 'V002'], PERIOD);

        expect(summary.eventsPerVehicleDay).toBeNull();
    });

    test('counts vehicles with and without events against the scope', async () => {
        const db = makeDb({ vehicleRows: ROWS });
        const { summary } = await getSafetyAnalytics(db, ['V001', 'V002', 'V003', 'V004'], PERIOD);

        expect(summary.vehiclesInScope).toBe(4);
        expect(summary.vehiclesWithEvents).toBe(2);
        expect(summary.vehiclesWithoutEvents).toBe(2);
    });

    test('never reports a negative count of vehicles without events', async () => {
        const db = makeDb({ vehicleRows: ROWS });
        const { summary } = await getSafetyAnalytics(db, ['V001'], PERIOD);

        expect(summary.vehiclesWithoutEvents).toBe(0);
    });

    test('a null fleet score is preserved rather than coerced', async () => {
        const db = makeDb({ vehicleRows: ROWS, fleet: fleetRow({ safety_score: null, classification: null }) });
        const { summary } = await getSafetyAnalytics(db, ['V001', 'V002'], PERIOD);

        expect(summary.safetyScore).toBeNull();
        expect(summary.classification).toBeNull();
    });

    test('survives an empty fleet aggregate row', async () => {
        const db = makeDb({ vehicleRows: ROWS, fleet: null });
        const { summary } = await getSafetyAnalytics(db, ['V001', 'V002'], PERIOD);

        expect(summary.safetyScore).toBeNull();
        expect(summary.vehicleDaysWithEvents).toBe(0);
        expect(summary.harshBrakes).toBe(12);
    });
});

describe('getSafetyAnalytics() - telemetry presence', () => {
    test('no events plus telemetry means a genuinely clean period', async () => {
        const db = makeDb({ vehicleRows: [], hasTelemetry: true });
        const result = await getSafetyAnalytics(db, ['V001', 'V002'], PERIOD);

        expect(result.vehicles).toEqual([]);
        expect(result.summary.hasTelemetry).toBe(true);
        expect(result.summary.safetyScore).toBe(100);
        expect(result.summary.vehiclesInScope).toBe(2);
    });

    test('no events and no telemetry means the data is missing, not perfect', async () => {
        // A disk-full outage in late August 2026 produced exactly this case.
        const db = makeDb({ vehicleRows: [], hasTelemetry: false });
        const result = await getSafetyAnalytics(db, ['V001', 'V002'], PERIOD);

        expect(result.summary.hasTelemetry).toBe(false);
        expect(result.summary.safetyScore).toBeNull();
    });

    test('an empty scope reports no telemetry and no score', async () => {
        const result = await getSafetyAnalytics(makeDb(), [], PERIOD);

        expect(result.vehicles).toEqual([]);
        expect(result.summary.hasTelemetry).toBe(false);
        expect(result.summary.safetyScore).toBeNull();
        expect(result.summary.vehiclesInScope).toBe(0);
    });

    test('an empty probe result is treated as no telemetry', async () => {
        const db = {
            query: jest.fn((sql) => {
                if (sql.includes('clean_telemetry')) return Promise.resolve({ rows: [], rowCount: 0 });
                return Promise.resolve({ rows: [], rowCount: 0 });
            }),
        };

        const result = await getSafetyAnalytics(db, ['V001'], PERIOD);
        expect(result.summary.hasTelemetry).toBe(false);
    });

    test('telemetry presence is surfaced even when events exist', async () => {
        const db = makeDb({ hasTelemetry: true });
        const result = await getSafetyAnalytics(db, ['V001'], PERIOD);

        expect(result.summary.hasTelemetry).toBe(true);
    });
});

describe('getSafetyAnalytics() - end to end', () => {
    test('returns a summary alongside per-vehicle detail', async () => {
        const result = await getSafetyAnalytics(makeDb(), ['V001'], PERIOD);

        expect(result).toHaveProperty('summary');
        expect(result).toHaveProperty('vehicles');
        expect(result.vehicles[0].vehicleId).toBe('V001');
    });

    test('summary totals agree with the per-vehicle rows', async () => {
        const db = makeDb({
            vehicleRows: [
                vehicleRow({ vehicle_id: 'V001', harsh_brakes: '3', total_events: '3' }),
                vehicleRow({ vehicle_id: 'V002', harsh_brakes: '4', total_events: '4' }),
                vehicleRow({ vehicle_id: 'V003', harsh_brakes: '5', total_events: '5' }),
            ],
        });

        const { summary, vehicles } = await getSafetyAnalytics(db, ['V001', 'V002', 'V003'], PERIOD);
        const manual = vehicles.reduce((sum, v) => sum + v.harshBrakes, 0);

        expect(summary.harshBrakes).toBe(manual);
        expect(summary.totalEvents).toBe(12);
    });

    test('propagates a database failure to the caller', async () => {
        const db = { query: jest.fn().mockRejectedValue(new Error('function does not exist')) };
        await expect(getSafetyAnalytics(db, ['V001'], PERIOD))
            .rejects.toThrow('function does not exist');
    });
});