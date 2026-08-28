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


function toNumber(value, fallback = 0) {
    if (value === null || value === undefined) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
    
}

function round(value, dp = 2){
    if (value === null || value === undefined || !Number.isFinite(value)) return null;
    const factor = 10 ** dp;
    return Math.round(value * factor) / factor;
}

function safeRatio(numerator, denominator){
    if (!denominator) return null;
    return numerator / denominator;
}

function percent(numerator, denominator, dp = 2){
    const ratio = safeRatio(numerator, denominator);
    return ratio === null ? null : round(ratio * 100, dp);
}

function efficiency(distanceKm, fuelLiters){
    return {
        avgEfficiencyKmPerL: round(safeRatio(distanceKm, fuelLiters)),
        avgConsumptionLPer100Km: round(safeRatio(fuelLiters * 100, distanceKm)),
    };
}