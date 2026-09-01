'use strict'

const {
    setupReportingMockData,
    DEFAULT_SAFETY_AGGREGATES,
} = require('./setup/mockReportingDb');

const{
    getSafetyAnalytics, 
    REPORT_TIMEZONE,
    _emptySummary,

} = require('../src/services/safetyAnalytics');


const {resolvePeriod} = require('../src/services/period');


const PERIOD = resolvePeriod({
    periodType: 'weekly',
    anchor: new Date('2026-08-26T12:00:00+02:00'),
});

function makeDb(fixture = {}) {
    const { pool, calls } = setupReportingMockData(fixture);
    return { pool, calls };
}

const perVehicleQuery = (calls) => calls.find(
    (c) => c.sql.includes('FROM vehicle_events') && !c.sql.includes('vehicles_with_events'),
);

describe('safetyAnalytics - argument validation', () => {
    test('requires a usable database client', async () => {
        await expect(getSafetyAnalytics(null, ['VH-001'], PERIOD))
            .rejects.toThrow(/pg client or pool/);
    });

    test('requires a vehicleIds array, so an unscoped call is impossible', async () => {
        const { pool } = makeDb();
        await expect(getSafetyAnalytics(pool, undefined, PERIOD))
            .rejects.toThrow(/vehicleIds array from scopeResolver/);
        await expect(getSafetyAnalytics(pool, 'VH-001', PERIOD))
            .rejects.toThrow(/vehicleIds array from scopeResolver/);
    });

    test('requires a resolved period with Date bounds', async () => {
        const { pool } = makeDb();
        await expect(getSafetyAnalytics(pool, ['VH-001'], null)).rejects.toThrow(/resolved period/);
    });

    test('performs no authorization of its own', async () => {
        const { pool, calls } = makeDb();
        await getSafetyAnalytics(pool, ['VH-001'], PERIOD);
        expect(calls.some((c) => c.sql.includes('fleet_manager_assignments'))).toBe(false);
    });

});



describe('safetyAnalytics - event predicate', () => {
    let sql;
    beforeEach(async () => {
        const { pool, calls } = makeDb();
        await getSafetyAnalytics(pool, ['VH-001'], PERIOD);
        sql = perVehicleQuery(calls).sql;
    });


    test('counts harsh braking, acceleration and cornering by positive detail', () => {
        expect(sql).toMatch(/event_detail IN \('harsh_braking', 'harsh_acceleration', 'harsh_cornering'\)/);
        expect(sql).toMatch(/FILTER \(WHERE event_detail = 'harsh_braking'\)/);
        expect(sql).toMatch(/FILTER \(WHERE event_detail = 'harsh_acceleration'\)/);
        expect(sql).toMatch(/FILTER \(WHERE event_detail = 'harsh_cornering'\)/);
    });


    test('counts calibrated crashes only', () => {
        expect(sql).toMatch(/event_detail LIKE 'real crash detected%'/);
        expect(sql).toMatch(/event_detail NOT LIKE '%not calibrated%'/);
    });



    test('excludes null-detail crash and green_driving rows', () => {
        expect(sql).toMatch(/e\.event_category = 'crash_detection'\s+AND e\.event_detail LIKE/);
        expect(sql).toMatch(/e\.event_category = 'green_driving_type'\s+AND e\.event_detail IN/);
        expect(sql).not.toMatch(/event_category IN \([^)]*'crash_detection'/);
        expect(sql).not.toMatch(/event_category IN \([^)]*'green_driving_type'/);
    });



    test('counts overspeed and idling', () => {
        expect(sql).toMatch(/event_category IN \('over_speeding', 'idling'\)/);
        expect(sql).toMatch(/FILTER \(WHERE event_category = 'over_speeding'\)/);
        expect(sql).toMatch(/FILTER \(WHERE event_category = 'idling'\)/);
    });


    test('reads vehicle_events, never the simulated score table', () => {
        expect(sql).toMatch(/FROM vehicle_events/);
        expect(sql).not.toMatch(/driver_daily_safety_scores/);
        expect(sql).not.toMatch(/vehicle_daily_events/);
        expect(sql).not.toMatch(/vehicle_penalties/);
    });

});

