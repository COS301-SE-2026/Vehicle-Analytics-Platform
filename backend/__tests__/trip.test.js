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






describe('Trip Controller - Additional Coverage', () => {




  test('should handle getTripHistory with invalid vehicleId returning empty', async () => {






    const originalQuery = mockPool.query;


    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });





    const response = await request(app)





      .get('/api/trips/history/UNKNOWN?limit=10')



      .set('Authorization', 'Bearer test-token');








    expect(response.status).toBe(200);



    expect(response.body.data.trips).toEqual([]);



    mockPool.query = originalQuery;



  });





  test('should handle getTripReplay with missing trip status', async () => {





    const originalQuery = mockPool.query;




    mockPool.query.mockResolvedValueOnce({



      rows: [{



        vehicle_id: 'V001',



        start_time: new Date(),



        end_time: new Date(),



        distance_km: 45.5,



        avg_speed_kmh: 45.5,



        max_speed_kmh: 85.0



      



      }]

    });






    const response = await request(app)







      .get('/api/trips/replay/1')




      .set('Authorization', 'Bearer test-token');



  




    expect(response.status).toBe(200);




    mockPool.query = originalQuery;





  });
});

  });

});