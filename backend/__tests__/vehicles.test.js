

require('./setup/authMock');




const { mockPool, setupMockData } = require('./setup/mockDb');


jest.mock('../src/db/pool', () => ({ pool: mockPool }));



const request = require('supertest');

const app = require('../src/app');



describe('Vehicles Controller', () => {

  beforeAll(() => {

    setupMockData();

  });



  describe('GET /api/vehicles/locations', () => {

 
    test('should return vehicle locations', async () => {


      
      const response = await request(app)


      
      .get('/api/vehicles/locations')


      
      .set('Authorization', 'Bearer test-token');


      
      expect(response.status).toBe(200);


      
      expect(response.body.success).toBe(true);

      
    });

  });




  describe('GET /api/vehicles/:vehicleId', () => {



    
    test('should return vehicle by ID', async () => {



      const response = await request(app)


      
      
      .get('/api/vehicles/1000')


      
      .set('Authorization', 'Bearer test-token');


      
      expect(response.status).toBe(200);


      
      expect(response.body.success).toBe(true);


    });

    
    test('should return 404 for non-existent vehicle', async () => {




      
      
      const response = await request(app)




      
      .get('/api/vehicles/NONEXISTENT')




      
      .set('Authorization', 'Bearer test-token');


      
      expect(response.status).toBe(404);

      
    });


  });







  describe('GET /api/vehicles/buffer', () => {


    
    
    test('should return vehicle position buffer', async () => {

    
      const response = await request(app)


      
      
      .get('/api/vehicles/buffer')




      
      .set('Authorization', 'Bearer test-token');



      
      expect(response.status).toBe(200);




      
      expect(response.body.success).toBe(true);


    })
    ;




  describe('GET /api/vehicles/buffer', () => {
   



 test('should return vehicle position buffer', async () => {

 
  const response = await request(app)




  
  .get('/api/vehicles/buffer')



        .set('Authorization', 'Bearer test-token');

        
      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);

      expect(response.body.data.vehicles).toBeDefined();

    });




  describe('Additional branch tests', () => {
  
  
    test('should handle vehicle not found', async () => {


      
      
      const originalQuery = mockPool.query;


      
      
      
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      
      
      const response = await request(app)




      
      .get('/api/vehicles/NONEXISTENT')


      
      .set('Authorization', 'Bearer test-token');


      
      expect(response.status).toBe(404);


      
      mockPool.query = originalQuery;



    });
    
    
    
    
    test('should handle empty buffer', async () => {


      
      
      const originalQuery = mockPool.query;



      
      mockPool.query.mockResolvedValueOnce({ rows: [] });


      
      const response = await request(app)


      
      .get('/api/vehicles/buffer')



        .set('Authorization', 'Bearer test-token');

        
      
      
        expect(response.status).toBe(200);

        
      expect(response.body.data.vehicles).toEqual({});

      
      mockPool.query = originalQuery;


    })
    ;

    



  describe('More vehicle branch coverage', () => {
    



test('should handle vehicle with no position data', async () => {


      const originalQuery = mockPool.query;


      mockPool.query.mockResolvedValueOnce({


      
      
        rows: [{


          
          id: '1000',


          
          device_id: 'CAPSTONE-001',




          
          created_at: new Date(),


          
          
          status: 'offline',

          
          latitude: null,
          
          longitude: null,


          
          speed: null,




          
          total_odometer: null,


          
          ignition: null,
          
          movement: null,




          
          last_update: null

        }]

      });

     
     
      const response = await request(app)
     
     
      .get('/api/vehicles/1000')

     
      .set('Authorization', 'Bearer test-token');


      
      expect(response.status).toBe(200);




      
      expect(response.body.success).toBe(true);
      
      mockPool.query = originalQuery;

      
    });




    
    
    test('should handle buffer with multiple vehicles', async () => {





      
      const originalQuery = mockPool.query;
      
      
      mockPool.query.mockResolvedValueOnce({

      
        rows: [




          
          {vehicle_id: 'V001', time: new Date(), latitude: -25.0, longitude: 28.0, speed: 60, ignition: 'Ignition On', movement: 'Movement On', total_odometer: 10000},


          
          {vehicle_id: 'V002', time: new Date(), latitude: -26.0, longitude: 29.0, speed: 50, ignition: 'Ignition On', movement: 'Movement On', total_odometer: 20000}


        ]

      });




      
      const response = await request(app)


      
      .get('/api/vehicles/buffer')


      
      .set('Authorization', 'Bearer test-token');


      
      expect(response.status).toBe(200);
      
      expect(response.body.success).toBe(true);


      
      expect(Object.keys(response.body.data.vehicles).length).toBe(2);




      
      mockPool.query = originalQuery;




    });




  describe('Final vehicle branch coverage', () => {
    



test('should handle getLiveLocations with no vehicles', async () => {


  
  const originalQuery = mockPool.query;


  
  
  mockPool.query.mockResolvedValueOnce({ rows: [] });

  
  
  const response = await request(app)

  
  .get('/api/vehicles/locations')


  
  .set('Authorization', 'Bearer test-token');


  
  expect(response.status).toBe(200);


  
  
  expect(response.body.data.count).toBe(0);


  
  mockPool.query = originalQuery;




  


});






test('should handle getVehicleById with offline vehicle', async () => {


  const originalQuery = mockPool.query;


  mockPool.query.mockResolvedValueOnce({




    
    rows: [{
    
    
    
      id: '1000',



      
      device_id: 'CAPSTONE-001',


      
      created_at: new Date(),
      
      status: 'offline',




      
      latitude: null,


      
      longitude: null,


      
      speed: null,


      
      total_odometer: null,


      
      ignition: null,
      
      movement: null,




      
      last_update: null


      
    }]


      });





      const response = await request(app)


      
      
      .get('/api/vehicles/1000')


      
      .set('Authorization', 'Bearer test-token');


      
      expect(response.status).toBe(200);


      
      expect(response.body.success).toBe(true);


      
      mockPool.query = originalQuery;

    });
    
    
    
    
    test('should handle getVehicleById with idle vehicle', async () => {


      
      
      const originalQuery = mockPool.query;


      
      mockPool.query.mockResolvedValueOnce({


        
        rows: [{


          
          id: '1000',


          
          device_id: 'CAPSTONE-001',


          
          created_at: new Date(),


          
          status: 'idle',


          
          latitude: '-27.796935',


          
          longitude: '28.4293083',


          
          speed: 0,




          
          total_odometer: 81238116,
          
          ignition: 'Ignition On',


          
          movement: 'Movement Off',


          
          last_update: new Date()


        }]

      });





      
      const response = await request(app)





      
      .get('/api/vehicles/1000')
      
      .set('Authorization', 'Bearer test-token');


      
      expect(response.status).toBe(200);


      
      expect(response.body.success).toBe(true);


      
      mockPool.query = originalQuery;




    });





  describe('Extra vehicle branch coverage', () => {
    




test('should handle getLiveLocations with active vehicles', async () => {


  
  const response = await request(app)


  
  .get('/api/vehicles/locations')


  
  .set('Authorization', 'Bearer test-token');




  
  expect(response.status).toBe(200);


  
  expect(response.body.success).toBe(true);
  
});





    test('should handle getVehicleBuffer with no recent data', async () => {



      const originalQuery = mockPool.query;


      
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      const response = await request(app)


      
      .get('/api/vehicles/buffer')





     
      .set('Authorization', 'Bearer test-token');


      
      expect(response.status).toBe(200);


      
      expect(response.body.data.vehicles).toBeDefined();


      mockPool.query = originalQuery;




    });









  describe('Vehicle controller branch coverage', () => {
   




 test('should handle getLiveLocations with active and idle vehicles', async () => {


  
  const originalQuery = mockPool.query;


  
  mockPool.query.mockResolvedValueOnce({


    
    rows: [


      
      {id: 'V001', device_id: 'DEV-001', status: 'active', latitude: '-25.0', longitude: '28.0', speed: 60, total_odometer: 10000, ignition: 'Ignition On', movement: 'Movement On', 

last_update: new Date(), distance_today: 45.5},

          {id: 'V002', device_id: 'DEV-002', status: 'idle', latitude: '-26.0', longitude: '29.0', speed: 0, total_odometer: 20000, ignition: 'Ignition On', movement: 'Movement Off', last_update: new Date(), distance_today: 0}

        ]


      });




      const response = await request(app)


      
      .get('/api/vehicles/locations')


      
      .set('Authorization', 'Bearer test-token');


      
      expect(response.status).toBe(200);


      
      expect(response.body.success).toBe(true);




      
      expect(response.body.data.count).toBe(2);


      mockPool.query = originalQuery;
    
    
    
    });



    
    test('should handle getVehicleById with different statuses', async () => {


      
      const originalQuery = mockPool.query;


      
      mockPool.query




      
      .mockResolvedValueOnce({


        
        rows: [{


          
          id: '1000',


          
          device_id: 'CAPSTONE-001',
          
          created_at: new Date(),


          
          status: 'active',




          
          latitude: '-27.796935',
          
          longitude: '28.4293083',


          
          speed: 45,




          
          total_odometer: 81238116,


          
          ignition: 'Ignition On',
          
          movement: 'Movement On',


          
          last_update: new Date()


          
        }]




        
      })


      
      .mockResolvedValueOnce({


        
        rows: [


          
          {type: 'harsh_braking', event_category: 'green_driving_type', speed: 60, latitude: '-27.796935', longitude: '28.4293083', timestamp: new Date()}


          
        ]

        });

        
     
        const response = await request(app)





        
        .get('/api/vehicles/1000')


        
        .set('Authorization', 'Bearer test-token');

        
     
        expect(response.status).toBe(200);



     
        expect(response.body.success).toBe(true);



      mockPool.query = originalQuery;




      
    });

  });





  });




  });






  });





  });



  });

  });

});




