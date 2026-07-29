




require('./setup/authMock');



const {mockPool, setupMockData} = require('./setup/mockDb');



jest.mock('../src/db/pool', () => ({ pool: mockPool }));



const request = require('supertest');


const app = require('../src/app');






describe('Geofence Controller - Extra Branch Coverage', () => {


  
  beforeAll(() => {


    
    setupMockData();


  })
  ;





  
  describe('GET /api/geofences/:id - error handling', () => {
  

    
    test('should handle database error when fetching geofence by id', async () => {
  

      
      const originalQuery = mockPool.query;
  

      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));




      

      
      const response = await request(app)
      

      
      .get('/api/geofences/1')
      

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(500);
      

      
      expect(response.body.success).toBe(false);
      
      mockPool.query = originalQuery;
    
    
    
    });
  });






  
  describe('PUT /api/geofences/:id - error handling', () => {
  

    
    test('should handle database error when updating geofence', async () => {
  

      
      const originalQuery = mockPool.query;
  

      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));




      

      
      const response = await request(app)
      

      
      .put('/api/geofences/1')
      

      
      .set('Authorization', 'Bearer test-token')
      

      
      .send({
      

        
        name: 'Updated Zone',
      

        
        trigger_type: 'entry'
      

      })
      ;


      

      
      expect(response.status).toBe(500);
      

      
      expect(response.body.success).toBe(false);
      

      mockPool.query = originalQuery;
    
    
    
    });
  });





  

  
  describe('DELETE /api/geofences/:id - error handling', () => {
  

    
    test('should handle database error when deleting geofence', async () => {
  

      
      const originalQuery = mockPool.query;
  

      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));




      

      
      const response = await request(app)
      

      
      .delete('/api/geofences/1')
      

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(500);
      

      
      expect(response.body.success).toBe(false);
      

      
      mockPool.query = originalQuery;
    
    
    
    });
  });





  

  
  describe('GET /api/geofences/events - error handling', () => {
  

    
    
    test('should handle database error when fetching geofence events', async () => {
  

      
      const originalQuery = mockPool.query;
  

      
      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));




      

      
      const response = await request(app)
      

      
      .get('/api/geofences/events')
      

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(500);
      

      
      expect(response.body.success).toBe(false);
      

      mockPool.query = originalQuery;
    
    
    
    });
  });





  
  describe('GET /api/geofences/discover/stops - error handling', () => {
 
    
    test('should handle database error when discovering stops', async () => {
  

      

      
      const originalQuery = mockPool.query;
  

      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));




      

      
      const response = await request(app)
      

      
      .get('/api/geofences/discover/stops?vehicle_id=V001&days=30')
      

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(500);
      

      
      expect(response.body.success).toBe(false);
      



      mockPool.query = originalQuery;
    
    
    
    });
  });





  
  describe('POST /api/geofences/discover/create - error handling', () => {

    

  

    
    test('should handle database error when creating geofence from cluster', async () => {
    


      const originalQuery = mockPool.query;
  

  

      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));


  

      
      const response = await request(app)
  

      
      .post('/api/geofences/discover/create')
  

      
      .set('Authorization', 'Bearer test-token')
  

      
      .send({
  

        
        name: 'Cluster Zone',
        
        center_lat: -25.0,
  

        
        center_lng: 28.0,
  

        
        radius_km: 0.5
  

        });

        
      
      
      
        
        
        expect(response.status).toBe(500);
      
      
        expect(response.body.success).toBe(false);
     
     
     
        mockPool.query = originalQuery;
   
   
      });
  });







  

  
  describe('POST /api/geofences - error handling', () => {
  

  

    
    test('should handle database error when creating geofence', async () => {
    
      const originalQuery = mockPool.query;
  

      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));




      

      

      
      const response = await request(app)
      
      .post('/api/geofences')
      

      
      .set('Authorization', 'Bearer test-token')
      

      
      .send({
      

        
        name: 'Test Zone',
      

        
        boundary: {type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]]},
      

        
        trigger_type: 'both'
      

        
      });

        
     
     
        expect(response.status).toBe(500);
     
     
        expect(response.body.success).toBe(false);
     
      
      
        mockPool.query = originalQuery;
   
   
   
   
      });
  });




  
  
  
  describe('GET /api/geofences - error handling', () => {
  


    
    test('should handle database error when fetching geofences', async () => {
  

      
      const originalQuery = mockPool.query;
  

      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));




      

      

      
      const response = await request(app)
      

      
      .get('/api/geofences')
      

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(500);
      

      
      expect(response.body.success).toBe(false);
      

      mockPool.query = originalQuery;
    
    
    
    });
  });
});




