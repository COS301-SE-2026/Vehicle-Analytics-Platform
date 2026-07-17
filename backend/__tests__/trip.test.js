



require('./setup/authMock');



const {mockPool, setupMockData} = require('./setup/mockDb');



jest.mock('../src/db/pool', () => ({ pool: mockPool }));






const request = require('supertest');



const app = require('../src/app');





describe('Trip Controller', () => {


  
  beforeAll(() => {


    
    setupMockData();


  })
  ;




  

  
  describe('GET /api/trips/history/:vehicleId', () => {
  

    
    test('should return trip history for a vehicle', async () => {
  

      
      const response = await request(app)
  

      
      .get('/api/trips/history/V001?limit=10')
  

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.success).toBe(true);
      

      
      expect(response.body.data.vehicle_id).toBe('V001');
      

      
      expect(response.body.data.trips.length).toBeGreaterThan(0);
    
    
    
    });





    
    
    test('should handle before parameter', async () => {
    

      
      const response = await request(app)
    

      
      .get('/api/trips/history/V001?limit=10&before=2026-07-12T00:00:00Z')
    

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.success).toBe(true);
    
    
    
    });





    
   
    test('should handle missing vehicleId', async () => {
   
      
      
      const response = await request(app)
    

    

      
      .get('/api/trips/history/')
    

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(404);
    
    
    
    })
    ;





    
    test('should handle database error', async () => {
    

      
      const originalQuery = mockPool.query;
    

      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));




      

      
      const response = await request(app)
      

      
      .get('/api/trips/history/V001?limit=10')
      

      
      .set('Authorization', 'Bearer test-token');




      

      

      
      expect(response.status).toBe(500);
      
      expect(response.body.success).toBe(false);
      

      
      mockPool.query = originalQuery;
    
    
    
    
    })
    ;
  });




  
  
  
  
  describe('GET /api/trips/replay/:tripId', () => {
  

  

    
    test('should return 404 for non-existent trip', async () => {
  

      
      const response = await request(app)
      
      .get('/api/trips/replay/99999')
  

  

      
      .set('Authorization', 'Bearer test-token');


      
      
      

      

      
      expect(response.status).toBe(404);
    
    
    
    });




    
    
    
    test('should handle missing tripId', async () => {
    

      
      const response = await request(app)
    

      
      .get('/api/trips/replay/')
    

      
      .set('Authorization', 'Bearer test-token');






      
      expect(response.status).toBe(404);
    
    
    
    });





    
    
    
    test('should handle database error', async () => {
    



    

      
      const originalQuery = mockPool.query;
    

      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));




      
      const response = await request(app)
      

      

      
      .get('/api/trips/replay/1')
      
      .set('Authorization', 'Bearer test-token');


      
      
      

      

      
      expect(response.status).toBe(500);
      

      
      
      expect(response.body.success).toBe(false);
      

        mockPool.query = originalQuery;
    
    
    
    
      })
    ;
  });





  
  
 
 
  describe('GET /api/trips/replay/:tripId - success', () => {
 
    
    
    test('should return trip replay data for valid trip', async () => {
  

      
      const originalQuery = mockPool.query;
  

      
      mockPool.query
  

      
      .mockResolvedValueOnce({
  

        
        rows: [{
  

          
          vehicle_id: 'V001',
  

          
          start_time: new Date(),
  

          
          end_time: new Date(),
  

          
          distance_km: 45.5,
  

          
          avg_speed_kmh: 45.5,
  

          
          max_speed_kmh: 85.0,
  

          
          status: 'completed'
  

        }]
  
      })
  
  
  
  
      
      
      .mockResolvedValueOnce({
  

        
        rows: [
  

          
          {point_time: new Date(), latitude: -25.0, longitude: 28.0, speed_kmh: 60},
  

          
          {point_time: new Date(), latitude: -25.1, longitude: 28.1, speed_kmh: 80}
  

        ]

  
      })
  

      
      .mockResolvedValueOnce({
  

        
        rows: [
  

          
          {time: new Date(), type: 'harsh_braking', event_category: 'green_driving_type', latitude: -25.05, longitude: 28.05, speed: 60}
  

        ]

  

      });



      
    
      const response = await request(app)
    
      
      
      
      .get('/api/trips/replay/1')
      

      


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
      

      
      expect(response.body.success).toBe(true);
      

      
      expect(response.body.data.trip).toBeDefined();
      

      
      expect(response.body.data.points).toBeDefined();
      

      
      expect(response.body.data.events).toBeDefined();
      

      
      expect(response.body.data.points.length).toBeGreaterThan(0);
      
      
      mockPool.query = originalQuery;
   
   
   
    });
 
 
 
 
  });


});
  




    expect(response.status).toBe(200);




    mockPool.query = originalQuery;





  });
});

  });

});


