



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



describe('Branch Coverage Tests', () => {

  let token;


  
  beforeAll(() => {
  
    const jwt = require('jsonwebtoken');
  
    token = jwt.sign(
  
      {id: 1, sub: 'test-sub', email: 'test@test.com', role: 'fleet_manager'},
  
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



  

  describe('Vehicle Controller Branches', () => {

    
    
    
    test('GET /api/vehicles/locations - handles null positions', async () => {
    
      mockPool.query.mockResolvedValue({
    
    
        rows: [
          {id: '1001', device_id: 'DEV-001', status: 'offline', latitude: null, longitude: null, speed: null, total_odometer: null, ignition: null, movement: null, last_update: null, distance_today: '0'}
    
        ]
    
      });


      const response = await authGet('/api/vehicles/locations');
      
      expect(response.status).toBe(200);
      
      expect(response.body.data.vehicles[0].status).toBe('offline');



    })
    ;




    
    test('GET /api/vehicles/locations - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
      const response = await authGet('/api/vehicles/locations');
    
      expect(response.status).toBe(500);
    
    });




    
    test('GET /api/vehicles/:id - handles no current trip', async () => {
    
    
      mockPool.query
    
      .mockResolvedValueOnce({rows: [{ id: '1001', device_id: 'DEV-001', created_at: '2024-01-01', status: 'active', latitude: '-25.0', longitude: '28.0', speed: 50, total_odometer: '1000', ignition: 'On', movement: 'On', last_update: new Date() }]})
    
    
      .mockResolvedValueOnce({rows: []})
        .mockResolvedValueOnce({rows: []});


        
      
      
        const response = await authGet('/api/vehicles/1001');
      
        expect(response.status).toBe(200);
      
        expect(response.body.data.current_trip).toBeNull();



    });




    
    test('GET /api/vehicles/:id - handles date parameter', async () => {
    
      mockPool.query
    
    
      .mockResolvedValueOnce({rows: [{ id: '1001', device_id: 'DEV-001', created_at: '2024-01-01', status: 'active', latitude: '-25.0', longitude: '28.0', speed: 50, total_odometer: '1000', ignition: 'On', movement: 'On', last_update: new Date() }] })
    
      .mockResolvedValueOnce({rows: [{ type: 'harsh_braking', event_category: 'green_driving_type', speed: 50, latitude: '-25.0', longitude: '28.0', timestamp: new Date() }] })
    
      .mockResolvedValueOnce({rows: [] });


      
      const response = await authGet('/api/vehicles/1001?date=2024-01-01');
      
      expect(response.status).toBe(200);



    });




    
    test('GET /api/vehicles/:id - handles vehicle not found', async () => {
    
    
      mockPool.query.mockResolvedValue({rows: [] });
    
      const response = await authGet('/api/vehicles/9999');


      expect(response.status).toBe(404);
    
    });
  });








  describe('Safety Controller Branches', () => {

    test('GET /api/safety/scores - handles date range with no data', async () => {


      mockPool.query.mockResolvedValue({ rows: [] });

      const response = await authGet('/api/safety/scores?start_date=2024-01-01&end_date=2024-01-02');

      expect(response.status).toBe(200);

      expect(response.body.data.total_vehicles).toBe(0);

    });



    test('GET /api/safety/scores - handles specific date with no data', async () => {
    
      mockPool.query.mockResolvedValue({ rows: [] });
    
    
      const response = await authGet('/api/safety/scores?date=2024-01-01');


      expect(response.status).toBe(200);
    
      expect(response.body.data.total_vehicles).toBe(0);
    
    });


    
    test('GET /api/safety/scores/:id - handles date range', async () => {
    
    
      mockPool.query.mockResolvedValue({
        rows: [
    
          {vehicle_id: '1001', safety_score: 85, classification: 'Good', harsh_brakes: 0, harsh_accelerations: 0, harsh_cornering: 0, crashes: 0, total_events: 0, score_date: '2024-01-01' }
    
        ]
    
      });
    
    
      const response = await authGet('/api/safety/scores/1001?start_date=2024-01-01&end_date=2024-01-02');
    
    
      expect(response.status).toBe(200);



    });

    
    
    
    test('GET /api/safety/scores/:id - handles null safety_score', async () => {
    
      mockPool.query.mockResolvedValue({
    
        rows: [
    
          {vehicle_id: '1001', safety_score: null, classification: null, harsh_brakes: 0, harsh_accelerations: 0, harsh_cornering: 0, crashes: 0, total_events: 0, score_date: '2024-01-01' }
    
        ]
    
      });
    
    
    
      const response = await authGet('/api/safety/scores/1001');
    
    
      expect(response.status).toBe(200);
    
    
      expect(response.body.data.safety_score).toBeNull();


    });





    
    test('GET /api/safety/scores/:id - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
    
      const response = await authGet('/api/safety/scores/1001');
    
      expect(response.status).toBe(500);


    });
  });








  describe('Trip Controller Branches', () => {

    test('GET /api/trips/history/:id - handles missing vehicle ID', async () => {

      const response = await authGet('/api/trips/history/');

      expect(response.status).toBe(404);


    });



    test('GET /api/trips/history/:id - handles before parameter', async () => {

      mockPool.query.mockResolvedValue({

        rows: [

          {trip_id: 1, vehicle_id: '1001', start_time: '2024-01-01', end_time: '2024-01-01', distance_km: 10, avg_speed_kmh: 50, max_speed_kmh: 80, status: 'completed', safety_score: 100 }

        ]

      });

      const response = await authGet('/api/trips/history/1001?before=2024-01-01&limit=5');

      expect(response.status).toBe(200);



    });



    
    test('GET /api/trips/replay/:id - handles missing trip ID', async () => {


      const response = await authGet('/api/trips/replay/');
    
      expect(response.status).toBe(404);
    
    });





    
    test('GET /api/trips/replay/:id - handles trip not found', async () => {
    
      mockPool.query.mockResolvedValue({ rows: [] });
    
    
      const response = await authGet('/api/trips/replay/9999');
    
      expect(response.status).toBe(404);



    });

    
    
    
    
    test('GET /api/trips/replay/:id - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
      const response = await authGet('/api/trips/replay/1');
    
      expect(response.status).toBe(500);



    
    });
  });




  describe('Dashboard Controller Branches', () => {

    test('GET /api/dashboard/activity - handles invalid range', async () => {

      const response = await authGet('/api/dashboard/activity?range=invalid');

      expect(response.status).toBe(400);


    });


    
    test('GET /api/dashboard/activity - handles week range', async () => {
    
    
      mockPool.query.mockResolvedValue({
        rows: [
    
          {bucket: '2024-01-01', active_vehicles: 5 },
    
          {bucket: '2024-01-02', active_vehicles: 3 }
    
        ]
    
      });
    
      const response = await authGet('/api/dashboard/activity?range=week');
    
      expect(response.status).toBe(200);
    
    });





    
    test('GET /api/dashboard/activity - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
      const response = await authGet('/api/dashboard/activity?range=day');
    
      expect(response.status).toBe(500);
    
    
    });




    
    test('GET /api/dashboard/kpis - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
    
      const response = await authGet('/api/dashboard/kpis');
    
      expect(response.status).toBe(500);
    });





    
    
    test('GET /api/dashboard/alerts - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
      const response = await authGet('/api/dashboard/alerts');
    
      expect(response.status).toBe(500);
    
    });




    
    
    test('GET /api/dashboard/total-distance - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
      const response = await authGet('/api/dashboard/total-distance');
    
    
      expect(response.status).toBe(500);


    });
  });





 
 
  describe('Geofence Controller Branches', () => {
 
 
    test('POST /api/geofences - handles missing boundary', async () => {

      const response = await authPost('/api/geofences', {name: 'Test Zone' });
 
      expect(response.status).toBe(400);
 
 
    });

 
    test('POST /api/geofences - handles missing name', async () => {
 
      const response = await authPost('/api/geofences', { boundary: {type: 'Polygon', coordinates: [] } });
 
      expect(response.status).toBe(400);
 
    });


    
    
    test('POST /api/geofences - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));

      const response = await authPost('/api/geofences', {name: 'Test', boundary: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] } });
    
    
      expect(response.status).toBe(500);
    
    });


    test('GET /api/geofences - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
      const response = await authGet('/api/geofences');
    
      expect(response.status).toBe(500);
    
    });


    
    test('GET /api/geofences/:id - handles not found', async () => {
    
      mockPool.query.mockResolvedValue({rows: [] });
    
    
      const response = await authGet('/api/geofences/999');


      expect(response.status).toBe(404);
    


    });

    
    test('GET /api/geofences/:id - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
    
      const response = await authGet('/api/geofences/1');


      expect(response.status).toBe(500);
    
    
    
    
    });



    
    test('PUT /api/geofences/:id - handles not found', async () => {
    
      mockPool.query.mockResolvedValue({ rows: [] });
    
      const response = await authPut('/api/geofences/999', {name: 'Updated' });
    
      expect(response.status).toBe(404);


    
    });

    
    
    test('DELETE /api/geofences/:id - handles not found', async () => {
    
      mockPool.query.mockResolvedValue({rows: [] });
    
    
      const response = await authDelete('/api/geofences/999');

      expect(response.status).toBe(404);
    
    
    });




    
    test('GET /api/geofences/events - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
      const response = await authGet('/api/geofences/events');
    
    
      expect(response.status).toBe(500);



    });
  })
  ;







  describe('Vehicles Controller Branches', () => {

    test('GET /api/vehicles/:id/trips - handles empty trips', async () => {


      mockPool.query

      .mockResolvedValueOnce({rows: [] })

      .mockResolvedValueOnce({rows: [{avg_safety_score: 0, total_distance: 0, total_trips: 0 }] });
      


      const response = await authGet('/api/vehicles/1001/trips');

      expect(response.status).toBe(200);


      expect(response.body.data.trips).toEqual([]);




    });




    
    test('GET /api/vehicles/:id/trips - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
    
      const response = await authGet('/api/vehicles/1001/trips');


      expect(response.status).toBe(500);


    
    });




    
    test('GET /api/vehicles/:id/safety-trend - handles empty trend', async () => {
    
      mockPool.query.mockResolvedValue({ rows: [] });
    
      const response = await authGet('/api/vehicles/1001/safety-trend?days=7');
    
      expect(response.status).toBe(200);
    
      expect(response.body.data.total_days).toBe(0);


    
    });




    
    test('GET /api/vehicles/:id/safety-trend - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
      const response = await authGet('/api/vehicles/1001/safety-trend');
    
    
      expect(response.status).toBe(500);


      
    });
  });






  describe('Vehicle List Filters', () => {

    test('GET /api/vehicles - handles status filter', async () => {

      mockPool.query

      .mockResolvedValueOnce({rows: [{ id: '1001', status: 'moving', current_speed: 50, latitude: '-25', longitude: '28', last_updated: new Date(), safety_score: 85, distance_today: '10', has_alert: false, is_speeding: false }] })

      .mockResolvedValueOnce({rows: [{ total: '1', moving: '1', idle: '0', offline: '0', alerts: '0', speeding: '0', avg_safety_score: '85' }] })

      .mockResolvedValueOnce({rows: [{ id: '1001', safety_score: '85' }] });


      
      
      const response = await authGet('/api/vehicles/?status=moving');
      
      expect(response.status).toBe(200);



    })
    ;





    
    test('GET /api/vehicles - handles min_score filter', async () => {
    
      mockPool.query
    
      .mockResolvedValueOnce({rows: [{ id: '1001', status: 'moving', current_speed: 50, latitude: '-25', longitude: '28', last_updated: new Date(), safety_score: 85, distance_today: '10', has_alert: false, is_speeding: false }] })
    
      .mockResolvedValueOnce({rows: [{ total: '1', moving: '1', idle: '0', offline: '0', alerts: '0', speeding: '0', avg_safety_score: '85' }] })
    
      .mockResolvedValueOnce({rows: [{ id: '1001', safety_score: '85' }] });


      
      const response = await authGet('/api/vehicles/?min_score=80');
      
      expect(response.status).toBe(200);



    })
    ;




    
    test('GET /api/vehicles - handles max_score filter', async () => {
    
      mockPool.query
    
    
      .mockResolvedValueOnce({rows: [{ id: '1001', status: 'moving', current_speed: 50, latitude: '-25', longitude: '28', last_updated: new Date(), safety_score: 85, distance_today: '10', has_alert: false, is_speeding: false }] })
    
      .mockResolvedValueOnce({rows: [{ total: '1', moving: '1', idle: '0', offline: '0', alerts: '0', speeding: '0', avg_safety_score: '85' }] })
    
      .mockResolvedValueOnce({rows: [{ id: '1001', safety_score: '85' }] });

    
    
      const response = await authGet('/api/vehicles/?max_score=90');
      expect(response.status).toBe(200);
    
    
    });





    
    test('GET /api/vehicles - handles alerts filter', async () => {
    
    
      mockPool.query
    
      .mockResolvedValueOnce({rows: [{ id: '1001', status: 'moving', current_speed: 50, latitude: '-25', longitude: '28', last_updated: new Date(), safety_score: 85, distance_today: '10', has_alert: true, is_speeding: false }] })
    
      .mockResolvedValueOnce({rows: [{ total: '1', moving: '1', idle: '0', offline: '0', alerts: '1', speeding: '0', avg_safety_score: '85' }] })
    
      .mockResolvedValueOnce({rows: [{ id: '1001', safety_score: '85' }] });


      
      const response = await authGet('/api/vehicles/?alerts=true');
      
      expect(response.status).toBe(200);



    })
    ;





    
    test('GET /api/vehicles - handles no lowest scoring vehicle', async () => {
    
    
      mockPool.query
    
      .mockResolvedValueOnce({rows: [{ id: '1001', status: 'moving', current_speed: 50, latitude: '-25', longitude: '28', last_updated: new Date(), safety_score: null, distance_today: '10', has_alert: false, is_speeding: false }] })
    
      .mockResolvedValueOnce({rows: [{ total: '1', moving: '1', idle: '0', offline: '0', alerts: '0', speeding: '0', avg_safety_score: null }] })
    
      .mockResolvedValueOnce({rows: [] });


      
      const response = await authGet('/api/vehicles/');
      
      expect(response.status).toBe(200);
      
      expect(response.body.data.stats.lowest_scoring_vehicle).toBeNull();

      
    });





    
    test('GET /api/vehicles - handles database error', async () => {
    
      mockPool.query.mockRejectedValue(new Error('DB error'));
    
      const response = await authGet('/api/vehicles/');
    
      expect(response.status).toBe(500);
    
    });
  });
});

