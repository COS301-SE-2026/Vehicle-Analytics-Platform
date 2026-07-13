require('./setup/authMock');



const {mockPool, setupMockData} = require('./setup/mockDb');



jest.mock('../src/db/pool', () => ({ pool: mockPool }));






const request = require('supertest');



const app = require('../src/app');







describe('Trip Controller', () => {



  beforeAll(() => {



    setupMockData();



  });













  describe('GET /api/trips/history/:vehicleId', () => {



    test('should return trip history for a vehicle', async () => {



      const response = await request(app)





        .get('/api/trips/history/V001?limit=10')







        .set('Authorization', 'Bearer test-token');




      expect(response.status).toBe(200);


      expect(response.body.success).toBe(true);







      expect(response.body.data.vehicle_id).toBe('V001');



    });



  });

});


