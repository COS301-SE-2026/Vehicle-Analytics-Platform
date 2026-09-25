const request = require('supertest');
const app = require('../src/app');
const {mockQuery} = require('pg');
const generateToken = require('../tests/generateToken');

process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';

describe('POST /api/custom-alerts/backtest', () => {
   let managerToken;
   
   const ASSIGNED = {rows: [{ '?column?': 1} ]};
   const NOT_ASSIGNED = {rows: []};
   const DATA_NOW = {rows: [{ now: '2026-09-24T12:00:00.000Z'}]};

   beforeAll(() => {
    managerToken = generateToken(2, 'manager@test.com', 'fleet_manager');
   });

   beforeEach(() => {
    mockQuery.mockReset();
   });

   const backtest = (body, token = managerToken) => 
    request(app)
        .post('/api/custom-alerts/backtest')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    const validBody = {
        condition_type: 'speed_threshold',
        condition_params: {max_speed_kmh: 90},
        fleet_group_id: 3,
        days: 7,
    };

    describe('validation', () => {
        it('rejects an unknown condition_type', async () => {
            const res = await backtest({ ...validBody, condition_type: 'bogus'});
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('condition_type');
        });

        it('rejects missing condition_params', async () => {
            const res = await backtest({ ...validBody, condition_params: undefined});
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('condition_params');
        });

        it('rejects missing fleet_group_id', async () => {
            const res = await backtest({ ...validBody, fleet_group_id: undefined});
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('fleet_group_id');
        });

        it('rejects a days value outside the allowed set', async () => {
            const res = await backtest({ ...validBody, days: 45});
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('days');
        });

        it('reports every validation problem at once', async () => {
            const res = await backtest({condition_type: 'bogus', days: 45});
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('condition_type');
            expect(res.body.error).toContain('condition_params');
            expect(res.body.error).toContain('fleet_group_id');
            expect(res.body.error).toContain('days');
        });

        it('requires authentication', async () => {
            const res = await request(app)
                .post('/api/custom-alerts/backtest')
                .send(validBody);
            expect(res.status).toBe(401);
        });
    });


    describe('fleet group access', () => {
        it('rejects a group the manager is not assigned to', async() => {
            mockQuery.mockResolvedValueOnce(NOT_ASSIGNED);
            const res = await backtest(validBody);
            expect(res.status).toBe(403);
        });

        it('checks the assignment against the calling manager', async() => {
            mockQuery.mockResolvedValueOnce(NOT_ASSIGNED);
            await backtest(validBody);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('fleet_manager_assignments'),
                [2,3]
            );
        });
    });

    describe('speed_threshold', () => {
        it('returns the agreed response shape', async() => {
            mockQuery
                .mockResolvedValueOnce(ASSIGNED)
                .mockResolvedValueOnce(DATA_NOW)
                .mockResolvedValueOnce({
                    rows: [
                        {vehicle_id: '1012', time: '2026-09-24T08:00:00.000Z', breach_value: 142, latitude: -25.7, longitude: 28.2},
                        {vehicle_id: '1012', time: '2026-09-24T09:00:00.000Z', breach_value: 118, latitude: -25.8, longitude: 28.3},
                    ],
                });

        
        const res = await backtest(validBody);

        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({
            total_alerts: 2,
            vehicles_affected: 1,
            days: 7,
        });

        expect(Array.isArray(res.body.data.by_day)).toBe(true);
        expect(Array.isArray(res.body.data.samples)).toBe(true);
        });


        it('sorts samples worst first', async () => {
            mockQuery
                .mockResolvedValueOnce(ASSIGNED)
                .mockResolvedValueOnce(DATA_NOW)
                .mockResolvedValueOnce({
                    rows: [
                        {vehicle_id: '1003', time: '2026-09-24T08:00:00.000Z', breach_value: 95, latitude: null, longitude: null},
                        {vehicle_id: '1012', time: '2026-09-24T09:00:00.000Z', breach_value: 142, latitude: null, longitude: null},
                    ],
                });

            const res = await backtest(validBody);
            expect(res.body.data.samples[0].breach_value).toBe(142);
        });


        it('returns numbers and not strings for the sample values', async () => {
            mockQuery
                .mockResolvedValueOnce(ASSIGNED)
                .mockResolvedValueOnce(DATA_NOW)
                .mockResolvedValueOnce({
                    rows: [{ vehicle_id: '1012', time: '2026-09-24T08:00:00.000Z', breach_value: '142', latitude: '-25.7', longitude: '28.2'}],
                });
            
            const res = await backtest(validBody);
            const sample = res.body.data.samples[0];

            expect(typeof sample.breach_value).toBe('number');
            expect(typeof sample.threshold_value).toBe('number');
            expect(typeof sample.latitude).toBe('number');
        });
    });


    describe('debounce', () => {
        it('collapses breaches inside the 5 minute window into one alert', async () => {
            mockQuery
                .mockResolvedValueOnce(ASSIGNED)
                .mockResolvedValueOnce(DATA_NOW)
                .mockResolvedValueOnce({
                    rows: [
                        {vehicle_id: '1012', time: '2026-09-24T08:00:00.000Z', breach_value: 95, latitude: null, longitude: null},
                        {vehicle_id: '1012', time: '2026-09-24T08:01:00.000Z', breach_value: 98, latitude: null, longitude: null},
                        {vehicle_id: '1012', time: '2026-09-24T08:03:00.000Z', breach_value: 99, latitude: null, longitude: null},
                    ],
                });

        const res = await backtest(validBody);

        expect(res.body.data.total_alerts).toBe(1);
        });


        it('debounces each vehicle seperately', async() => {
            mockQuery
                .mockResolvedValueOnce(ASSIGNED)
                .mockResolvedValueOnce(DATA_NOW)
                .mockResolvedValueOnce({
                    rows: [
                        {vehicle_id: '1012', time: '2026-09-24T08:00:00.000Z', breach_value: 95, latitude: null, longitude: null},
                        {vehicle_id: '1003', time: '2026-09-24T08:01:00.000Z', breach_value: 98, latitude: null, longitude: null},
                    ],
                });

            const res = await backtest(validBody);
            expect(res.body.data.total_alerts).toBe(2);
            expect(res.body.data.vehicles_affected).toBe(2);
        });
    });


    describe('by_day', () => {
        it('returns one entry per day including days with no alerts', async () => {
            mockQuery
                .mockResolvedValueOnce(ASSIGNED)
                .mockResolvedValueOnce(DATA_NOW)
                .mockResolvedValueOnce({ rows: [] });

            const res = await backtest({ ...validBody, days: 7});
            expect(res.body.data.by_day).toHaveLength(7);
            expect(res.body.data.by_day.every((d) => d.count === 0)).toBe(true);
        });


        it('counts alerts against the right day', async () => {
            mockQuery
                .mockResolvedValueOnce(ASSIGNED)
                .mockResolvedValueOnce(DATA_NOW)
                .mockResolvedValueOnce({
                    rows: [{ vehicle_id: '1012', time: '2026-09-24T08:00:00.000Z', breach_value: 95, latitude: null, longitude: null}],
                });

            const res = await backtest({ ...validBody, days: 7});
            const day = res.body.data.by_day.find((d) => d.date === '2026-09-24');
            expect(day.count).toBe(1);
        });
    });


    describe('other rule types', () => {
        const cases = [
            ['safety_score_drop', {min_score: 60}],
            ['trip_duration_exceeded', {max_trip_minutes: 240}],
            ['repeated_unsafe_events', {event_types: ['harsh_braking'], count: 3, window_minutes: 60}],
            ['time_based_restriction', {start_time: '22:00', end_time: '06:00'}],

        ];

        it.each(cases)('handles %s', async (condition_type, condition_params) => {
            mockQuery
                .mockResolvedValueOnce(ASSIGNED)
                .mockResolvedValueOnce(DATA_NOW)
                .mockResolvedValueOnce({ rows: [] });

            const res = await backtest({ ...validBody, condition_type, condition_params});
            expect(res.status).toBe(200);
            expect(res.body.data.total_alerts).toBe(0);
        });


        it('returns null coordinates for rules without a position', async () => {
            mockQuery
                .mockResolvedValueOnce(ASSIGNED)
                .mockResolvedValueOnce(DATA_NOW)
                .mockResolvedValueOnce({ 
                    rows: [{ vehicle_id: '1091', time: '2026-09-24T23:59:00.000Z', breach_value: 12, latitude: null, longitude: null}], 
                });

            const res = await backtest({
                ...validBody, 
                condition_type: 'safety_score_drop', 
                condition_params: {min_score: 60},
            });

            expect(res.body.data.samples[0].latitude).toBeNull();
        });


        it('sorts safety score samples lowest first, since low is worse', async () => {
            mockQuery
                .mockResolvedValueOnce(ASSIGNED)
                .mockResolvedValueOnce(DATA_NOW)
                .mockResolvedValueOnce({ 
                    rows: [
                        { vehicle_id: '1003', time: '2026-09-22T23:59:00.000Z', breach_value: 55, latitude: null, longitude: null}, 
                        { vehicle_id: '1091', time: '2026-09-23T23:59:00.000Z', breach_value: 12, latitude: null, longitude: null}
                    ], 
                });

            const res = await backtest({
                ...validBody, 
                condition_type: 'safety_score_drop', 
                condition_params: {min_score: 60},
            });

            expect(res.body.data.samples[0].breach_value).toBe(12);
        });
    });


    describe('errors', () => {
        it('returns 500 when the query fails', async () => {
            mockQuery
                .mockResolvedValueOnce(ASSIGNED)
                .mockResolvedValueOnce(DATA_NOW)
                .mockRejectedValueOnce(new Error('relation does not exist'));

            const res = await backtest(validBody);
            expect(res.status).toBe(500);
            expect(res.body.error).toContain('relation does not exist');
        });
    });


});