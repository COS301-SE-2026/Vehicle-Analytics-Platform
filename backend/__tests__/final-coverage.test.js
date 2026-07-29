


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



describe('Final Coverage Tests - Target 80% Branch Coverage', () => {

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
  
  });


  
  const authGet = (endpoint) => {
  
    return request(app)
  
    .get(endpoint)
  
    .set('Authorization', `Bearer ${token}`);
  
  };


  
  
  
  const authPost = (endpoint, data) => {
  
    return request(app)
  
  
    .post(endpoint)
      
    
    .set('Authorization', `Bearer ${token}`)
  
  
      .send(data);
  
  
    };

    
  
  
  
    const authPut = (endpoint, data) => {
  
      return request(app)
  
      .put(endpoint)
  
      .set('Authorization', `Bearer ${token}`)
  
      .send(data);
  
    };



    
  
  
    const authDelete = (endpoint) => {
  
      return request(app)
  
      .delete(endpoint)
  
  
      .set('Authorization', `Bearer ${token}`);
  };



  describe('Dashboard Controller - Fleet Stats Coverage', () => {

    test('GET /api/dashboard/stats - handles null results', async () => {

      mockPool.query

      .mockResolvedValueOnce({rows: [{ total_vehicles: '0', active_vehicles: '0', idle_vehicles: '0', offline_vehicles: '0', alerts: '0' }] })

      .mockResolvedValueOnce({rows: [{ total_distance: '0' }] })

      .mockResolvedValueOnce({rows: [{ total_users: '0', admins: '0', managers: '0', viewers: '0' }] });


   
      const response = await authGet('/api/dashboard/stats');
   
      expect(response.status).toBe(200);
   
      expect(response.body.data.total_vehicles).toBe(0);
   
   
    });

   
    test('GET /api/dashboard/stats - handles database error', async () => {
   
      mockPool.query.mockRejectedValue(new Error('DB error'));
   
      const response = await authGet('/api/dashboard/stats');
   
      expect(response.status).toBe(500);


    });
  });




  describe('Vehicle Controller - Additional Branches', () => {

    test('GET /api/vehicles/buffer - handles empty results', async () => {

      mockPool.query.mockResolvedValue({rows: [] });

      const response = await authGet('/api/vehicles/buffer');

      expect(response.status).toBe(200);


      expect(response.body.data.vehicles).toEqual({});


    });





    
    test('GET /api/vehicles/buffer - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
      const response = await authGet('/api/vehicles/buffer');
    
      expect(response.status).toBe(500);
    


    });





    
    test('GET /api/vehicles/:id - handles date parameter with no events', async () => {
    
      mockPool.query
    
      .mockResolvedValueOnce({rows: [{ id: '1001', device_id: 'DEV-001', created_at: '2024-01-01', status: 'active', latitude: '-25.0', longitude: '28.0', speed: 50, total_odometer: '1000', ignition: 'On', movement: 'On', last_update: new Date() }] })
    
      .mockResolvedValueOnce({rows: [] })
    
      .mockResolvedValueOnce({rows: [] });


      
      
      
      const response = await authGet('/api/vehicles/1001?date=2024-01-01');
      
      expect(response.status).toBe(200);
      
      expect(response.body.data.recent_events).toEqual([]);



    })
    ;
  });







  describe('Trip Controller - Additional Branches', () => {

    test('GET /api/trips/history/:id - handles vehicle with no trips', async () => {

      mockPool.query.mockResolvedValue({rows: [] });


      const response = await authGet('/api/trips/history/1001?limit=10');

      expect(response.status).toBe(200);

      expect(response.body.data.trips).toEqual([]);



    });


    test('GET /api/trips/history/:id - handles database error', async () => {
    
    
      mockPool.query.mockRejectedValue(new Error('DB error'));


      const response = await authGet('/api/trips/history/1001');
    
    
      expect(response.status).toBe(500);



    });
  });






  describe('Geofence Controller - discoverFrequentEvents Coverage', () => {


    
    test.skip('GET /api/geofences/discover/events - handles empty results', async () => {
    

      mockPool.query.mockResolvedValue({rows: [] });



      
      const response = await authGet('/api/geofences/discover/events');
      
      
      expect(response.status).toBe(200);
      
      
      expect(response.body.data.total_hotspots).toBe(0);
    
    
    
    });




    
    test.skip('GET /api/geofences/discover/events - with all parameters', async () => {
    
      mockPool.query.mockResolvedValue({
    
    
        rows: [
          {cluster_id: 1, event_category: 'green_driving_type', event_detail: 'harsh_braking', event_count: 5, vehicle_count: 2, centroid_lat: '-25.0', centroid_lng: '28.0', first_seen: '2024-01-01', last_seen: '2024-01-02' }
    
    
        ]
      });
    
    
      const response = await authGet('/api/geofences/discover/events?event_category=green_driving_type&event_detail=harsh_braking&vehicle_id=1001&days=7&radius_km=0.5&min_points=3');
    
      expect(response.status).toBe(200);
    
      expect(response.body.data.total_hotspots).toBe(1);
    
    });


    
    test('GET /api/geofences/discover/events - handles database error', async () => {
    
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
      const response = await authGet('/api/geofences/discover/events');
    
    
      expect(response.status).toBe(500);
    
    });


    
  
    
    
  
    test.skip('GET /api/geofences/discover/stops - with all parameters', async () => {
  
      mockPool.query.mockResolvedValue({
  
        
        
        rows: [
    

    
          {vehicle_id: '1001', cluster_id: 1, point_count: 10, first_seen: '2024-01-01', last_seen: '2024-01-02', centroid_lat: '-25.0', centroid_lng: '28.0' }
        ]
    
      });
    
      const response = await authGet('/api/geofences/discover/stops?vehicle_id=1001&days=7&radius_km=0.5&min_points=3');
    
      expect(response.status).toBe(200);
    
    
      expect(response.body.data.total_clusters).toBe(1);



    });

    
    
    
  
 
    test('POST /api/geofences/discover/create - with radius parameter', async () => {
 
      
    
      mockPool.query.mockResolvedValue({
      
       
       
       
        rows: [{id: 1, name: 'Test Zone', vehicle_id: '1001', boundary: { type: 'Polygon', coordinates: [] }, trigger_type: 'both', created_at: '2024-01-01', updated_at: '2024-01-01' }]
    

      })
      ;
      
      const response = await authPost('/api/geofences/discover/create', {
      
      
        name: 'Test Zone',
        vehicle_id: '1001',
      
      
        center_lat: '-25.0',
      
        center_lng: '28.0',
      
        radius_km: 0.5
      
      });
      



      expect(response.status).toBe(201);



    });





    
    test('POST /api/geofences/discover/create - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
      const response = await authPost('/api/geofences/discover/create', {
    
    
    
        name: 'Test Zone',
    
        vehicle_id: '1001',
    
        center_lat: '-25.0',
    
        center_lng: '28.0'
    
      });
    
    
    
      expect(response.status).toBe(500);
    
    });


    
    
    

    
    test('PUT /api/geofences/:id - updates only name', async () => {
    


      
      
      mockPool.query.mockResolvedValue({
        rows: [{id: 1, name: 'Updated Zone', vehicle_id: null, boundary: { type: 'Polygon', coordinates: [] }, trigger_type: 'both', created_at: '2024-01-01', updated_at: '2024-01-01' }]
      
      
      });



      const response = await authPut('/api/geofences/1', { name: 'Updated Zone' });
      
      
      expect(response.status).toBe(200);



    })
    ;




    
    test('PUT /api/geofences/:id - updates only trigger_type', async () => {
    
      mockPool.query.mockResolvedValue({
    
        rows: [{id: 1, name: 'Test Zone', vehicle_id: null, boundary: { type: 'Polygon', coordinates: [] }, trigger_type: 'entry', created_at: '2024-01-01', updated_at: '2024-01-01' }]
    
      });
    
      const response = await authPut('/api/geofences/1', { trigger_type: 'entry' });
    
      expect(response.status).toBe(200);



    
    });

    
    
    
    
  
  
  
    test('POST /api/geofences - with vehicle_id', async () => {
  
      mockPool.query.mockResolvedValue({
        
        
        rows: [{id: 1, name: 'Test Zone', vehicle_id: '1001', boundary: { type: 'Polygon', coordinates: [] }, trigger_type: 'both', created_at: '2024-01-01', updated_at: '2024-01-01' }]
  
  
      });



      const response = await authPost('/api/geofences', {
  
        name: 'Test Zone',
  
        vehicle_id: '1001',
  
        boundary: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] },
  
        trigger_type: 'both'
  
      });
  
      expect(response.status).toBe(201);
  
    });




    
   
    
    test('GET /api/geofences/events - with geofence_id filter', async () => {
   
      
      mockPool.query.mockResolvedValue({
    

        
        rows: [
    



          
          {id: 1, geofence_id: 1, geofence_name: 'Test Zone', vehicle_id: '1001', event_type: 'entry', latitude: '-25.0', longitude: '28.0', speed: 50, created_at: '2024-01-01' }
        
        
        ]
      });
      
      
      const response = await authGet('/api/geofences/events?geofence_id=1&limit=10');
      
      expect(response.status).toBe(200);



    });





    
    
    test('GET /api/geofences/events - with vehicle_id filter', async () => {
    
      mockPool.query.mockResolvedValue({
    
        rows: [
    
          {id: 1, geofence_id: 1, geofence_name: 'Test Zone', vehicle_id: '1001', event_type: 'entry', latitude: '-25.0', longitude: '28.0', speed: 50, created_at: '2024-01-01' }
    
    
        ]
    
      });


      const response = await authGet('/api/geofences/events?vehicle_id=1001&limit=10');
    
    
      expect(response.status).toBe(200);



    });
  });





 
 
  describe('Vehicle List - Stats Coverage', () => {
   
    test('GET /api/vehicles - handles avg_safety_score as null', async () => {
 


 
      
      mockPool.query
 
      
      
      .mockResolvedValueOnce({rows: [{ id: '1001', status: 'moving', current_speed: 50, latitude: '-25', longitude: '28', last_updated: new Date(), safety_score: null, distance_today: '10', has_alert: false, is_speeding: false }] })
 

      
      
      .mockResolvedValueOnce({rows: [{ total: '1', moving: '1', idle: '0', offline: '0', alerts: '0', speeding: '0', avg_safety_score: null }] })
        .mockResolvedValueOnce({rows: [{ id: '1001', safety_score: null }] });


        

      


      

        const response = await authGet('/api/vehicles/');
      


        expect(response.status).toBe(200);
      

      


        expect(response.body.data.stats.avg_safety_score).toBeNull();
    });

  });
});
