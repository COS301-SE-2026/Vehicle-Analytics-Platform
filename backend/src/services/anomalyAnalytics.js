'use strict';

const { _EVENT_FILTER: EVENT_FILTER, REPORT_TIMEZONE } = require('./safetyAnalytics');

const KM_NORMALISER = 100;

const MIN_SPEED_SAMPLES = 30;

const EXPOSURE_SQL = `
SELECT
    vehicle_id,
    COALESCE(SUM(distance_km), 0)                            AS distance_km,
    COUNT(*)                                                 AS trip_count,
    COUNT(DISTINCT (start_time AT TIME ZONE $4)::date)       AS active_days
FROM trips
WHERE vehicle_id = ANY($1::text[])
    AND start_time >= $2
    AND start_time <  $3
    AND status = 'completed'
    AND (end_odometer IS NULL OR start_odometer IS NULL OR end_odometer >= start_odometer)
GROUP BY vehicle_id
`;

const INCIDENT_SQL = `
WITH flagged AS (
    SELECT
        e.vehicle_id,
        e.event_category,
        e.event_detail,
        CASE
            WHEN LAG(e.time) OVER w IS NULL
                OR e.time - LAG(e.time) OVER w > incident_burst_window()
            THEN 1 ELSE 0
        END AS starts_incident
    FROM vehicle_events e
    WHERE e.vehicle_id = ANY($1::text[])
        AND e.time >= $2
        AND e.time <  $3
        AND ${EVENT_FILTER}
    WINDOW w AS (
        PARTITION BY e.vehicle_id, e.event_category, e.event_detail
        ORDER BY e.time
    )
)
SELECT
    vehicle_id,
    COUNT(*) FILTER (WHERE event_detail = 'harsh_braking')      AS harsh_brakes,
    COUNT(*) FILTER (WHERE event_detail = 'harsh_acceleration') AS harsh_accelerations,
    COUNT(*) FILTER (WHERE event_detail = 'harsh_cornering')    AS harsh_cornering,
    COUNT(*) FILTER (WHERE event_category = 'over_speeding')    AS overspeed_events,
    COUNT(*) FILTER (WHERE event_category = 'idling')           AS idling_events,
    COUNT(*) FILTER (WHERE event_category = 'crash_detection')  AS crashes,
    COUNT(*)                                                    AS total_events
FROM flagged
WHERE starts_incident = 1
GROUP BY vehicle_id
`;

const SPEED_SQL = `
SELECT
    vehicle_id,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY speed)::numeric AS p95_speed_kmh,
    COUNT(*)                                                     AS moving_samples
FROM clean_telemetry
WHERE vehicle_id = ANY($1::text[])
    AND time >= $2
    AND time <  $3
    AND measurement = 'avl'
    AND speed > 0
GROUP BY vehicle_id
`;


function toNumber(value, fallback = 0){
    if (value === null || value === undefined) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function ratePer100Km(count, distanceKm){
    if (!distanceKm) return null;
    return (count * KM_NORMALISER) / distanceKm;
}

function ratePerDay(count, days){
    if (!days) return null;
    return count / days;
}

function indexByVehicle(rows){
    const map = new Map();
    rows.forEach((row) => map.set(row.vehicle_id, row));
    return map;
}

function buildVehicle(vehicleId, exposureRow, incidentRow, speedRow){
    const distanceKm = toNumber(exposureRow && exposureRow.distance_km);

    const activeDays = toNumber(exposureRow && exposureRow.active_days);

    const movingSamples = toNumber(speedRow && speedRow.moving_samples);

    const counts = {
        harshBrakes: toNumber(incidentRow && incidentRow.harsh_brakes),
        harshAccelerations: toNumber(incidentRow && incidentRow.harsh_accelerations),
        harshCornering: toNumber(incidentRow && incidentRow.harsh_cornering),
        overspeedEvents: toNumber(incidentRow && incidentRow.overspeed_events),
        idlingEvents: toNumber(incidentRow && incidentRow.idling_events),
        crashes: toNumber(incidentRow && incidentRow.crashes),
        totalEvents: toNumber(incidentRow && incidentRow.total_events),
    };

    const p95 = speedRow && speedRow.p95_speed_kmh !== null && speedRow.p95_speed_kmh !== undefined
        ? toNumber(speedRow.p95_speed_kmh, null)
        : null;

    return {
        vehicleId,
        distanceKm,
        activeDays,
        tripCount: toNumber(exposureRow && exposureRow.trip_count),
        movingSamples,
        counts,
        features: {
            harshBrakingPer100Km: ratePer100Km(counts.harshBrakes, distanceKm),
            harshAccelerationPer100Km: ratePer100Km(counts.harshAccelerations, distanceKm),
            harshCorneringPer100Km: ratePer100Km(counts.harshCornering, distanceKm),
            overspeedPer100Km: ratePer100Km(counts.overspeedEvents, distanceKm),
            idlingPerActiveDay: ratePerDay(counts.idlingEvents, activeDays),
            p95SpeedKmh: movingSamples >= MIN_SPEED_SAMPLES ? p95 : null,
        },
    };

}

async function getAnomalyFeatures(db, vehicleIds, period){
    if (!db || typeof db.query !== 'function') {
        throw new Error('getAnomalyFeatures requires a pg client or pool');
    }
    if (!Array.isArray(vehicleIds)) {
        throw new Error('getAnomalyFeatures requires a vehicleIds array from scopeResolver');
    }
    if (!period || !(period.from instanceof Date) || !(period.to instanceof Date)) {
        throw new Error('getAnomalyFeatures requires a resolved period with Date bounds');
    }

    if (!vehicleIds.length) return [];

    const params = [vehicleIds, period.from, period.to, REPORT_TIMEZONE];

    const [exposure, incidents, speed] = await Promise.all([
        db.query(EXPOSURE_SQL, params),
        db.query(INCIDENT_SQL, params.slice(0, 3)),
        db.query(SPEED_SQL, params.slice(0, 3)),
    ]);

    const exposureByVehicle = indexByVehicle(exposure.rows || []);
    const incidentsByVehicle = indexByVehicle(incidents.rows || []);
    const speedByVehicle = indexByVehicle(speed.rows || []);

    return vehicleIds.map((vehicleId) => buildVehicle(
        vehicleId,
        exposureByVehicle.get(vehicleId),
        incidentsByVehicle.get(vehicleId),
        speedByVehicle.get(vehicleId),
    ));
    
}

module.exports = {
    getAnomalyFeatures,
    REPORT_TIMEZONE,
    MIN_SPEED_SAMPLES,
    _buildVehicle: buildVehicle,
    _ratePer100Km: ratePer100Km,
    _ratePerDay: ratePerDay,
    _EXPOSURE_SQL: EXPOSURE_SQL,
    _INCIDENT_SQL: INCIDENT_SQL,
    _SPEED_SQL: SPEED_SQL,
};