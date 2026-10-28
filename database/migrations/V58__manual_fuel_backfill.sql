BEGIN;

INSERT INTO trip_fuel_efficiency (
    trip_id, vehicle_id, trip_date, total_distance_km, avg_speed_kmh,
    estimated_fuel_consumed_liters, fuel_efficiency_km_per_liter,
    fuel_efficiency_l_per_100km, road_breakdown
)
SELECT 
    t.trip_id,
    t.vehicle_id,
    DATE(t.start_time),
    COALESCE(t.distance_km, 0),
    COALESCE(t.avg_speed_kmh, 0),
    CASE WHEN COALESCE(t.distance_km, 0) > 0 THEN (t.distance_km / 100) * 8.5 ELSE 0 END,
    CASE WHEN COALESCE(t.distance_km, 0) > 0 THEN t.distance_km / ((t.distance_km / 100) * 8.5) ELSE 0 END,
    8.5,
    '{}'::jsonb
FROM trips t
LEFT JOIN trip_fuel_efficiency f ON f.trip_id = t.trip_id
WHERE t.status = 'completed'
  AND f.trip_id IS NULL
  AND t.start_time IS NOT NULL
  AND t.end_time IS NOT NULL
  AND t.distance_km > 0
ON CONFLICT (trip_id) DO NOTHING;

COMMIT;
