

jest.unmock('pg');






const request = require('supertest');

const app = require('../src/app');

const generateToken = require('../tests/generateToken');



process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';



const managerToken = generateToken(1, 'manager@test.com', 'fleet_manager');

const adminToken = generateToken(2, 'admin@test.com', 'admin');



function authedRequest(method, path, token = managerToken) {

    return request(app)[method](path).set('Authorization', `Bearer ${token}`);

}



describe('Fuel History Controller - Integration Tests', () => {

    describe('GET /api/fuel/vehicle/:vehicleId/history', () => {

        test('should return fuel history for vehicle 1000', async () => {

            const response = await authedRequest('get', '/api/fuel/vehicle/1000/history?period=week&limit=10')

            .expect(200);

            
            
            expect(response.body.success).toBe(true);
            
            expect(Array.isArray(response.body.data)).toBe(true);
        });



        
        test('should return 401 if no token provided', async () => {
        
            const response = await request(app)
        
            .get('/api/fuel/vehicle/1000/history')
        
            .expect(401);
        
            
            
            expect(response.body.success).toBe(false);
        });




        
        test('should return empty array for vehicle with no history', async () => {
        
        
            const response = await authedRequest('get', '/api/fuel/vehicle/9999/history?period=week&limit=10')
        
            .expect(200);
        
            
            
            expect(response.body.success).toBe(true);
            
            expect(response.body.data).toEqual([]);
        });
    });




    
    describe('GET /api/fuel/fleet/history', () => {
    
        test('should return fleet fuel history', async () => {
    
            const response = await authedRequest('get', '/api/fuel/fleet/history?period=week&limit=10')
    
            .expect(200);
    
            
            
            expect(response.body.success).toBe(true);
            
            expect(Array.isArray(response.body.data)).toBe(true);
        });





        
        test('should return 401 if no token provided', async () => {
        
            const response = await request(app)
        
            .get('/api/fuel/fleet/history')
        
            .expect(401);
        
            
            
            expect(response.body.success).toBe(false);
        });

    });




    
    describe('GET /api/fuel/vehicle/:vehicleId/trend', () => {
    
        test('should return vehicle fuel trend', async () => {
    
            const response = await authedRequest('get', '/api/fuel/vehicle/1000/trend?days=30')
    
            .expect(200);
    
            
            
            
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });





        
        
        test('should return 401 if no token provided', async () => {
        
            const response = await request(app)
        
            .get('/api/fuel/vehicle/1000/trend')
        
            .expect(401);
        
            
            
            expect(response.body.success).toBe(false);
        });


        
        
        
        test('should return empty array for non-existent vehicle', async () => {
        
            const response = await authedRequest('get', '/api/fuel/vehicle/9999/trend?days=30')
        
            .expect(200);
        
            
            
            
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
        });

    });




    
    
    describe('POST /api/fuel/vehicle/:vehicleId/calculate', () => {
    
        test('should calculate daily history for vehicle 1000 (admin only)', async () => {
    
            const response = await authedRequest('post', '/api/fuel/vehicle/1000/calculate?date=2026-08-31', adminToken)
    
            .expect(200);
    
            
            
            
            expect(response.body.success).toBe(true);
            
            expect(response.body.message).toBe('Daily fuel history calculated');
        });

     
        test('should return 403 if non-admin tries to calculate', async () => {
     
            const response = await authedRequest('post', '/api/fuel/vehicle/1000/calculate?date=2026-08-31')
     
            .expect(403);
     
            
            
            expect(response.body.success).toBe(false);
        });



        
        test('should return 401 if no token provided', async () => {
        
            const response = await request(app)
        
            .post('/api/fuel/vehicle/1000/calculate')
        
            .expect(401);
        
            
            
            expect(response.body.success).toBe(false);
        });

    
        test('should handle missing date parameter with admin token', async () => {
    
            const response = await authedRequest('post', '/api/fuel/vehicle/1000/calculate', adminToken)
    
            .expect(200);
    
            
            
            expect(response.body.success).toBe(true);
            
            expect(response.body.message).toBe('Daily fuel history calculated');
        });

 
 
 
        test('should handle non-existent vehicle with admin token', async () => {
 
            const response = await authedRequest('post', '/api/fuel/vehicle/9999/calculate?date=2026-08-31', adminToken)
 
            .expect(200);
 
            
            
            expect(response.body.success).toBe(true);
            
            expect(response.body.message).toBe('Daily fuel history calculated');
        
        
        
        });
    });
});
