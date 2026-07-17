




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


