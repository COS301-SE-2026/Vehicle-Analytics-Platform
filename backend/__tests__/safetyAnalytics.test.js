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