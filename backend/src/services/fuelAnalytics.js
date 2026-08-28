'use strict';

const REPORT_TIMEZONE = 'Africa/Johannesburg';

const PER_VEHICLE_SQL = `
SELECT
    f.vehicle_id,
    COUNT(*)                                              AS trip_count,
    COALESCE(SUM(f.estimated_fuel_consumed_liters), 0)    AS fuel_liters,
    COALESCE(SUM(f.total_distance_km), 0)                 AS fuel_model_distance_km,
    COALESCE(SUM(t.distance_km), 0)                       AS odometer_distance_km,
    COUNT(DISTINCT (t.start_time AT TIME ZONE $4)::date)  AS days_with_fuel_data
FROM trip_fuel_efficiency f
JOIN trips t ON t.trip_id = f.trip_id
WHERE f.vehicle_id = ANY($1::text[])
    AND t.start_time >= $2
    AND t.start_time <  $3
    AND t.status = 'completed'
GROUP BY f.vehicle_id
ORDER BY f.vehicle_id
`;

const ROAD_CLASS_SQL = `
SELECT
    rb.key                 AS road_class,
    SUM(rb.value::numeric) AS distance_km
FROM trip_fuel_efficiency f
JOIN trips t ON t.trip_id = f.trip_id
CROSS JOIN LATERAL jsonb_each_text(COALESCE(f.road_breakdown, '{}'::jsonb)) AS rb(key, value)
WHERE f.vehicle_id = ANY($1::text[])
    AND t.start_time >= $2
    AND t.start_time <  $3
    AND t.status = 'completed'
GROUP BY rb.key
ORDER BY distance_km DESC
`;