BEGIN;

INSERT INTO fuel_efficiency_history (
    vehicle_id, period_start, period_end, period_type,
    total_distance, total_fuel, avg_efficiency, road_class_breakdown, trip_count
)
SELECT
    tfe.vehicle_id, tfe.trip_date, tfe.trip_date + INTERVAL '1 day', 'day',
    SUM(tfe.total_distance_km), SUM(tfe.estimated_fuel_consumed_liters),
    CASE WHEN SUM(tfe.estimated_fuel_consumed_liters) > 0 
         THEN SUM(tfe.total_distance_km) / SUM(tfe.estimated_fuel_consumed_liters) ELSE 0 END,
    jsonb_build_object('motorway', 0, 'primary', 0, 'residential', 0, 'other', 0),
    COUNT(*)
FROM trip_fuel_efficiency tfe
WHERE tfe.total_distance_km > 0
GROUP BY tfe.vehicle_id, tfe.trip_date
ON CONFLICT (vehicle_id, period_start, period_type) DO UPDATE
SET total_distance = EXCLUDED.total_distance, total_fuel = EXCLUDED.total_fuel,
    avg_efficiency = EXCLUDED.avg_efficiency, road_class_breakdown = EXCLUDED.road_class_breakdown,
    trip_count = EXCLUDED.trip_count;

COMMIT;
