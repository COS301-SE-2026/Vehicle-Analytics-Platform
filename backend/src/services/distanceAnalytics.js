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


function safeRatio(numerator, denominator){
    if (!denominator) return null;
    return numerator / denominator;
}


function percent(numerator, denominator, dp = 2){
    const ratio = safeRatio(numerator, denominator);
    return ratio === null ? null : round(ratio * 100, dp);
}


function deriveVehicle(row, periodDays){
    const distanceKm = toNumber(row.distance_km);
    const durationSeconds = toNumber(row.duration_seconds);
    const movingSeconds = toNumber(row.moving_seconds);
    const tripCount = toNumber(row.trip_count);
    const daysActive = toNumber(row.days_active);

    const idleSeconds = Math.max(0, durationSeconds - movingSeconds);

    return {
        vehicleId: row.vehicle_id,
        tripCount,
        distanceKm: round(distanceKm),
        durationSeconds,
        movingSeconds: Math.round(movingSeconds),
        idleSeconds: Math.round(idleSeconds),
        idleRatio: round(safeRatio(idleSeconds, durationSeconds), 4),
        avgTripDistanceKm: round(safeRatio(distanceKm, tripCount)),
        avgMovingSpeedKmh: round(safeRatio(distanceKm, movingSeconds / SECONDS_PER_HOUR)),
        avgJourneySpeedKmh: round(safeRatio(distanceKm, durationSeconds / SECONDS_PER_HOUR)),
        maxSpeedKmh: row.max_speed_kmh === null ? null : toNumber(row.max_speed_kmh),
        daysActive,
        utilisationPct: percent(daysActive, periodDays),
    };
}


function summarise(vehicles, vehiclesInScope, periodDays){
    const totalDistanceKm = vehicles.reduce((sum, v) => sum + (v.distanceKm || 0), 0);
    const totalDurationSeconds = vehicles.reduce((sum, v) => sum + v.durationSeconds, 0);
    const totalMovingSeconds = vehicles.reduce((sum, v) => sum + v.movingSeconds, 0);
    const totalIdleSeconds = vehicles.reduce((sum, v) => sum + v.idleSeconds, 0);
    const tripCount = vehicles.reduce((sum, v) => sum + v.tripCount, 0);
    const totalDaysActive = vehicles.reduce((sum, v) => sum + v.daysActive, 0);

    const maxSpeeds = vehicles.map((v) => v.maxSpeedKmh).filter((s) => s !== null);

    return {
        totalDistanceKm: round(totalDistanceKm),
        totalDurationSeconds, 
        totalMovingSeconds, 
        totalIdleSeconds,
        idleRatio: round(safeRatio(totalIdleSeconds, totalDurationSeconds), 4), 
        tripCount,
        avgTripDistanceKm: round(safeRatio(totalDistanceKm, tripCount)),
        avgMovingSpeedKmh: round(safeRatio(totalDistanceKm, totalMovingSeconds / SECONDS_PER_HOUR)),
        avgJourneySpeedKmh: round(safeRatio(totalDistanceKm, totalDurationSeconds / SECONDS_PER_HOUR)),
        maxSpeedKmh: maxSpeeds.length ? Math.max(...maxSpeeds) : null,
        activeVehicles: vehicles.length,
        inactiveVehicles: Math.max(0, vehiclesInScope - vehicles.length), vehiclesInScope,
        utilisationPct: percent(totalDaysActive, vehiclesInScope * periodDays),
        periodDays,
    };
}


function emptyResult(periodDays){
    return {
        summary: summarise([], 0, periodDays),
        vehicles: [],
    };
}


async function getDistanceAnalytics(db, vehicleIds, period){
    if (!db || typeof db.query !== 'function') {
        throw new Error('getDistanceAnalytics requires a pg client or pool');
    }
    if (!Array.isArray(vehicleIds)) {
        throw new Error('getDistanceAnalytics requires a vehicleIds array from scopeResolver');
    }
    if (!period || !(period.from instanceof Date) || !(period.to instanceof Date)) {
        throw new Error('getDistanceAnalytics requires a resolved period with Date bounds');
    }

    const periodDays = toNumber(period.days, 0);

    if (!vehicleIds.length) return emptyResult(periodDays);

    const result = await db.query(PER_VEHICLE_SQL, [
        vehicleIds,
        period.from,
        period.to,
        REPORT_TIMEZONE,
    ]);

    const vehicles = result.rows.map((row) => deriveVehicle(row, periodDays));

    return {
        summary: summarise(vehicles, vehicleIds.length, periodDays),
        vehicles,
    };
}


module.exports = {
    getDistanceAnalytics,
    REPORT_TIMEZONE,
    _deriveVehicle: deriveVehicle,
    _summarise: summarise,
};