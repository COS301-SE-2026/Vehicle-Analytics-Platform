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



function deriveVehicle(row){
    const fuelLiters = toNumber(row.fuel_liters);
    const fuelModelDistanceKm = toNumber(row.fuel_model_distance_km);



    return {
        vehicleId: row.vehicle_id,
        tripsWithFuelData: toNumber(row.trip_count),
        daysWithFuelData: toNumber(row.days_with_fuel_data),
        fuelLiters: round(fuelLiters),
        fuelModelDistanceKm: round(fuelModelDistanceKm),
        odometerDistanceKm: round(toNumber(row.odometer_distance_km)),
        ...efficiency(fuelModelDistanceKm, fuelLiters),
        estimated: true,
  };

}

function summarise(vehicles, vehiclesInScope, roadClassDistanceKm) {
    const totalFuelLiters = vehicles.reduce((s, v) => s + (v.fuelLiters || 0), 0);
    const totalFuelModelDistanceKm = vehicles.reduce((s, v) => s + (v.fuelModelDistanceKm || 0), 0);
    const totalOdometerDistanceKm = vehicles.reduce((s, v) => s + (v.odometerDistanceKm || 0), 0);




    return {
        tripsWithFuelData: vehicles.reduce((s, v) => s + v.tripsWithFuelData, 0),
        totalFuelLiters: round(totalFuelLiters),
        totalFuelModelDistanceKm: round(totalFuelModelDistanceKm),
        totalOdometerDistanceKm: round(totalOdometerDistanceKm),
        distanceVariancePct: percent(
        totalFuelModelDistanceKm - totalOdometerDistanceKm, totalOdometerDistanceKm
    ),
    ...efficiency(totalFuelModelDistanceKm, totalFuelLiters),
    vehiclesWithFuelData: vehicles.length,
    vehiclesInScope,
    vehiclesWithoutFuelData: Math.max(0, vehiclesInScope - vehicles.length),
    roadClassDistanceKm,
    estimated: true,
  };

}

function emptyResult(){
    return { summary: summarise([], 0, {}),  vehicles: [] };

}

async function getFuelAnalytics(db, vehicleIds, period){
    if (!db || typeof db.query !== 'function'){
        throw new Error('getFuelAnalytics requires a pg client or pool');
    }
    if (!Array.isArray(vehicleIds)){
        throw new Error('getFuelAnalytics requires a vehicleIds array from scopeResolver');
    }
    if (!period || !(period.from instanceof Date) || !(period.to instanceof Date)){
        throw new Error('getFuelAnalytics requires a resolved period with Date bounds');
    }

    if (!vehicleIds.length) return emptyResult();
    
    const params = [vehicleIds, period.from, period.to, REPORT_TIMEZONE];
    const [perVehicle, roadClasses] = await Promise.all([
        db.query(PER_VEHICLE_SQL, params),
        db.query(ROAD_CLASS_SQL, params.slice(0, 3)),
    ]);

    const vehicles = perVehicle.rows.map(deriveVehicle);
    const roadClassDistanceKm = {};
    roadClasses.rows.forEach((row) => {
        roadClassDistanceKm[row.road_class] = round(toNumber(row.distance_km));
    });

    return {
        summary: summarise(vehicles, vehicleIds.length, roadClassDistanceKm),
        vehicles,
    };


}



module.exports = {
    getFuelAnalytics,
    REPORT_TIMEZONE,
    _deriveVehicle: deriveVehicle,
    _summarise: summarise,
    _efficiency: efficiency,

};

