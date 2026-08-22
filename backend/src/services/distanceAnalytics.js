'use strict';


const REPORT_TIMEZONE = 'Africa/Johannesburg';
const SECONDS_PER_HOUR = 3600;


const PER_VEHICLE_SQL = `
SELECT
    vehicle_id,
    COUNT(*) AS trip_count,
    COALESCE(SUM(distance_km), 0) AS distance_km,
    COALESCE(SUM(duration_seconds), 0) AS duration_seconds,
    COALESCE(SUM(distance_km / NULLIF(avg_speed_kmh, 0)), 0) * ${SECONDS_PER_HOUR} AS moving_seconds,
    MAX(max_speed_kmh) AS max_speed_kmh,
    COUNT(DISTINCT (start_time AT TIME ZONE $4)::date) AS days_active  
FROM trips
WHERE vehicle_id = ANY($1::text[]) AND start_time >= $2 AND start_time < $3 AND status = 'completed'
GROUP BY vehicle_id
ORDER BY vehicle_id` ;

// type coercsion
function toNumber(value, fallback = 0){
    if (value === null || value === undefined) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
 

function round(value, dp = 2){
    if (value === null || value === undefined || !Number.isFinite(value)) return null;
    const factor = 10 ** dp;
    return Math.round(value * factor) / factor;
}