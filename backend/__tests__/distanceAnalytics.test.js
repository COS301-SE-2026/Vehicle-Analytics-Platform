'use strict';

const {
    setupReportingMockData,
    DEFAULT_TRIP_AGGREGATES,
} = require('./setup/mockReportingDb');

const {
    getDistanceAnalytics,
    REPORT_TIMEZONE,
    _deriveVehicle,
    _summarise,
} = require('../src/services/distanceAnalytics');

const { resolvePeriod } = require('../src/services/period');

const PERIOD = resolvePeriod({
    periodType: 'weekly',
    anchor: new Date('2026-08-19T06:13:00+02:00'),
});

function makeDb(fixture = {}) {
    const { pool, calls } = setupReportingMockData(fixture);
    return { pool, calls };
}

describe('distanceAnalytics - argument validation', () => {
    test('requires a usable database client', async () => {
        await expect(getDistanceAnalytics(null, ['VH-001'], PERIOD))
            .rejects.toThrow(/pg client or pool/);
        await expect(getDistanceAnalytics({}, ['VH-001'], PERIOD))
            .rejects.toThrow(/pg client or pool/);
    });

    test('requires a vehicleIds array, so an unscoped call is impossible', async () => {
        const { pool } = makeDb();
        await expect(getDistanceAnalytics(pool, undefined, PERIOD))
            .rejects.toThrow(/vehicleIds array from scopeResolver/);
        await expect(getDistanceAnalytics(pool, 'VH-001', PERIOD))
            .rejects.toThrow(/vehicleIds array from scopeResolver/);
    });

    test('requires a resolved period with Date bounds', async () => {
        const { pool } = makeDb();
        await expect(getDistanceAnalytics(pool, ['VH-001'], null))
            .rejects.toThrow(/resolved period/);
        await expect(getDistanceAnalytics(pool, ['VH-001'], { from: '2026-08-10', to: '2026-08-17' }))
            .rejects.toThrow(/resolved period/);
    });
});

