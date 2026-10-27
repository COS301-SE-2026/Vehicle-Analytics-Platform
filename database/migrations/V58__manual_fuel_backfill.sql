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
    COALESCE(calc.distance, 0),
    COALESCE(calc.avg_speed, 0),
    CASE WHEN COALESCE(calc.distance, 0) > 0 THEN (calc.distance / 100) * 8.5 ELSE 0 END,
    CASE WHEN COALESCE(calc.distance, 0) > 0 THEN calc.distance / ((calc.distance / 100) * 8.5) ELSE 0 END,
    8.5,
    '{}'::jsonb
FROM trips t
CROSS JOIN LATERAL (
    SELECT 
        SUM(
            ST_Distance(
                ST_SetSRID(ST_MakePoint(ct.longitude, ct.latitude), 4326),
                LAG(ST_SetSRID(ST_MakePoint(ct.longitude, ct.latitude), 4326)) OVER (ORDER BY ct.time)
            ) * 111.32
        ) AS distance,
        AVG(ct.speed) AS avg_speed
    FROM clean_telemetry ct
    WHERE ct.vehicle_id = t.vehicle_id
      AND ct.time BETWEEN t.start_time AND t.end_time
) calc
LEFT JOIN trip_fuel_efficiency f ON f.trip_id = t.trip_id
WHERE t.status = 'completed'
  AND f.trip_id IS NULL
  AND t.start_time IS NOT NULL
  AND t.end_time IS NOT NULL
  AND calc.distance > 0
ON CONFLICT (trip_id) DO NOTHING;

COMMIT;
