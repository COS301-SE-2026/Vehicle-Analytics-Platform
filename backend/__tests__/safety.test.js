


const request = require('supertest');

const app = require('../src/app');


const {pool} = require('../src/db/pool');




jest.mock('../src/db/pool', () => ({

  pool: {

    query: jest.fn(),

  },

}));







const {pool: mockPool} = require('../src/db/pool');







process.env.JWT_SECRET = 'test_secret_key';



process.env.NODE_ENV = 'test';





describe('Safety Controller', () => {


  
  let token;





  
  
  beforeAll(() => {
  


    
    const jwt = require('jsonwebtoken');
  

    token = jwt.sign(
  

      
      {id: 1, sub: 'test-sub', email: 'test@test.com', role: 'fleet_manager' },
  

      
      process.env.JWT_SECRET
  

    );
  
  });


  
  beforeEach(() => {

  

    jest.clearAllMocks();
  

  })
  
  ;


  
  const authGet = (endpoint) => {
  
    return request(app)
  
    .get(endpoint)
  
    .set('Authorization', `Bearer ${token}`);
  
  };

  
  
  
  describe('GET /api/safety/scores', () => {
  
  
    test('should return fleet safety scores', async () => {
  
  
      mockPool.query.mockResolvedValue({
        rows: [
  
          {vehicle_id: '1001', safety_score: 85, classification: 'Good', harsh_brakes: 0, harsh_accelerations: 0, harsh_cornering: 0, crashes: 0, total_events: 0, score_date: '2026-07-19' },
  
          {vehicle_id: '1002', safety_score: 70, classification: 'Fair', harsh_brakes: 2, harsh_accelerations: 1, harsh_cornering: 0, crashes: 0, total_events: 3, score_date: '2026-07-19' },
  
        ]
  
      });



      const response = await authGet('/api/safety/scores');
      
      expect(response.status).toBe(200);
      
      expect(response.body.success).toBe(true);
      
      expect(response.body.data.vehicles).toHaveLength(2);



    });




    
    
    test('should handle empty results', async () => {
    
    
      mockPool.query.mockResolvedValue({ rows: [] });

    
      const response = await authGet('/api/safety/scores');
    
      expect(response.status).toBe(200);
    
    
    
      expect(response.body.data.total_vehicles).toBe(0);


      expect(response.body.data.vehicles).toEqual([]);
    
    
    });




    
    test('should handle database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('Database error'));



      const response = await authGet('/api/safety/scores');
      
      expect(response.status).toBe(500);
      
      expect(response.body.success).toBe(false);



    })
    ;
  });





  
  describe('GET /api/safety/scores/:vehicleId', () => {

    
    test('should return safety score for specific vehicle', async () => {
  
      mockPool.query.mockResolvedValue({
  
        rows: [
  
  
          {vehicle_id: '1001', safety_score: 85, classification: 'Good', harsh_brakes: 0, harsh_accelerations: 0, harsh_cornering: 0, crashes: 0, total_events: 0, score_date: '2026-07-19' }
  
        ]
  
      });



      const response = await authGet('/api/safety/scores/1001');
      
      expect(response.status).toBe(200);
      
      expect(response.body.data.vehicle_id).toBe('1001');
      
      expect(response.body.data.safety_score).toBe(85);



    });






    
    test('should return null for vehicle with no data', async () => {
    
    
      mockPool.query.mockResolvedValue({ rows: [] });

    
    
      const response = await authGet('/api/safety/scores/9999');



      expect(response.status).toBe(200);
    
      expect(response.body.data.safety_score).toBeNull();
    
      expect(response.body.data.classification).toBe('No Data');
    
    
    });





    
    test('should handle empty vehicle ID (routes to fleet scores)', async () => {
    
    
    
      mockPool.query.mockResolvedValue({
    
      
      
        rows: [
      
          {vehicle_id: '1001', safety_score: 85, classification: 'Good', harsh_brakes: 0, harsh_accelerations: 0, harsh_cornering: 0, crashes: 0, total_events: 0, score_date: '2026-07-19' }
      
        ]
      
      });


      
      const response = await authGet('/api/safety/scores/');
      
      expect(response.status).toBe(200);
      
      expect(response.body.success).toBe(true);
      
      expect(response.body.data.vehicles).toBeDefined();



    });





    
    test('should handle database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('Database connection failed'));


      
      const response = await authGet('/api/safety/scores/1001');
      
      expect(response.status).toBe(500);
      
      expect(response.body.success).toBe(false);



    });




    
    test('should handle invalid route', async () => {
    
      const response = await authGet('/api/safety/invalid-route');
    
      expect(response.status).toBe(404);
    
    
    });
  });




  
  describe('GET /api/safety/scores/:vehicleId with date parameter', () => {
  
    test('should return score for specific date', async () => {
  
      mockPool.query.mockResolvedValue({
  
        rows: [
  
          {vehicle_id: '1001', safety_score: 90, classification: 'Good', harsh_brakes: 0, harsh_accelerations: 0, harsh_cornering: 0, crashes: 0, total_events: 0, score_date: '2026-07-18' }
  
        ]
  
      });

  
  
  
      const response = await authGet('/api/safety/scores/1001?date=2026-07-18');
  
      expect(response.status).toBe(200);
  
      expect(response.body.data.safety_score).toBe(90);



  
    });




    
    test('should return null for date with no data', async () => {
    
    
      mockPool.query.mockResolvedValue({ rows: [] });

    
      const response = await authGet('/api/safety/scores/1001?date=2026-07-15');
    
      expect(response.status).toBe(200);
    
      expect(response.body.data.safety_score).toBeNull();



    
    });
  });




  
  
  
  describe('GET /api/safety/scores with date range', () => {
  
    test('should return scores for date range', async () => {
  


      mockPool.query.mockResolvedValue({
  
        rows: [
  
          {vehicle_id: '1001', safety_score: 85, classification: 'Good', harsh_brakes: 0, harsh_accelerations: 0, harsh_cornering: 0, crashes: 0, total_events: 0, score_date: '2026-07-19' },
  
          {vehicle_id: '1001', safety_score: 90, classification: 'Good', harsh_brakes: 0, harsh_accelerations: 0, harsh_cornering: 0, crashes: 0, total_events: 0, score_date: '2026-07-18' }
  
  
        ]
      });


      
      
      const response = await authGet('/api/safety/scores?start_date=2026-07-18&end_date=2026-07-19');
      
      expect(response.status).toBe(200);
      
      expect(response.body.data.vehicles).toHaveLength(2);


    })
    ;




    
    test('should handle empty date range', async () => {
    
      mockPool.query.mockResolvedValue({rows: [] });


      
      
      const response = await authGet('/api/safety/scores?start_date=2026-07-01&end_date=2026-07-02');
      
      expect(response.status).toBe(200);
      
      expect(response.body.data.total_vehicles).toBe(0);




    });
  });
});