describe('distanceAnalytics - query construction', () => {
    test('filters by vehicle ids, period bounds and the reporting timezone', async () => {
        const { pool, calls } = makeDb();
        await getDistanceAnalytics(pool, ['VH-001', 'VH-002'], PERIOD);

        const query = calls.find((c) => c.sql.includes('FROM trips'));
        expect(query.params[0]).toEqual(['VH-001', 'VH-002']);
        expect(query.params[1]).toBe(PERIOD.from);
        expect(query.params[2]).toBe(PERIOD.to);
        expect(query.params[3]).toBe(REPORT_TIMEZONE);
    });

    test('uses a half-open interval so a boundary trip is counted once', async () => {
        const { pool, calls } = makeDb();
        await getDistanceAnalytics(pool, ['VH-001'], PERIOD);

        const { sql } = calls.find((c) => c.sql.includes('FROM trips'));
        expect(sql).toMatch(/start_time >= \$2/);
        expect(sql).toMatch(/start_time < \$3/);
        expect(sql).not.toMatch(/start_time <= \$3/);
    });

    test('counts only completed trips', async () => {
        const { pool, calls } = makeDb();
        await getDistanceAnalytics(pool, ['VH-001'], PERIOD);

        const { sql } = calls.find((c) => c.sql.includes('FROM trips'));
        expect(sql).toMatch(/status = 'completed'/);
    });

    test('resolves active days in SAST, not the database session timezone', async () => {
        const { pool, calls } = makeDb();
        await getDistanceAnalytics(pool, ['VH-001'], PERIOD);

        const { sql } = calls.find((c) => c.sql.includes('FROM trips'));
        expect(sql).toMatch(/start_time AT TIME ZONE \$4/);
        expect(sql).not.toMatch(/start_time::date/);
        expect(REPORT_TIMEZONE).toBe('Africa/Johannesburg');
    });

    test('is fully parameterised - no interpolated values', async () => {
        const { pool, calls } = makeDb();
        await getDistanceAnalytics(pool, ['VH-001'], PERIOD);

        const { sql } = calls.find((c) => c.sql.includes('FROM trips'));
        expect(sql).not.toMatch(/INTERVAL '\$\{/);
        expect(sql).not.toMatch(/'\s*\+/);
    });
});



describe('distanceAnalytics - per-vehicle metrics', () => {
    let result;

    beforeEach(async () => {
        const { pool } = makeDb();
        result = await getDistanceAnalytics(pool, ['VH-001', 'VH-002'], PERIOD);
    });

    test('coerces pg numeric and bigint strings into numbers', () => {
        const vh1 = result.vehicles[0];
        expect(typeof vh1.distanceKm).toBe('number');
        expect(typeof vh1.tripCount).toBe('number');
        expect(vh1.distanceKm).toBe(600);
        expect(vh1.tripCount).toBe(10);
    });

    test('average trip distance is distance over trip count', () => {
        expect(result.vehicles[0].avgTripDistanceKm).toBe(60);
        expect(result.vehicles[1].avgTripDistanceKm).toBe(30);
    });

    test('moving speed excludes idle time', () => {
        expect(result.vehicles[0].avgMovingSpeedKmh).toBe(60);
        expect(result.vehicles[1].avgMovingSpeedKmh).toBe(60);
    });

    test('journey speed includes idle time, and is therefore lower', () => {
        expect(result.vehicles[0].avgJourneySpeedKmh).toBe(50);
        expect(result.vehicles[1].avgJourneySpeedKmh).toBe(40);

        result.vehicles.forEach((v) => {
            expect(v.avgJourneySpeedKmh).toBeLessThan(v.avgMovingSpeedKmh);
        });
    });


    test('idle time is elapsed minus moving time', () => {
        expect(result.vehicles[0].idleSeconds).toBe(7200);
        expect(result.vehicles[1].idleSeconds).toBe(3600);
    });

    test('idle ratio is idle over elapsed', () => {
        expect(result.vehicles[0].idleRatio).toBeCloseTo(0.1667, 4);
        expect(result.vehicles[1].idleRatio).toBeCloseTo(0.3333, 4);
    });

    test('utilisation is active days over period days', () => {
        expect(PERIOD.days).toBe(7);
        expect(result.vehicles[0].utilisationPct).toBeCloseTo(71.43, 2);
        expect(result.vehicles[1].utilisationPct).toBeCloseTo(28.57, 2);
    });

    test('vehicles are keyed by vehicle_id', () => {
        expect(result.vehicles.map((v) => v.vehicleId)).toEqual(['VH-001', 'VH-002']);
    });
});


describe('distanceAnalytics - fleet summary', () => {
    test('totals are sums across vehicles', async () => {
        const { pool } = makeDb();
        const { summary } = await getDistanceAnalytics(pool, ['VH-001', 'VH-002'], PERIOD);

        expect(summary.totalDistanceKm).toBe(720);
        expect(summary.totalDurationSeconds).toBe(54000);
        expect(summary.totalMovingSeconds).toBe(43200);
        expect(summary.totalIdleSeconds).toBe(10800);
        expect(summary.tripCount).toBe(14);
    });

    test('fleet speeds are ratio-of-sums, not the mean of per-vehicle averages', async () => {
        const { pool } = makeDb();
        const { summary } = await getDistanceAnalytics(pool, ['VH-001', 'VH-002'], PERIOD);

        expect(summary.avgJourneySpeedKmh).toBe(48);
        expect(summary.avgJourneySpeedKmh).not.toBe(45);
        expect(summary.avgMovingSpeedKmh).toBe(60);
    });

    test('average trip distance is total distance over total trips', async () => {
        const { pool } = makeDb();
        const { summary } = await getDistanceAnalytics(pool, ['VH-001', 'VH-002'], PERIOD);
        expect(summary.avgTripDistanceKm).toBeCloseTo(51.43, 2);
    });

    test('fleet max speed is the highest of any vehicle', async () => {
        const { pool } = makeDb();
        const { summary } = await getDistanceAnalytics(pool, ['VH-001', 'VH-002'], PERIOD);
        expect(summary.maxSpeedKmh).toBe(118);
    });

    test('fleet utilisation is vehicle-days active over available vehicle-days', async () => {
        const { pool } = makeDb();
        const { summary } = await getDistanceAnalytics(pool, ['VH-001', 'VH-002'], PERIOD);
        expect(summary.utilisationPct).toBe(50);
    });
});


describe('distanceAnalytics - silent vehicles', () => {
    test('a vehicle in scope with no trips counts as inactive', async () => {
        const { pool } = makeDb();
        const result = await getDistanceAnalytics(pool, ['VH-001', 'VH-002', 'VH-003'], PERIOD);


        expect(result.summary.vehiclesInScope).toBe(3);
        expect(result.summary.activeVehicles).toBe(2);
        expect(result.summary.inactiveVehicles).toBe(1);
    });


    test('a silent vehicle is not listed with zeroed metrics', async () => {
        const { pool } = makeDb();
        const result = await getDistanceAnalytics(pool, ['VH-001', 'VH-002', 'VH-003'], PERIOD);

        expect(result.vehicles.map((v) => v.vehicleId)).not.toContain('VH-003');
    });



    test('silent vehicles reduce fleet utilisation', async () => {
        const { pool } = makeDb();
        const result = await getDistanceAnalytics(pool, ['VH-001', 'VH-002', 'VH-003'], PERIOD);
        expect(result.summary.utilisationPct).toBeCloseTo(33.33, 2);
    });
});

describe('distanceAnalytics - empty and degenerate data', () => {
    test('an empty scope returns a zeroed result without querying', async () => {
        const { pool, calls } = makeDb();
        const result = await getDistanceAnalytics(pool, [], PERIOD);

        expect(calls).toHaveLength(0);
        expect(result.vehicles).toEqual([]);
        expect(result.summary.totalDistanceKm).toBe(0);
        expect(result.summary.activeVehicles).toBe(0);
        expect(result.summary.vehiclesInScope).toBe(0);
    });

    test('a scope where no vehicle moved returns zeros, not nulls', async () => {
        const { pool } = makeDb({ tripAggregates: [] });
        const result = await getDistanceAnalytics(pool, ['VH-001'], PERIOD);

        expect(result.summary.totalDistanceKm).toBe(0);
        expect(result.summary.tripCount).toBe(0);
        expect(result.summary.inactiveVehicles).toBe(1);
    });

    test('ratios are null rather than zero when the denominator is zero', async () => {
        const { pool } = makeDb({ tripAggregates: [] });
        const { summary } = await getDistanceAnalytics(pool, ['VH-001'], PERIOD);
        expect(summary.avgMovingSpeedKmh).toBeNull();
        expect(summary.avgJourneySpeedKmh).toBeNull();
        expect(summary.avgTripDistanceKm).toBeNull();
        expect(summary.idleRatio).toBeNull();
        expect(summary.maxSpeedKmh).toBeNull();
    });

    test('a trip with no non-zero speed sample does not divide by zero', async () => {
        const { pool } = makeDb({
            tripAggregates: [{
                vehicle_id: 'VH-001',
                trip_count: '1',
                distance_km: '0',
                duration_seconds: '600',
                moving_seconds: '0',
                max_speed_kmh: '0',
                days_active: '1',
            }],
        });
        const result = await getDistanceAnalytics(pool, ['VH-001'], PERIOD);



        expect(result.vehicles[0].avgMovingSpeedKmh).toBeNull();
        expect(result.vehicles[0].idleSeconds).toBe(600);
        expect(result.vehicles[0].idleRatio).toBe(1);

    });

    test('an odometer-derived distance of zero is handled without NaN', async () => {
        const { pool } = makeDb({
            tripAggregates: [{
                vehicle_id: 'VH-001',
                trip_count: '3',
                distance_km: '0',
                duration_seconds: '3600',
                moving_seconds: '0',
                max_speed_kmh: null,
                days_active: '1',
            }],
        });
        const { summary, vehicles } = await getDistanceAnalytics(pool, ['VH-001'], PERIOD);
        expect(summary.totalDistanceKm).toBe(0);
        expect(vehicles[0].avgTripDistanceKm).toBe(0);
        expect(vehicles[0].maxSpeedKmh).toBeNull();
        expect(Number.isNaN(summary.totalDistanceKm)).toBe(false);

    });

    test('derived moving time exceeding elapsed time floors idle at zero', () => {
        const vehicle = _deriveVehicle({
            vehicle_id: 'VH-001',
            trip_count: '1',
            distance_km: '1.0',
            duration_seconds: '50',
            moving_seconds: '60',
            max_speed_kmh: '72',
            days_active: '1',
        }, 7);

        expect(vehicle.idleSeconds).toBe(0);
        expect(vehicle.idleRatio).toBe(0);

    });
});

describe('distanceAnalytics - period sensitivity', () => {
    test('utilisation scales with the length of the period', async () => {
        const monthly = resolvePeriod({
            periodType: 'monthly',
            anchor: new Date('2026-08-19T06:13:00+02:00'),
        });
        expect(monthly.days).toBe(31);

        const { pool } = makeDb();
        const result = await getDistanceAnalytics(pool, ['VH-001'], monthly);

        expect(result.vehicles[0].utilisationPct).toBeCloseTo(16.13, 2);
    });

    test('the same scope over the previous period queries different bounds', async () => {
        const { pool, calls } = makeDb();
        await getDistanceAnalytics(pool, ['VH-001'], PERIOD);
        await getDistanceAnalytics(pool, ['VH-001'], PERIOD.previous);

        const queries = calls.filter((c) => c.sql.includes('FROM trips'));
        expect(queries).toHaveLength(2);
        expect(queries[0].params[1].getTime()).toBe(PERIOD.from.getTime());
        expect(queries[1].params[1].getTime()).toBe(PERIOD.previous.from.getTime());
        expect(queries[1].params[2].getTime()).toBe(PERIOD.from.getTime());
    });
});

describe('distanceAnalytics - summary arithmetic in isolation', () => {
    test('summarise handles an empty vehicle list', () => {
        const summary = _summarise([], 0, 7);
        expect(summary.totalDistanceKm).toBe(0);
        expect(summary.activeVehicles).toBe(0);
        expect(summary.utilisationPct).toBeNull();
    });

    test('utilisation is null when the period has no days', () => {
        const vehicle = _deriveVehicle({
            vehicle_id: 'VH-001',
            trip_count: '1',
            distance_km: '10',
            duration_seconds: '600',
            moving_seconds: '600',
            max_speed_kmh: '60',
            days_active: '1',
        }, 0);
        expect(vehicle.utilisationPct).toBeNull();
    });

    test('inactiveVehicles never goes negative', () => {
        const derived = DEFAULT_TRIP_AGGREGATES.map((r) => _deriveVehicle(r, 7));
        const summary = _summarise(derived, 1, 7);
        expect(summary.inactiveVehicles).toBe(0);
    });
});
