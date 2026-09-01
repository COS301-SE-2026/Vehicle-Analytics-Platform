
jest.unmock('pg');




const request = require('supertest');

const app = require('../src/app');

const generateToken = require('../tests/generateToken');

const { Pool } = require('pg');



process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';




const adminToken = generateToken(1, 'admin@test.com', 'admin');

const managerToken = generateToken(2, 'manager@test.com', 'fleet_manager');

const viewerToken = generateToken(3, 'viewer@test.com', 'viewer');



function authedRequest(method, path, token = managerToken) {

    return request(app)[method](path).set('Authorization', `Bearer ${token}`);

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
    
        test('should return 401 if no token provided', async () => {
    
            const res = await request(app)
    
            .get('/api/fuel/vehicle/1000/history');
    
            expect(res.status).toBe(401);
    
            expect(res.body.success).toBe(false);
    
        });


        
        test('should return fuel history for authenticated user', async () => {
        
            const res = await authedRequest('get', '/api/fuel/vehicle/1000/history?period=week&limit=10')
        
            .expect(200);
        
            
            
            expect(res.body.success).toBe(true);
            
            expect(Array.isArray(res.body.data)).toBe(true);
            
            if (res.body.data.length > 0) {
            
                expect(res.body.data[0]).toHaveProperty('period_start');
            
                expect(res.body.data[0]).toHaveProperty('total_distance');
            
                expect(res.body.data[0]).toHaveProperty('total_fuel');
            
                expect(res.body.data[0]).toHaveProperty('avg_efficiency');
            
            }
        });





        
        test('should handle different period types', async () => {
        
            const periods = ['day', 'week', 'month'];
        
            for (const period of periods) {
        
                const res = await authedRequest('get', `/api/fuel/vehicle/1000/history?period=${period}&limit=5`)
        
                .expect(200);
        
                expect(res.body.success).toBe(true);
        
                expect(Array.isArray(res.body.data)).toBe(true);
        
            }
        });





        
        test('should handle viewer role access', async () => {
        
            const res = await authedRequest('get', '/api/fuel/vehicle/1000/history', viewerToken)
        
            .expect(200);
        
            expect(res.body.success).toBe(true);
        });
    });





    
    describe('GET /api/fuel/fleet/history', () => {
    
        test('should return 401 if no token provided', async () => {
    
            const res = await request(app)
    
            .get('/api/fuel/fleet/history');
    
            expect(res.status).toBe(401);
    
            expect(res.body.success).toBe(false);
    
        });


        
        test('should return fleet fuel history for manager', async () => {
        
            const res = await authedRequest('get', '/api/fuel/fleet/history?period=week&limit=10')
        
            .expect(200);
        
            
            
            expect(res.body.success).toBe(true);
            
            expect(Array.isArray(res.body.data)).toBe(true);
            
            if (res.body.data.length > 0) {
            
                expect(res.body.data[0]).toHaveProperty('period_start');
            
                expect(res.body.data[0]).toHaveProperty('total_distance');
            
                expect(res.body.data[0]).toHaveProperty('total_fuel');
            
                expect(res.body.data[0]).toHaveProperty('vehicles_tracked');
            }
        });

        test('should handle different periods for fleet', async () => {
  
            const periods = ['day', 'week', 'month'];
  
            for (const period of periods) {
  
                const res = await authedRequest('get', `/api/fuel/fleet/history?period=${period}&limit=5`)
  
                .expect(200);
  
                expect(res.body.success).toBe(true);
  
                expect(Array.isArray(res.body.data)).toBe(true);
  
            }
  
        });


        
        test('should block viewer from fleet history', async () => {
        
            const res = await authedRequest('get', '/api/fuel/fleet/history', viewerToken)
        
            .expect(403);
        
            expect(res.body.success).toBe(false);
        
        });
    });



    
    describe('GET /api/fuel/vehicle/:vehicleId/trend', () => {
    
        test('should return 401 if no token provided', async () => {
    
            const res = await request(app)
    
            .get('/api/fuel/vehicle/1000/trend');
    
            expect(res.status).toBe(401);
    
            expect(res.body.success).toBe(false);
    
        });


        
        test('should return vehicle fuel trend for authenticated user', async () => {
        
            const res = await authedRequest('get', '/api/fuel/vehicle/1000/trend?days=30')
        
            .expect(200);
        
            
            
            expect(res.body.success).toBe(true);
            
            expect(Array.isArray(res.body.data)).toBe(true);
            
            if (res.body.data.length > 0) {
            
                expect(res.body.data[0]).toHaveProperty('period_start');
            
                expect(res.body.data[0]).toHaveProperty('avg_efficiency');
                expect(res.body.data[0]).toHaveProperty('total_distance');
            }
        });




        
        test('should handle different day ranges', async () => {
        
            const days = [7, 30, 90];
        
            for (const d of days) {
        
                const res = await authedRequest('get', `/api/fuel/vehicle/1000/trend?days=${d}`)
        
                .expect(200);
        
                expect(res.body.success).toBe(true);
        
                expect(Array.isArray(res.body.data)).toBe(true);
        
            }
        });
    });





    
    describe('POST /api/fuel/vehicle/:vehicleId/calculate', () => {
    
        test('should return 401 if no token provided', async () => {
    
            const res = await request(app)
    
            .post('/api/fuel/vehicle/1000/calculate');
    
            expect(res.status).toBe(401);
    
            expect(res.body.success).toBe(false);
    
        });


        
        test('should return 403 if non-admin tries to calculate', async () => {
        
            const res = await authedRequest('post', '/api/fuel/vehicle/1000/calculate?date=2026-08-31')
        
            .expect(403);
        
            expect(res.body.success).toBe(false);
        
        });


        
        test('should calculate daily history for admin', async () => {
        
            const res = await authedRequest('post', '/api/fuel/vehicle/1000/calculate?date=2026-08-31', adminToken)
        
            .expect(200);
        
            
            
            expect(res.body.success).toBe(true);
            
            expect(res.body.message).toBe('Daily fuel history calculated');
        });

        
        
        
        test('should handle missing date parameter with admin', async () => {
        
        
            const res = await authedRequest('post', '/api/fuel/vehicle/1000/calculate', adminToken)
        
            .expect(200);
        
            
            
            expect(res.body.success).toBe(true);
            
            expect(res.body.message).toBe('Daily fuel history calculated');
        });
        
    });
});