test('should handle database error in getGeofences', async () => {


  const originalQuery = mockPool.query;

  mockPool.query.mockRejectedValueOnce(new Error('Database error'));




  
  const response = await request(app)
  
  .get('/api/geofences')
  
  .set('Authorization', 'Bearer test-token');


  
  expect(response.status).toBe(500);
  
  expect(response.body.success).toBe(false);
  
  mockPool.query = originalQuery;



})
;









test('should return empty array when no active geofences exist', async () => {


  
  
  const originalQuery = mockPool.query;
  
  
  mockPool.query.mockResolvedValueOnce({rows: [], rowCount: 0 });






  
  const response = await request(app)
  
  .get('/api/geofences?active_only=true')
  
  .set('Authorization', 'Bearer test-token');


  
  
  expect(response.status).toBe(200);
  
  
  
  expect(response.body.data.geofences).toEqual([]);
  
  mockPool.query = originalQuery;



})
;









test('should return 400 when polygon is missing in geofence creation', async () => {


  const response = await request(app)


  .post('/api/geofences')

  .set('Authorization', 'Bearer test-token')

  .send({ name: 'Test Zone' }); 


  
  expect(response.status).toBe(400);
  
  expect(response.body.success).toBe(false);


})
;









test('should return 404 when updating non-existent geofence', async () => {


  const originalQuery = mockPool.query;

  mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });



  
  const response = await request(app)
  
  
  .put('/api/geofences/99999')
    .set('Authorization', 'Bearer test-token')
  
  
    .send({ name: 'Updated Zone' });

    
  expect(response.status).toBe(404);
  
  
  mockPool.query = originalQuery;



});











test('should return 404 when deleting non-existent geofence', async () => {



  const originalQuery = mockPool.query;


  mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });



  
  const response = await request(app)
  
  .delete('/api/geofences/99999')
  
  .set('Authorization', 'Bearer test-token');


  
  expect(response.status).toBe(404);
  
  mockPool.query = originalQuery;



})
;








test.skip('should return empty clusters when no frequent stops found', async () => {


 
 
  
  
  const originalQuery = mockPool.query;
 
 
  mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });





  
  
  const response = await request(app)
  
  
  .get('/api/geofences/discover/stops?vehicle_id=V001&days=7')
  
  .set('Authorization', 'Bearer test-token');


  
  expect(response.status).toBe(200);
  
  expect(response.body.data.clusters).toEqual([]);
  
  mockPool.query = originalQuery;


  
})
;







test('should return all geofences including inactive when active_only=false', async () => {


  const originalQuery = mockPool.query;


  
  mockPool.query.mockResolvedValueOnce({


    
    
    rows: [

      {id: 1, name: 'Active Zone', vehicle_id: null, polygon: '{}', trigger_type: 'both', is_active: true, created_at: new Date(), updated_at: new Date() },


      
      {id: 2, name: 'Inactive Zone', vehicle_id: null, polygon: '{}', trigger_type: 'entry', is_active: false, created_at: new Date(), updated_at: new Date() }



    ],


    rowCount: 2

  });


  
  const response = await request(app)
  
  .get('/api/geofences?active_only=false')
  
  .set('Authorization', 'Bearer test-token');


  
  expect(response.status).toBe(200);
  
  expect(response.body.data.geofences.length).toBe(2);
  
  mockPool.query = originalQuery;



})
;










test('should return geofence events with no filters', async () => {



  const originalQuery = mockPool.query;


  mockPool.query.mockResolvedValueOnce({



    rows: [



      {id: 1, geofence_id: 1, geofence_name: 'Test Zone', vehicle_id: 'V001', event_type: 'entry', latitude: -25.0, longitude: 28.0, speed: 60, created_at: new Date()}




    ],



    rowCount: 1

  });


  
  const response = await request(app)
  
  
  .get('/api/geofences/events')
    .set('Authorization', 'Bearer test-token');


    
  
  
    expect(response.status).toBe(200);
  
  
  
    expect(response.body.success).toBe(true);
  
    expect(response.body.data.events).toBeDefined();
  
    mockPool.query = originalQuery;




})
;









test('should filter geofence events by geofence_id', async () => {


  const originalQuery = mockPool.query;





  
  mockPool.query.mockResolvedValueOnce({
  



    rows: [




      
      {id: 1, geofence_id: 1, geofence_name: 'Test Zone', vehicle_id: 'V001', event_type: 'entry', latitude: -25.0, longitude: 28.0, speed: 60, created_at: new Date()}


    ],



    rowCount: 1
  
  
  
  });


  
  
  const response = await request(app)
  
  
  .get('/api/geofences/events?geofence_id=1')
  
  .set('Authorization', 'Bearer test-token');


  
  expect(response.status).toBe(200);
  
  
  
  expect(response.body.success).toBe(true);
  
  
  
  mockPool.query = originalQuery;



})
;








