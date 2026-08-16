
jest.unmock('pg');



const request = require('supertest');

const app = require('../src/app');

const generateToken = require('../tests/generateToken');



process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';



const managerToken = generateToken(1, 'manager@test.com', 'fleet_manager');



function authedRequest(method, path) {

    return request(app)[method](path).set('Authorization', `Bearer ${managerToken}`);

}



describe('Fuel Controller - Integration Tests', () => {

    describe('GET /api/fuel/dashboard', () => {

        test('should return fuel dashboard data', async () => {


            
            const response = await authedRequest('get', '/api/fuel/dashboard')
            
            .expect(200);


            
            expect(response.body.success).toBe(true);
            
            expect(response.body.data).toHaveProperty('avg_fleet_efficiency_km_l');
            
            expect(response.body.data).toHaveProperty('total_fuel_consumed_liters');
            
            expect(response.body.data).toHaveProperty('total_distance_km');
            
            expect(response.body.data).toHaveProperty('vehicles_tracked');
            
            expect(response.body.data).toHaveProperty('last_updated');
        });
    });




    
    describe('GET /api/fuel/vehicle/:vehicleId', () => {
    
        test('should return fuel stats for existing vehicle', async () => {
    
            const response = await authedRequest('get', '/api/fuel/vehicle/1000')
    
            .expect(200);


            
            expect(response.body.success).toBe(true);
            
            expect(response.body.data.vehicle_id).toBe('1000');
            
            expect(response.body.data).toHaveProperty('summary');
            
            expect(response.body.data).toHaveProperty('trips');
            
            expect(response.body.data.summary).toHaveProperty('total_distance');
            
            expect(response.body.data.summary).toHaveProperty('total_fuel');
            
            expect(response.body.data.summary).toHaveProperty('avg_efficiency');
            
            expect(response.body.data.summary).toHaveProperty('trip_count');
        });



        
        
        test('should handle vehicle with no fuel data', async () => {
        
            const response = await authedRequest('get', '/api/fuel/vehicle/99999')
        
            .expect(200);


            
            expect(response.body.success).toBe(true);
            
            expect(response.body.data.summary.trip_count).toBe(0);
            
            expect(response.body.data.trips).toHaveLength(0);
        });

    });





    
    describe('GET /api/fuel/fleet', () => {
    
        test('should return fleet fuel summary for week period', async () => {
    
            const response = await authedRequest('get', '/api/fuel/fleet?period=week')
    
            .expect(200);


            
            expect(response.body.success).toBe(true);
            
            expect(response.body.data).toHaveProperty('period', 'week');
            
            expect(response.body.data).toHaveProperty('fleet_total');
            
            expect(response.body.data).toHaveProperty('vehicles');
            
            expect(response.body.data.fleet_total).toHaveProperty('vehicles_tracked');
            
            expect(response.body.data.fleet_total).toHaveProperty('total_fuel');
            
            expect(response.body.data.fleet_total).toHaveProperty('total_distance');
        });




        
        test('should return fleet fuel summary for day period', async () => {
        
            const response = await authedRequest('get', '/api/fuel/fleet?period=day')
        
            .expect(200);


            
            expect(response.body.success).toBe(true);
            
            expect(response.body.data).toHaveProperty('period', 'day');
        });





        
        
        test('should return fleet fuel summary for month period', async () => {
        
            const response = await authedRequest('get', '/api/fuel/fleet?period=month')
        
            .expect(200);


            
            expect(response.body.success).toBe(true);
            
            expect(response.body.data).toHaveProperty('period', 'month');
        });





        
        test('should default to week period if invalid period provided', async () => {
        
            const response = await authedRequest('get', '/api/fuel/fleet?period=invalid')
        
            .expect(200);


            
            expect(response.body.success).toBe(true);
            
            expect(response.body.data).toHaveProperty('period', 'week');
        });

    });





    
    describe('POST /api/fuel/calculate/trip/:tripId', () => {
    
        test('should return 404 for non-existent trip', async () => {
    
            const response = await authedRequest('post', '/api/fuel/calculate/trip/999999')
    
            .expect(404);


            
            expect(response.body.success).toBe(false);
            
            expect(response.body.error).toBe('Trip not found or no telemetry data');
        });





        
        
        test('should return 400 for invalid trip ID', async () => {
        
            const response = await authedRequest('post', '/api/fuel/calculate/trip/invalid')
        
            .expect(400);


            
            expect(response.body.success).toBe(false);
            
            expect(response.body.error).toBe('Invalid trip ID');
        });
    });
});
