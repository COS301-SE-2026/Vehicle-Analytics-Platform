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
} = require('../src/services/analytics/distanceAnalytics');

const { resolvePeriod } = require('../src/services/periods');

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

