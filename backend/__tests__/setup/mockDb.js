const mockQuery = jest.fn();

const mockPool = {
  query: mockQuery,
  connect: jest.fn().mockResolvedValue({
    query: mockQuery,
    release: jest.fn(),
  }),
  end: jest.fn().mockResolvedValue(),
};

function setupMockData() {
  mockQuery.mockReset();
  mockQuery.mockImplementation((sql, params) => {
    const normalizedSql = sql.toLowerCase();

    // --- PostGIS / Cluster Functions ---
    if (normalizedSql.includes('get_frequent_stops_geojson')) {
      return Promise.resolve({
        rows: [
          {
            fc: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: [28.0, -25.0] },
                  properties: { cluster_id: 1, vehicle_id: '1001', point_count: 10 },
                },
              ],
            },
          },
        ],
        rowCount: 1,
      });
    }

    if (normalizedSql.includes('get_frequent_hotspots_geojson')) {
      return Promise.resolve({
        rows: [
          {
            fc: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: [28.0, -25.0] },
                  properties: {
                    cluster_id: 1,
                    event_category: 'green_driving_type',
                    event_detail: 'harsh_braking',
                    event_count: 5,
                  },
                },
              ],
            },
          },
        ],
        rowCount: 1,
      });
    }

    if (normalizedSql.includes('make_circular_geofence_boundary') || normalizedSql.includes('insert into geofences')) {
      return Promise.resolve({
        rows: [
          {
            id: 1,
            name: params?.[0] || 'Test Zone',
            vehicle_id: params?.[1] || '1001',
            boundary: { type: 'Polygon', coordinates: [] },
            trigger_type: 'both',
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
        rowCount: 1,
      });
    }

    // --- Fleet Activity / Dashboard Time-Series Queries ---
    // Fixes the issue where res.body.data.points[0].active_vehicles returns undefined
    if (normalizedSql.includes('fleet_activity') || normalizedSql.includes('active_vehicles') || normalizedSql.includes('telemetry_summary')) {
      return Promise.resolve({
        rows: [
          {
            timestamp: '2026-07-19T10:00:00Z',
            active_vehicles: 5,
            total_events: 12,
            avg_speed: 54.2,
          },
          {
            timestamp: '2026-07-19T11:00:00Z',
            active_vehicles: 8,
            total_events: 4,
            avg_speed: 61.0,
          },
        ],
        rowCount: 2,
      });
    }

    // --- Safety Scores Queries ---
    if (normalizedSql.includes('driver_daily_safety_scores')) {
      // Grouped by score_date
      if (normalizedSql.includes('group by score_date')) {
        return Promise.resolve({
          rows: [
            { score_date: '2026-07-19', avg_score: 85.5, vehicle_count: 10 },
            { score_date: '2026-07-18', avg_score: 82.0, vehicle_count: 10 },
          ],
          rowCount: 2,
        });
      }

      // Fleet Scores (Where 1=1 or unbounded queries)
      if (normalizedSql.includes('where 1=1') || !normalizedSql.includes('where vehicle_id')) {
        return Promise.resolve({
          rows: [
            {
              vehicle_id: 'V001', // Explicitly returns V001 to pass fleetAnalytics assertions
              score_date: '2026-07-19',
              safety_score: 85,
              harsh_brakes: 0,
              harsh_accelerations: 0,
              harsh_cornering: 0,
              crashes: 0,
              total_events: 0,
              classification: 'Good',
            },
            {
              vehicle_id: '1002',
              score_date: '2026-07-19',
              safety_score: 70,
              harsh_brakes: 2,
              harsh_accelerations: 1,
              harsh_cornering: 0,
              crashes: 0,
              total_events: 3,
              classification: 'Fair',
            },
          ],
          rowCount: 2,
        });
      }

      // Single Vehicle Queries (Supports '1001' and 'V001')
      const targetVehicle = params?.[0];
      if (targetVehicle === '1001' || targetVehicle === 'V001') {
        return Promise.resolve({
          rows: [
            {
              vehicle_id: targetVehicle,
              score_date: '2026-07-19',
              safety_score: 85,
              harsh_brakes: 2,
              harsh_accelerations: 1,
              harsh_cornering: 0,
              crashes: 0,
              total_events: 3,
              classification: 'Good',
            },
          ],
          rowCount: 1,
        });
      }

      // Missing or non-existent vehicles
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    // --- Vehicle Events Queries ---
    if (normalizedSql.includes('vehicle_events')) {
      if (normalizedSql.includes('group by event_detail')) {
        return Promise.resolve({
          rows: [
            { event_detail: 'harsh_braking', event_count: 15 },
            { event_detail: 'harsh_acceleration', event_count: 10 },
          ],
          rowCount: 2,
        });
      }

      if (normalizedSql.includes('group by vehicle_id')) {
        return Promise.resolve({
          rows: [
            { vehicle_id: '1001', total_events: 20, harsh_brakes: 10, harsh_accelerations: 5, harsh_cornering: 5 },
            { vehicle_id: '1002', total_events: 15, harsh_brakes: 5, harsh_accelerations: 5, harsh_cornering: 5 },
          ],
          rowCount: 2,
        });
      }

      if (params && (params[0] === '1000' || params[0] === '1001' || params[0] === 'V001')) {
        return Promise.resolve({
          rows: [
            {
              type: 'harsh_braking',
              event_category: 'green_driving_type',
              severity: 'Medium', // Matches your updated expected casing
              speed: 60,
              latitude: '-27.796935',
              longitude: '28.4293083',
              timestamp: new Date(),
            },
          ],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    }

    // --- Trips & Telemetry Queries ---
    if (normalizedSql.includes('get_trip_history')) {
      return Promise.resolve({
        rows: [
          { trip_id: 1, vehicle_id: params?.[0] || '1001', start_time: new Date(), end_time: new Date(), distance_km: 45.5, avg_speed_kmh: 45.5, max_speed_kmh: 85.0, status: 'completed' },
        ],
        rowCount: 1,
      });
    }

    if (normalizedSql.includes('get_trip_replay')) {
      return Promise.resolve({
        rows: [
          { point_time: new Date(), latitude: -25.0, longitude: 28.0, speed_kmh: 60 },
          { point_time: new Date(), latitude: -25.1, longitude: 28.1, speed_kmh: 80 },
        ],
        rowCount: 2,
      });
    }

    if (normalizedSql.includes('clean_telemetry')) {
      return Promise.resolve({
        rows: [
          { vehicle_id: params?.[0] || '1001', time: new Date(), latitude: -25.0, longitude: 28.0, speed: 60, ignition: 'Ignition On', movement: 'Movement On', total_odometer: 10000 },
        ],
        rowCount: 1,
      });
    }

    // --- Geofences Queries ---
    if (normalizedSql.includes('geofence_events')) {
      return Promise.resolve({
        rows: [
          { id: 1, geofence_id: 1, geofence_name: 'Test Zone', vehicle_id: '1001', event_type: 'entry', latitude: -25.0, longitude: 28.0, speed: 60, created_at: new Date() },
        ],
        rowCount: 1,
      });
    }

    if (normalizedSql.includes('update geofences')) {
      return Promise.resolve({
        rows: [{ id: 1, name: 'Updated Zone', vehicle_id: null, trigger_type: 'entry', is_active: true }],
        rowCount: 1,
      });
    }

    if (normalizedSql.includes('delete from geofences')) {
      return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
    }

    if (normalizedSql.includes('from geofences')) {
      if (params && params[0] === '1') {
        return Promise.resolve({
          rows: [{ id: 1, name: 'Test Zone', vehicle_id: null, polygon: '{}', trigger_type: 'both', is_active: true, created_at: new Date(), updated_at: new Date() }],
          rowCount: 1,
        });
      }
      return Promise.resolve({
        rows: [
          { id: 1, name: 'Test Zone', vehicle_id: null, polygon: '{}', trigger_type: 'both', is_active: true, created_at: new Date(), updated_at: new Date() },
        ],
        rowCount: 1,
      });
    }

    if (normalizedSql.includes('cluster_points')) {
      return Promise.resolve({
        rows: [
          { vehicle_id: '1001', cluster_id: 1, centroid_lat: -25.0, centroid_lng: 28.0, point_count: 5, first_seen: new Date(), last_seen: new Date() },
        ],
        rowCount: 1,
      });
    }

    // --- Vehicle Status Queries ---
    if (normalizedSql.includes('from vehicles')) {
      const vId = params?.[0] || '1000';
      return Promise.resolve({
        rows: [
          {
            id: vId,
            device_id: 'CAPSTONE-001',
            status: 'active',
            latitude: '-27.796935',
            longitude: '28.4293083',
            speed: 6,
            total_odometer: 81238116,
            ignition: 'Ignition On',
            movement: 'Movement On',
            last_update: new Date(),
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      });
    }

    // --- Generic SQL Fallbacks ---
    if (normalizedSql.startsWith('select')) {
      return Promise.resolve({ rows: [{}], rowCount: 1 });
    }

    if (/^\s*(insert|update|delete)/i.test(normalizedSql)) {
      return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
    }

    return Promise.resolve({ rows: [{}], rowCount: 1 });
  });
}

module.exports = {
  mockPool,
  mockQuery,
  setupMockData,
};