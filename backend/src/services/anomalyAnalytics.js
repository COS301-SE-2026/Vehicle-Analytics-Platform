'use strict';


const { _EVENT_FILTER: EVENT_FILTER, REPORT_TIMEZONE } = require('./safetyAnalytics');

const REPORTING_LOOKBACK_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

const REPORTED_TYPE_COLUMNS = {
    harshBrakes: 'harsh_brakes',
    harshAccelerations: 'harsh_accelerations',
    harshCornering: 'harsh_cornering',
    overspeedEvents: 'overspeed_events',
    idlingEvents: 'idling_events',
};

const COUNT_KEYS = [
    'harshBrakes',
    'harshAccelerations',
    'harshCornering',
    'overspeedEvents',
    'idlingEvents',
    'crashes',
    'totalEvents',
];

const EXPOSURE_SQL = `
SELECT
    vehicle_id,
    COALESCE(SUM(distance_km) FILTER (
        WHERE end_odometer IS NULL OR start_odometer IS NULL OR end_odometer >= start_odometer
    ), 0)                                                       AS distance_km,
    COUNT(*)                                                    AS trip_count,
    COUNT(DISTINCT (start_time AT TIME ZONE $4)::date)           AS active_days,
    percentile_cont(0.9) WITHIN GROUP (ORDER BY max_speed_kmh)   AS p90_trip_max_speed_kmh,
    MAX(max_speed_kmh)                                          AS max_speed_kmh
FROM trips
WHERE vehicle_id = ANY($1::text[])
    AND start_time >= $2
    AND start_time <  $3
    AND status = 'completed'
GROUP BY vehicle_id
`;

const DISTANCE_SQL = `
SELECT
    vehicle_id,
    (day::date)::text        AS day,
    SUM(distance_km)::float8 AS km
FROM vehicle_daily_distance
WHERE vehicle_id = ANY($1::text[])
    AND day::date BETWEEN ($2::date - 1) AND $3::date
GROUP BY vehicle_id, day::date
`;

const INCIDENT_SQL = `
WITH flagged AS (
    SELECT
        e.vehicle_id,
        e.event_category,
        e.event_detail,
        ((e.time AT TIME ZONE 'UTC')::date)::text AS day,
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
    day,
    COUNT(*) FILTER (WHERE event_detail = 'harsh_braking')      AS harsh_brakes,
    COUNT(*) FILTER (WHERE event_detail = 'harsh_acceleration') AS harsh_accelerations,
    COUNT(*) FILTER (WHERE event_detail = 'harsh_cornering')    AS harsh_cornering,
    COUNT(*) FILTER (WHERE event_category = 'over_speeding')    AS overspeed_events,
    COUNT(*) FILTER (WHERE event_category = 'idling')           AS idling_events,
    COUNT(*) FILTER (WHERE event_category = 'crash_detection')  AS crashes,
    COUNT(*)                                                    AS total_events
FROM flagged
WHERE starts_incident = 1
GROUP BY vehicle_id, day
`;