describe('safetyAnalytics - burst de-duplication', () => {
    let sql;
    beforeEach(async () => {
        const { pool, calls } = makeDb();
        await getSafetyAnalytics(pool, ['VH-001'], PERIOD);
        sql = perVehicleQuery(calls).sql;
    });


    test('reuses the existing incident_burst_window()', () => {
        expect(sql).toMatch(/incident_burst_window\(\)/);
        expect(sql).not.toMatch(/INTERVAL '60 seconds'/);
    });


    test('partitions by vehicle so bursts do not collapse across vehicles', () => {
        expect(sql).toMatch(/PARTITION BY e\.vehicle_id, e\.event_category, e\.event_detail/);
    });


    test('counts only events that start an incident', () => {
        expect(sql).toMatch(/WHERE starts_incident = 1/);
    });


});



describe('safetyAnalytics - period and scope filtering', () => {
    test('filters by authorised vehicle ids only', async () => {
        const { pool, calls } = makeDb();
        await getSafetyAnalytics(pool, ['VH-002'], PERIOD);
        expect(perVehicleQuery(calls).params[0]).toEqual(['VH-002']);
    });

    test('a vehicle outside the scope contributes nothing', async () => {
        const { pool } = makeDb();
        const result = await getSafetyAnalytics(pool, ['VH-002'], PERIOD);
        expect(result.vehicles.map((v) => v.vehicleId)).toEqual(['VH-002']);
    });


    test('uses a half-open instant range on vehicle_events.time', async () => {
        const { pool, calls } = makeDb();
        await getSafetyAnalytics(pool, ['VH-001'], PERIOD);
        const q = perVehicleQuery(calls);

        expect(q.sql).toMatch(/e\.time >= \$2/);
        expect(q.sql).toMatch(/e\.time < \$3/);
        expect(q.sql).not.toMatch(/e\.time <= \$3/);
        expect(q.params[1].getTime()).toBe(PERIOD.from.getTime());
        expect(q.params[2].getTime()).toBe(PERIOD.to.getTime());
    });


    test('resolve 17-23 August 2026', () => {
        expect(PERIOD.fromDate).toBe('2026-08-17');
        expect(PERIOD.toDate).toBe('2026-08-23');
    });

    test('buckets days in SAST (not the session time zone)', async () => {
        const { pool, calls } = makeDb();
        await getSafetyAnalytics(pool, ['VH-001'], PERIOD);

        expect(perVehicleQuery(calls).sql).toMatch(/e\.time AT TIME ZONE \$4/);
        expect(perVehicleQuery(calls).params[3]).toBe(REPORT_TIMEZONE);
        expect(REPORT_TIMEZONE).toBe('Africa/Johannesburg');
    });

    test('is fully parameterized', async () => {
        const { pool, calls } = makeDb();
        await getSafetyAnalytics(pool, ['VH-001'], PERIOD);
        expect(perVehicleQuery(calls).sql).not.toMatch(/INTERVAL '\$\{/);
    });
});



describe('safetyAnalytics - per-vehicle results', () => {
    let result;

    beforeEach(async () => {
        const { pool } = makeDb();
        result = await getSafetyAnalytics(pool, ['VH-001', 'VH-002'], PERIOD);
    });

    test('coerces pg bigint strings into numbers', () => {
        expect(typeof result.vehicles[0].harshBrakes).toBe('number');
        expect(result.vehicles[0].harshBrakes).toBe(4);
        expect(result.vehicles[0].totalEvents).toBe(24);
    });

    test('exposes every event category the report needs', () => {
        expect(result.vehicles[0]).toEqual(expect.objectContaining({
            vehicleId: 'VH-001',
            harshBrakes: 4,
            harshAccelerations: 2,
            harshCornering: 3,
            crashes: 0,
            overspeedEvents: 6,
            idlingEvents: 9,
        }));
    });

    test('carries the score and classification from the database', () => {
        expect(result.vehicles[0].safetyScore).toBe(85);
        expect(result.vehicles[0].classification).toBe('Good');
        expect(result.vehicles[1].safetyScore).toBe(32);
        expect(result.vehicles[1].classification).toBe('Poor');
    });

    test('exposes the worst single day, not just the average', () => {
        expect(result.vehicles[1].worstDailyScore).toBe(0);
    });

});