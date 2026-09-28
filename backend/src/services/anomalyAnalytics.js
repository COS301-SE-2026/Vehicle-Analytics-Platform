'use strict';


const { _EVENT_FILTER: EVENT_FILTER, REPORT_TIMEZONE } = require('./safetyAnalytics');

const EXPOSURE_SQL = `
SELECT
    vehicle_id,
    COALESCE(SUM(distance_km) FILTER (
        WHERE end_odometer IS NULL OR start_odometer IS NULL OR end_odometer >= start_odometer
    ), 0)                                                        AS distance_km,
    COUNT(*)                                                     AS trip_count,
    COUNT(DISTINCT (start_time AT TIME ZONE $4)::date)           AS active_days,
    percentile_cont(0.9) WITHIN GROUP (ORDER BY max_speed_kmh)   AS p90_trip_max_speed_kmh,
    MAX(max_speed_kmh)                                           AS max_speed_kmh
FROM trips
WHERE vehicle_id = ANY($1::text[])
    AND start_time >= $2
    AND start_time <  $3
    AND status = 'completed'
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

async function runQuery(db, label, sql, params){
    const startedAt = Date.now();

    try {
        const result = await db.query(sql, params);
        console.log(`[anomalies] ${label} query: ${result.rows.length} rows in ${Date.now() - startedAt}ms`);
        return result;
    } catch (err) {
        const elapsed = Date.now() - startedAt;
        const code = err.code ? ` [${err.code}]` : '';
        const wrapped = new Error(`${label} query failed after ${elapsed}ms${code}: ${err.message}`);
        wrapped.cause = err;
        wrapped.queryLabel = label;
        wrapped.pgCode = err.code;
        throw wrapped;
    }
}

function toNumber(value, fallback = 0){
    if (value === null || value === undefined) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(value){
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function indexByVehicle(rows){
    const map = new Map();
    rows.forEach((row) => map.set(row.vehicle_id, row));
    return map;
}

function buildVehicle(vehicleId, exposureRow, incidentRow){
    const counts = {
        harshBrakes: toNumber(incidentRow && incidentRow.harsh_brakes),
        harshAccelerations: toNumber(incidentRow && incidentRow.harsh_accelerations),
        harshCornering: toNumber(incidentRow && incidentRow.harsh_cornering),
        overspeedEvents: toNumber(incidentRow && incidentRow.overspeed_events),
        idlingEvents: toNumber(incidentRow && incidentRow.idling_events),
        crashes: toNumber(incidentRow && incidentRow.crashes),
        totalEvents: toNumber(incidentRow && incidentRow.total_events),
    };

    return {
        vehicleId,
        distanceKm: toNumber(exposureRow && exposureRow.distance_km),
        tripCount: toNumber(exposureRow && exposureRow.trip_count),
        activeDays: toNumber(exposureRow && exposureRow.active_days),
        p90TripMaxSpeedKmh: toNullableNumber(exposureRow && exposureRow.p90_trip_max_speed_kmh),
        maxSpeedKmh: toNullableNumber(exposureRow && exposureRow.max_speed_kmh),
        counts,
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

    if (!EVENT_FILTER) {
        throw new Error(
            'safetyAnalytics does not export _EVENT_FILTER. Add "_EVENT_FILTER: EVENT_FILTER" '
            + 'to its module.exports, otherwise the incident query is built with an undefined filter.',
        );
    }

    if (!vehicleIds.length) return [];

    const params = [vehicleIds, period.from, period.to, REPORT_TIMEZONE];

    const exposure = await runQuery(db, 'exposure', EXPOSURE_SQL, params);
    
    const incidents = await runQuery(db, 'incidents', INCIDENT_SQL, params.slice(0, 3));

    const exposureByVehicle = indexByVehicle(exposure.rows || []);
    const incidentsByVehicle = indexByVehicle(incidents.rows || []);

    return vehicleIds.map((vehicleId) => buildVehicle(
        vehicleId,
        exposureByVehicle.get(vehicleId),
        incidentsByVehicle.get(vehicleId),
    ));
}

module.exports = {
    getAnomalyFeatures,
    REPORT_TIMEZONE,
    _buildVehicle: buildVehicle,
    _EXPOSURE_SQL: EXPOSURE_SQL,
    _INCIDENT_SQL: INCIDENT_SQL,
};