// Which incident types each device has reported at least once in the lookback
// window. A vehicle that never reports a type is left out of that comparison
// instead of being counted as having none (see anomalyDetection).
const REPORTING_SQL = `
SELECT
    e.vehicle_id,
    COUNT(*) FILTER (WHERE e.event_detail = 'harsh_braking')      > 0 AS harsh_brakes,
    COUNT(*) FILTER (WHERE e.event_detail = 'harsh_acceleration') > 0 AS harsh_accelerations,
    COUNT(*) FILTER (WHERE e.event_detail = 'harsh_cornering')    > 0 AS harsh_cornering,
    COUNT(*) FILTER (WHERE e.event_category = 'over_speeding')    > 0 AS overspeed_events,
    COUNT(*) FILTER (WHERE e.event_category = 'idling')           > 0 AS idling_events
FROM vehicle_events e
WHERE e.vehicle_id = ANY($1::text[])
    AND e.time >= $2
    AND e.time <  $3
    AND ${EVENT_FILTER}
GROUP BY e.vehicle_id
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

function emptyCounts(){
    return COUNT_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
}

function rowCounts(row){
    return {
        harshBrakes: toNumber(row.harsh_brakes),
        harshAccelerations: toNumber(row.harsh_accelerations),
        harshCornering: toNumber(row.harsh_cornering),
        overspeedEvents: toNumber(row.overspeed_events),
        idlingEvents: toNumber(row.idling_events),
        crashes: toNumber(row.crashes),
        totalEvents: toNumber(row.total_events),
    };
}

function addCounts(target, source){
    COUNT_KEYS.forEach((key) => { target[key] += source[key]; });
    return target;
}


async function readTelemetryDistance(db, vehicleIds, period){
    if (!period.fromDate || !period.toDate) {
        return { available: false, reason: 'period has no local dates', rows: [] };
    }

    try {
        const result = await runQuery(db, 'distance', DISTANCE_SQL, [vehicleIds, period.fromDate, period.toDate]);
        return { available: true, reason: null, rows: result.rows || [] };
    } catch (err) {
        console.warn(`[anomalies] telemetry distance unavailable, using trip distance: ${err.message}`);
        return { available: false, reason: err.pgCode || 'query_failed', rows: [] };
    }
}


function reportingLookbackStart(period){
    return new Date(period.to.getTime() - REPORTING_LOOKBACK_DAYS * DAY_MS);
}


async function readReportingHistory(db, vehicleIds, period){
    try {
        const result = await runQuery(
            db,
            'reporting',
            REPORTING_SQL,
            [vehicleIds, reportingLookbackStart(period), period.to],
        );
        return { checked: true, rows: result.rows || [] };
    } catch (err) {
        console.warn(`[anomalies] event reporting history unavailable: ${err.message}`);
        return { checked: false, rows: [] };
    }
}


function buildReporting(history, row){
    if (!history.checked) {
        return { checked: false, lookbackDays: REPORTING_LOOKBACK_DAYS, types: null };
    }

    const types = {};
    Object.keys(REPORTED_TYPE_COLUMNS).forEach((key) => {
        types[key] = Boolean(row) && row[REPORTED_TYPE_COLUMNS[key]] === true;
    });

    return { checked: true, lookbackDays: REPORTING_LOOKBACK_DAYS, types };
}


function buildVehicle(vehicleId, exposureRow, incidentRows, distanceByDay, telemetry, period, reporting = null){
    const counts = emptyCounts();
    const alignedCounts = telemetry.available ? emptyCounts() : null;

    (incidentRows || []).forEach((row) => {
        const dayCounts = rowCounts(row);
        addCounts(counts, dayCounts);
        if (alignedCounts && (distanceByDay.get(row.day) || 0) > 0) {
            addCounts(alignedCounts, dayCounts);
        }
    });

    let telemetryDistanceKm = null;
    let telemetryDays = null;

    if (telemetry.available) {
        telemetryDistanceKm = 0;
        telemetryDays = 0;
        distanceByDay.forEach((km, day) => {
            if (day >= period.fromDate && day <= period.toDate) {
                telemetryDistanceKm += km;
                if (km > 0) telemetryDays += 1;
            }
        });
    }

    return {
        vehicleId,
        tripDistanceKm: toNumber(exposureRow && exposureRow.distance_km),
        telemetryDistanceKm,
        telemetryDays,
        tripCount: toNumber(exposureRow && exposureRow.trip_count),
        activeDays: toNumber(exposureRow && exposureRow.active_days),
        p90TripMaxSpeedKmh: toNullableNumber(exposureRow && exposureRow.p90_trip_max_speed_kmh),
        maxSpeedKmh: toNullableNumber(exposureRow && exposureRow.max_speed_kmh),
        counts,
        alignedCounts,
        reporting,
    };
}

function groupBy(rows, key){
    const map = new Map();
    rows.forEach((row) => {
        if (!map.has(row[key])) map.set(row[key], []);
        map.get(row[key]).push(row);
    });
    return map;
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

    const exposure = await runQuery(db, 'exposure', EXPOSURE_SQL, [vehicleIds, period.from, period.to, REPORT_TIMEZONE]);
    const telemetry = await readTelemetryDistance(db, vehicleIds, period);
    const incidents = await runQuery(db, 'incidents', INCIDENT_SQL, [vehicleIds, period.from, period.to]);
    const history = await readReportingHistory(db, vehicleIds, period);

    const exposureByVehicle = new Map((exposure.rows || []).map((row) => [row.vehicle_id, row]));
    const incidentsByVehicle = groupBy(incidents.rows || [], 'vehicle_id');

    const reportingByVehicle = new Map(history.rows.map((row) => [row.vehicle_id, row]));

    const distanceByVehicle = new Map();
    telemetry.rows.forEach((row) => {
        if (!distanceByVehicle.has(row.vehicle_id)) distanceByVehicle.set(row.vehicle_id, new Map());
        distanceByVehicle.get(row.vehicle_id).set(row.day, toNumber(row.km));
    });

    return vehicleIds.map((vehicleId) => buildVehicle(
        vehicleId,
        exposureByVehicle.get(vehicleId),
        incidentsByVehicle.get(vehicleId),
        distanceByVehicle.get(vehicleId) || new Map(),
        telemetry,
        period,
        buildReporting(history, reportingByVehicle.get(vehicleId)),
    ));
}

module.exports = {
    getAnomalyFeatures,
    REPORT_TIMEZONE,
    REPORTING_LOOKBACK_DAYS,
    _buildReporting: buildReporting,
    _reportingLookbackStart: reportingLookbackStart,
    _REPORTING_SQL: REPORTING_SQL,
    _buildVehicle: buildVehicle,
    _EXPOSURE_SQL: EXPOSURE_SQL,
    _DISTANCE_SQL: DISTANCE_SQL,
    _INCIDENT_SQL: INCIDENT_SQL,
};