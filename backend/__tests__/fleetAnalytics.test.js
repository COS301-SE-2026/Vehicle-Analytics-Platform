


require('./setup/authMock');




const {mockPool, setupMockData} = require('./setup/mockDb');






jest.mock('../src/db/pool', () => ({ pool: mockPool }));








const request = require('supertest');



const app = require('../src/app');







describe('Fleet Analytics Controller', () => {



  beforeAll(() => {



    setupMockData();





  });







  describe('GET /api/fleet/analytics', () => {



    test('should return fleet analytics for day period', async () => {



      const response = await request(app)



        .get('/api/fleet/analytics?period=day')



        .set('Authorization', 'Bearer test-token');



      expect(response.status).toBe(200);



      expect(response.body.success).toBe(true);



      expect(response.body.data.period).toBe('day');





    });







    test('should return fleet analytics for week period', async () => {



      const response = await request(app)





        .get('/api/fleet/analytics?period=week')




        .set('Authorization', 'Bearer test-token');



      expect(response.status).toBe(200);



      expect(response.body.success).toBe(true);



      expect(response.body.data.period).toBe('week');



    });



  });






  describe('GET /api/fleet/vehicle/:vehicleId/scores', () => {




    test('should return daily scores for a vehicle', async () => {



      const response = await request(app)



        .get('/api/fleet/vehicle/V001/scores?days=7')



        .set('Authorization', 'Bearer test-token');



      expect(response.status).toBe(200);



      expect(response.body.success).toBe(true);



      expect(response.body.data.vehicle_id).toBe('V001');



    });



  });







  describe('GET /api/fleet/vehicle/:vehicleId/scores edge cases', () => {

    test('should handle non-existent vehicle', async () => {

      const response = await request(app)


        .get('/api/fleet/vehicle/NONEXISTENT/scores?days=7')

        .set('Authorization', 'Bearer test-token');


      expect(response.status).toBe(200);


      expect(response.body.success).toBe(true);




    });






  });






});

