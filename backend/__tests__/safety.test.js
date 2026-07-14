



require('./setup/authMock');





const {mockPool, setupMockData} = require('./setup/mockDb');



jest.mock('../src/db/pool', () => ({ pool: mockPool }));





const request = require('supertest');



const app = require('../src/app');







describe('Safety Controller', () => {


  
  beforeAll(() => {


    
    setupMockData();


  })
  ;



  
  
  describe('GET /api/safety/scores', () => {
  

    
    test('should return fleet safety scores', async () => {
  

      
      const response = await request(app)
  

      
      .get('/api/safety/scores')
  

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.success).toBe(true);
    
    
    
    })
    ;









    
    
    test('should return empty array if no data for date', async () => {
    

      
      const response = await request(app)
    

      
      .get('/api/safety/scores?date=2025-01-01')
    

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.data.total_vehicles).toBe(0);
    
    
    
    })
    ;
  });





  
  
  
  describe('GET /api/safety/scores/:vehicleId', () => {
  

    
    test('should return safety score for a vehicle', async () => {
  

      
      const response = await request(app)
  

      
      .get('/api/safety/scores/V001')
  

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.success).toBe(true);
      

      
      expect(response.body.data.vehicle_id).toBe('V001');
    
    
    
    })
    
    ;






    
    
    test('should return default 100 score if no data exists', async () => {
    
    
      const response = await request(app)
    

      
      .get('/api/safety/scores/NONEXISTENT')
    

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.data.safety_score).toBe(100);
    
    
    
    })
    
    ;







    
    
    
    test('should handle date parameter', async () => {
    


      
      const response = await request(app)
    

      
      .get('/api/safety/scores/V001?date=2026-07-13')
    

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.success).toBe(true);
    
    
    
    });
  });






  
  
  
  describe('Error handling', () => {
  

    
    test('should handle database error in getFleetSafetyScores', async () => {
  

  

      
      const originalQuery = mockPool.query;
      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));




      

      
      const response = await request(app)
      

      
      .get('/api/safety/scores')
      

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(500);
      

      
      expect(response.body.success).toBe(false);
    
    
      mockPool.query = originalQuery;
    
    
    
    })
    ;





    
    
    
    test('should handle database error in getVehicleSafetyScore', async () => {
    


      
      const originalQuery = mockPool.query;
    

      
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));




      

      
      const response = await request(app)
      

      
      .get('/api/safety/scores/V001')
      

      
      .set('Authorization', 'Bearer test-token');



      
      
      expect(response.status).toBe(500);
      

      
      expect(response.body.success).toBe(false);
      

      
      mockPool.query = originalQuery;
    
    
    
    });
  });





  

  
  describe('Additional branch tests', () => {
  

    
    test('should handle vehicle with no safety data', async () => {
  

      
      const response = await request(app)
  

      
      .get('/api/safety/scores/NONEXISTENT')
  

  

      
      .set('Authorization', 'Bearer test-token');


  

      
      expect(response.status).toBe(200);
  

      
      expect(response.body.data.safety_score).toBe(100);
  


      
    });





    
    
    
    
    test('should handle null safety_score', async () => {
    

      
      const originalQuery = mockPool.query;
    

      
      mockPool.query.mockResolvedValueOnce({
    

        
        rows: [{
    

          
          vehicle_id: 'V001',
    

          
          score_date: '2026-07-13',
    

          
          safety_score: null,
    

          
          harsh_brakes: null,
    

          
          
          harsh_accelerations: null,
    
          
          harsh_cornering: null,
    

    

          
          crashes: null,
    

          
          total_events: null,
    

          classification: null
        
        
        
        }]
      });





      
      
      const response = await request(app)
      

      
      .get('/api/safety/scores/V001')
      

      
      .set('Authorization', 'Bearer test-token');




      
      expect(response.status).toBe(200);
      

      
      expect(response.body.data.safety_score).toBe(100);
      

      
      mockPool.query = originalQuery;
    
    
    
    })
    ;
  });






  
  
  describe('More safety branch coverage', () => {
  

    
    test('should handle result with empty rows in fleet safety', async () => {
  

      
      const originalQuery = mockPool.query;
  

      
      mockPool.query.mockResolvedValueOnce({ rows: [] });




      

      
      const response = await request(app)
      

      
      .get('/api/safety/scores')
      

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.data.total_vehicles).toBe(0);
      
      
      mockPool.query = originalQuery;
    
    
    });





    
    
    
    
    test('should handle classification mapping for safety scores', async () => {
    
    
      const originalQuery = mockPool.query;
    

      
      mockPool.query.mockResolvedValueOnce({
    

        
        
        rows: [{
    

          
          vehicle_id: 'V001',
    

          
          score_date: '2026-07-13',
    

          
          safety_score: 45,
    

          
          harsh_brakes: 8,
    

          
          harsh_accelerations: 5,
    

          
          harsh_cornering: 3,
    

          
          crashes: 1,
    

          
          total_events: 17,
    

          
          classification: 'Poor'
    

        }]

      });

    
    
    
    
      
      
      const response = await request(app)
    

      
      .get('/api/safety/scores/V001')
    

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.data.classification).toBe('Poor');
      

      mockPool.query = originalQuery;
    
    
    
    });
  });






  
 
  
  describe('Final safety branch coverage', () => {
  

    test('should handle safety score with no rows in result', async () => {
    
      const originalQuery = mockPool.query;
  

      
      mockPool.query.mockResolvedValueOnce({ rows: [] });




      

      
      const response = await request(app)
      

      
      
      .get('/api/safety/scores/V001')
      

      
      .set('Authorization', 'Bearer test-token');




      

      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.data.safety_score).toBe(100);
      

      mockPool.query = originalQuery;
    
    
    });





    
    
    test('should handle safety score with fair classification', async () => {
    

      
      const originalQuery = mockPool.query;
    

    

      
      mockPool.query.mockResolvedValueOnce({
      
        rows: [{
    

          
          vehicle_id: 'V001',
    

          
          score_date: '2026-07-13',
    

          
          safety_score: 65,
    

          
          harsh_brakes: 5,
    

          
          harsh_accelerations: 3,
    

          
          harsh_cornering: 2,
    

    

          
          crashes: 0,
          
          total_events: 10,
    

          
          classification: 'Fair'
    

        }]

    
      });





      

      const response = await request(app)
      

      
      .get('/api/safety/scores/V001')
      

      
      .set('Authorization', 'Bearer test-token');





      
      
      expect(response.status).toBe(200);
      

      
      expect(response.body.data.classification).toBe('Fair');
      

      
      mockPool.query = originalQuery;
    
    
    })
    ;





    

    
    test('should handle safety score with poor classification', async () => {
    

      
      const originalQuery = mockPool.query;
    


      mockPool.query.mockResolvedValueOnce({
    

    

        
        rows: [{
        
          vehicle_id: 'V001',
    

          
          score_date: '2026-07-13',
    

          
          safety_score: 45,
    

          
          
          harsh_brakes: 8,
    

          
          harsh_accelerations: 5,
    

          
          harsh_cornering: 3,
    

          
          crashes: 1,
    

          
          total_events: 17,
    

          
          classification: 'Poor'
    

        }]

      });




      
     
      const response = await request(app)
     
      
      
      .get('/api/safety/scores/V001')
      

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.data.classification).toBe('Poor');
      

      
      mockPool.query = originalQuery;
    
    
    
    });
  });






  
 
 
  describe('Extra safety branch coverage', () => {
 
    

    
    test('should handle getFleetSafetyScores with data', async () => {
  

      
      const response = await request(app)
  

      
      .get('/api/safety/scores')
  

      
      .set('Authorization', 'Bearer test-token');






      
      expect(response.status).toBe(200);
      

      expect(response.body.success).toBe(true);
    
    
    
    })
    ;


    
    
    
  
    
    
    test('should handle getVehicleSafetyScore with fair classification', async () => {
    

      
      const originalQuery = mockPool.query;
    

      
      mockPool.query.mockResolvedValueOnce({
    

    

        
        rows: [{
    

          
          vehicle_id: 'V001',
    

          
          score_date: '2026-07-13',
    

          
          safety_score: 65,
    

          
          harsh_brakes: 5,
    

          
          harsh_accelerations: 3,
    

          
          harsh_cornering: 2,
    

          
          crashes: 0,
    

          
          total_events: 10,
    

          
          classification: 'Fair'
    

        }]
      });

    
    
    
    
    
      const response = await request(app)
    

      .get('/api/safety/scores/V001')
    

      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.data.classification).toBe('Fair');
      
      mockPool.query = originalQuery;
    
    
    
    });
  });






  
  
  
  
  describe('Safety controller branch coverage', () => {
  
  
    test('should handle getFleetSafetyScores with mixed classifications', async () => {
  


      const originalQuery = mockPool.query;
  

      
      mockPool.query.mockResolvedValueOnce({
  

        
        rows: [
  

          
          {vehicle_id: 'V001', score_date: '2026-07-13', safety_score: 85, harsh_brakes: 2, harsh_accelerations: 1, harsh_cornering: 0, crashes: 0, total_events: 3, classification: 'Good'},
  

          
          {vehicle_id: 'V002', score_date: '2026-07-13', safety_score: 65, harsh_brakes: 5, harsh_accelerations: 3, harsh_cornering: 2, crashes: 0, total_events: 10, classification: 'Fair'},
  

          
          {vehicle_id: 'V003', score_date: '2026-07-13', safety_score: 45, harsh_brakes: 8, harsh_accelerations: 5, harsh_cornering: 3, crashes: 1, total_events: 17, classification: 'Poor'}
  

        ]

  

      })
      ;


      

      
      const response = await request(app)
      

      
      
      .get('/api/safety/scores')
      
      
      .set('Authorization', 'Bearer test-token');




      

      
      expect(response.status).toBe(200);
      

      
      
      expect(response.body.success).toBe(true);
      

      
      expect(response.body.data.total_vehicles).toBe(3);
      

      mockPool.query = originalQuery;
    
    
    
    });





    
    
    
    test('should handle getVehicleSafetyScore with null classification', async () => {
    

      
      const originalQuery = mockPool.query;
    

      
      mockPool.query.mockResolvedValueOnce({
    

        
        rows: [{
    

          
          vehicle_id: 'V001',
    

          
          score_date: '2026-07-13',
    

          safety_score: null,
    
          harsh_brakes: null,
    
          harsh_accelerations: null,
    
          harsh_cornering: null,
    
    
          crashes: null,
         
         
          total_events: null,
    
          classification: null
    
        }]
      });




      
      
      
      const response = await request(app)
      
      .get('/api/safety/scores/V001')
      

      
      .set('Authorization', 'Bearer test-token');


      
      
      

      

      

      
      expect(response.status).toBe(200);
      

      
      expect(response.body.data.safety_score).toBe(100);
      

      
      mockPool.query = originalQuery;
   
   
    })

    ;
  });
});



