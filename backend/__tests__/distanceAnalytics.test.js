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

