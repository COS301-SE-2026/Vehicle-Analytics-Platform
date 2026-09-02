
jest.unmock('pg');



const request = require('supertest');

const app = require('../src/app');

const generateToken = require('../tests/generateToken');

const { Pool } = require('pg');



process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';





const tokens = {

    admin: generateToken(1, 'admin@test.com', 'admin'),

    manager: generateToken(2, 'manager@test.com', 'fleet_manager'),

    viewer: generateToken(3, 'viewer@test.com', 'viewer')


};





function authedRequest(method, path, token = tokens.manager) {

    return request(app)[method](path).set('Authorization', `Bearer ${token}`);

}





async function testUnauthorized(method, path) {

    const res = await request(app)[method](path);

    expect(res.status).toBe(401);

    expect(res.body.success).toBe(false);

}





async function testForbidden(method, path, token = tokens.viewer) {

    const res = await authedRequest(method, path, token);

    expect(res.status).toBe(403);


    expect(res.body.success).toBe(false);
}








function validateFuelHistoryResponse(data) {

    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {

        expect(data[0]).toHaveProperty('period_start');

        expect(data[0]).toHaveProperty('total_distance');

        expect(data[0]).toHaveProperty('total_fuel');

        expect(data[0]).toHaveProperty('avg_efficiency');

    }

}







function validateFleetHistoryResponse(data) {

    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {

        expect(data[0]).toHaveProperty('period_start');

        expect(data[0]).toHaveProperty('total_distance');

        expect(data[0]).toHaveProperty('total_fuel');

        expect(data[0]).toHaveProperty('vehicles_tracked');

    }

}








function validateTrendResponse(data) {

    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {

        expect(data[0]).toHaveProperty('period_start');

        expect(data[0]).toHaveProperty('avg_efficiency');

        expect(data[0]).toHaveProperty('total_distance');

    }

}









async function testPeriods(endpoint, token = tokens.manager) {

    const periods = ['day', 'week', 'month'];

    for (const period of periods) {

        const res = await authedRequest('get', `${endpoint}?period=${period}&limit=5`, token)

        .expect(200);

        expect(res.body.success).toBe(true);

        expect(Array.isArray(res.body.data)).toBe(true);

    }

}







async function testDayRanges(endpoint, token = tokens.manager) {

    const days = [7, 30, 90];

    for (const d of days) {


        const res = await authedRequest('get', `${endpoint}?days=${d}`, token)


        .expect(200);

        expect(res.body.success).toBe(true);

        expect(Array.isArray(res.body.data)).toBe(true);


    }


}







jest.mock('../src/services/fuelHistoryService', () => {
    return jest.fn().mockImplementation(() => ({

        getVehicleFuelHistory: jest.fn().mockResolvedValue([

            {

                period_start: '2026-08-31',

                period_end: '2026-09-01',
                total_distance: 355.5,

                total_fuel: 41.83,

                avg_efficiency: 8.5,

                trip_count: 7,

                efficiency_change: 0.5

            }

        ]),

        getFleetFuelHistory: jest.fn().mockResolvedValue([

            {

                period_start: '2026-08-31',
                total_distance: 355.5,

                total_fuel: 41.83,

                avg_efficiency: 8.5,

                vehicles_tracked: 1

            }

        ]),

        getVehicleFuelTrend: jest.fn().mockResolvedValue([

            {

                period_start: '2026-08-31',

                avg_efficiency: 8.5,

                total_distance: 355.5,
                total_fuel: 41.83,

                trip_count: 7

            }

        ]),

        calculateAndStoreDailyHistory: jest.fn().mockResolvedValue(true)
    }));
});


const FuelHistoryService = require('../src/services/fuelHistoryService');







describe('Fuel History Controller - Integration Tests', () => {

    let service;


    
    beforeEach(() => {
    
        service = new FuelHistoryService();
    
        jest.clearAllMocks();
    });


    
    describe('GET /api/fuel/vehicle/:vehicleId/history', () => {
        const endpoint = '/api/fuel/vehicle/1000/history';

        test('should return 401 if no token provided', async () => {
            await testUnauthorized('get', endpoint);
        });

        test('should return fuel history for authenticated user', async () => {
            const res = await authedRequest('get', `${endpoint}?period=week&limit=10`)
                .expect(200);
            expect(res.body.success).toBe(true);
            validateFuelHistoryResponse(res.body.data);
        });

        test('should handle different period types', async () => {
            await testPeriods(endpoint);
        });

        test('should handle viewer role access', async () => {
            const res = await authedRequest('get', endpoint, tokens.viewer)
                .expect(200);
            expect(res.body.success).toBe(true);
        });
    });


    
    describe('GET /api/fuel/fleet/history', () => {
        const endpoint = '/api/fuel/fleet/history';

        test('should return 401 if no token provided', async () => {
            await testUnauthorized('get', endpoint);
        });

        test('should return fleet fuel history for manager', async () => {
            const res = await authedRequest('get', `${endpoint}?period=week&limit=10`)
                .expect(200);
            expect(res.body.success).toBe(true);
            validateFleetHistoryResponse(res.body.data);
        });

        test('should handle different periods for fleet', async () => {
            await testPeriods(endpoint);
        });

        test('should block viewer from fleet history', async () => {
            await testForbidden('get', endpoint, tokens.viewer);
        });
    });


    
    describe('GET /api/fuel/vehicle/:vehicleId/trend', () => {
        const endpoint = '/api/fuel/vehicle/1000/trend';

        test('should return 401 if no token provided', async () => {
            await testUnauthorized('get', endpoint);
        });

        test('should return vehicle fuel trend for authenticated user', async () => {
            const res = await authedRequest('get', `${endpoint}?days=30`)
                .expect(200);
            expect(res.body.success).toBe(true);
            validateTrendResponse(res.body.data);
        });

        test('should handle different day ranges', async () => {
            await testDayRanges(endpoint);
        });
    });

 
    
    describe('POST /api/fuel/vehicle/:vehicleId/calculate', () => {
        const endpoint = '/api/fuel/vehicle/1000/calculate';

        test('should return 401 if no token provided', async () => {
            await testUnauthorized('post', endpoint);
        });

        test('should return 403 if non-admin tries to calculate', async () => {
            await testForbidden('post', endpoint, tokens.manager);
        });

        test('should calculate daily history for admin', async () => {
            const res = await authedRequest('post', `${endpoint}?date=2026-08-31`, tokens.admin)
                .expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Daily fuel history calculated');
        });

        test('should handle missing date parameter with admin', async () => {
            const res = await authedRequest('post', endpoint, tokens.admin)
                .expect(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Daily fuel history calculated');
        });
    });
});