test('should filter geofence events by vehicle_id', async () => {


  const originalQuery = mockPool.query;
 
 
 
  mockPool.query.mockResolvedValueOnce({


    rows: [

      {id: 1, geofence_id: 1, geofence_name: 'Test Zone', vehicle_id: 'V001', event_type: 'entry', latitude: -25.0, longitude: 28.0, speed: 60, created_at: new Date()}



    ],

    rowCount: 1



  });


  
  
 
  const response = await request(app)
 
  .get('/api/geofences/events?vehicle_id=V001')
 
 
  .set('Authorization', 'Bearer test-token');



  
  
  expect(response.status).toBe(200);



  expect(response.body.success).toBe(true);
  
  
  
  
  mockPool.query = originalQuery;



});










test('should respect limit parameter in geofence events', async () => {


  
  const originalQuery = mockPool.query;


  
  mockPool.query.mockResolvedValueOnce({



    rows: [

      {id: 1, geofence_id: 1, geofence_name: 'Test Zone', vehicle_id: 'V001', event_type: 'entry', latitude: -25.0, longitude: 28.0, speed: 60, created_at: new Date()}
    ],


    rowCount: 1



  });



  
  
  
  
  const response = await request(app)
  
  .get('/api/geofences/events?limit=5')
  
  .set('Authorization', 'Bearer test-token');



  expect(response.status).toBe(200);
  

  expect(response.body.success).toBe(true);
  

  mockPool.query = originalQuery;



})


;






test('should return empty events when no geofence events found', async () => {



  const originalQuery = mockPool.query;

  mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });


  
  const response = await request(app)
  

  
  .get('/api/geofences/events')
  

  .set('Authorization', 'Bearer test-token');


  
  expect(response.status).toBe(200);



  expect(response.body.data.events).toEqual([]);
  
  mockPool.query = originalQuery;



})
;








test('should handle database error in geofence events', async () => {



  const originalQuery = mockPool.query;


  mockPool.query.mockRejectedValueOnce(new Error('Database error'));


  
  const response = await request(app)
  



  .get('/api/geofences/events')
    .set('Authorization', 'Bearer test-token');

    


 
    expect(response.status).toBe(500);
 
 
    expect(response.body.success).toBe(false);
 


    mockPool.query = originalQuery;


});









test.skip('should handle missing vehicle_id in discover frequent stops', async () => {


  const response = await request(app)

  .get('/api/geofences/discover/stops?days=7')


    .set('Authorization', 'Bearer test-token');





    expect(response.status).toBe(200);


  expect(response.body.success).toBe(true);


});










test.skip('should handle discover frequent stops with custom radius', async () => {

  const originalQuery = mockPool.query;

  mockPool.query.mockResolvedValueOnce({


    rows: [


      {vehicle_id: 'V001', cluster_id: 1, centroid_lat: -25.0, centroid_lng: 28.0, point_count: 5, first_seen: new Date(), last_seen: new Date()}



    ],

    rowCount: 1



  });



  const response = await request(app)
  
  
  
  
  
  .get('/api/geofences/discover/stops?vehicle_id=V001&days=7&radius_km=1.0')
  


  .set('Authorization', 'Bearer test-token');


  
  expect(response.status).toBe(200);
  


  expect(response.body.success).toBe(true);


  
  mockPool.query = originalQuery;




})
;






test('should return 400 when creating geofence from cluster with missing center_lat', async () => {

  const response = await request(app)


  .post('/api/geofences/discover/create')

  .set('Authorization', 'Bearer test-token')

  .send({ name: 'Test Cluster', center_lng: 28.0, radius_km: 0.5 }); 




  
  expect(response.status).toBe(400);
  
  expect(response.body.success).toBe(false);



})
;







test('should return 400 when creating geofence from cluster with missing center_lng', async () => {


  
  const response = await request(app)
  
  .post('/api/geofences/discover/create')
  
  .set('Authorization', 'Bearer test-token')
  
  
  .send({name: 'Test Cluster', center_lat: -25.0, radius_km: 0.5});


  
  
  expect(response.status).toBe(400);
  
  expect(response.body.success).toBe(false);



})
;



test('should handle database error in discoverFrequentStops', async () => {


  const originalQuery = mockPool.query;
  mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));


  
  
  const response = await request(app)
  
  .get('/api/geofences/discover/stops?vehicle_id=V001&days=7')
  
  .set('Authorization', 'Bearer test-token');

  
  
  
  expect(response.status).toBe(500);
  
  expect(response.body.success).toBe(false);
  
  expect(response.body.error).toContain('Database connection failed');
  
  mockPool.query = originalQuery;



})
;
