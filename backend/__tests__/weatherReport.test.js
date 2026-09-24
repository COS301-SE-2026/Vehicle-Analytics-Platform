jest.mock('../src/middleware/auth');

jest.mock('@aws-sdk/client-cognito-identity-provider');

const { mockPool, setupMockData } = require('./setup/mockDb');

jest.mock('../src/db/pool', () => ({ pool: mockPool }));

jest.mock('../src/services/scopeResolver', () => ({
    ...jest.requireActual('../src/services/scopeResolver'),
    resolveScope: jest.fn(),
}));

jest.mock('../src/services/period', () => ({
    ...jest.requireActual('../src/services/period'),
    getDataClock: jest.fn(),
}));

jest.mock('../src/services/weatherAreaAnalytics', () => ({
    ...jest.requireActual('../src/services/weatherAreaAnalytics'),
    getWeatherAreaReport: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const { resolveScope, ScopeError } = require('../src/services/scopeResolver');
const { getDataClock } = require('../src/services/period');
const { getWeatherAreaReport } = require('../src/services/weatherAreaAnalytics');

const SCOPE = {
    scopeType: 'fleet',
    scopeId: null,
    label: 'Assigned fleet',
    vehicleCount: 2,
    vehicleIds: ['1036', '1110'],
    role: 'fleet_manager',
};

const REPORT = {
    period: { fromDate: '2026-09-17', toDate: '2026-09-23', days: 7 },
    warnings: [],
    fleet: [],
    vehicles: [],
};

const post = (body) => request(app)
    .post('/api/reports/weather')
    .set('Authorization', 'Bearer test-token')
    .send(body);

describe('Weather Report Controller', () => {
    beforeEach(() => {
        setupMockData();
        resolveScope.mockReset().mockResolvedValue(SCOPE);
        // 20:00 UTC on the 23rd is 22:00 on the 23rd in South Africa.
        getDataClock.mockReset().mockResolvedValue(new Date('2026-09-23T20:00:00Z'));
        getWeatherAreaReport.mockReset().mockResolvedValue(REPORT);
    });

    describe('POST /api/reports/weather', () => {
        test('should generate a report with the defaults', async () => {
            const response = await post({});

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(resolveScope.mock.calls[0][0]).toBe(mockPool);
            expect(resolveScope.mock.calls[0][2]).toEqual({ scopeType: 'fleet', scopeId: null });
            expect(getWeatherAreaReport).toHaveBeenCalledWith(
                mockPool,
                ['1036', '1110'],
                { endDate: '2026-09-23', days: 7 },
            );
        });

        test('should return the scope and the report sections', async () => {
            const response = await post({});
            const { data } = response.body;

            expect(data.report.scope).toEqual({
                type: 'fleet', id: null, label: 'Assigned fleet', vehicleCount: 2,
            });
            expect(data.report.requestedBy).toEqual({ role: 'fleet_manager' });
            expect(data.report).toHaveProperty('generatedAt');
            expect(data.period).toEqual(REPORT.period);
            expect(data.warnings).toEqual([]);
        });

        test('should end on the day of the newest telemetry, in local time', async () => {
            getDataClock.mockResolvedValue(new Date('2026-09-23T23:30:00Z'));

            await post({});

            expect(getWeatherAreaReport.mock.calls[0][2].endDate).toBe('2026-09-24');
        });

        test('should accept snake_case parameters', async () => {
            await post({ scope_type: 'group', scope_id: '4', days: 3, end_date: '2026-09-01' });

            expect(resolveScope.mock.calls[0][2]).toEqual({ scopeType: 'group', scopeId: '4' });
            expect(getWeatherAreaReport.mock.calls[0][2]).toEqual({ endDate: '2026-09-01', days: 3 });
            expect(getDataClock).not.toHaveBeenCalled();
        });

        test('should accept camelCase parameters', async () => {
            await post({ scopeType: 'vehicle', scopeId: '1036', days: 1, endDate: '2026-09-10' });

            expect(resolveScope.mock.calls[0][2]).toEqual({ scopeType: 'vehicle', scopeId: '1036' });
            expect(getWeatherAreaReport.mock.calls[0][2]).toEqual({ endDate: '2026-09-10', days: 1 });
        });

        test.each([0, 8, -1, 2.5, 'abc'])('should return 400 when days is %p', async (days) => {
            const response = await post({ days });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(getWeatherAreaReport).not.toHaveBeenCalled();
        });

        test.each(['23/09/2026', '2026-9-23', 'yesterday'])(
            'should return 400 when end_date is %p',
            async (endDate) => {
                const response = await post({ end_date: endDate });

                expect(response.status).toBe(400);
                expect(response.body.success).toBe(false);
                expect(JSON.stringify(response.body)).toContain('YYYY-MM-DD');
                expect(getWeatherAreaReport).not.toHaveBeenCalled();
            },
        );

        test('should pass on scope errors with their status', async () => {
            resolveScope.mockRejectedValueOnce(new ScopeError('Group not found', 404));

            const response = await post({ scope_type: 'group', scope_id: '999' });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(JSON.stringify(response.body)).toContain('Group not found');
            expect(getWeatherAreaReport).not.toHaveBeenCalled();
        });

        test('should handle a failure while building the report', async () => {
            getWeatherAreaReport.mockRejectedValueOnce(new Error('Database error'));
            jest.spyOn(console, 'error').mockImplementation(() => {});

            const response = await post({});

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(JSON.stringify(response.body)).toContain('Failed to generate weather report');
            console.error.mockRestore();
        });
    });
});