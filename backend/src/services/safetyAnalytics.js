'use strict';

const REPORT_TIMEZONE = 'Africa/Johannesburg';

const EVENT_FILTER = `(
    (e.event_category = 'green_driving_type'
        AND e.event_detail IN ('harsh_braking', 'harsh_acceleration', 'harsh_cornering'))
    OR (e.event_category = 'crash_detection'
        AND e.event_detail LIKE 'real crash detected%'
        AND e.event_detail NOT LIKE '%not calibrated%')
    OR e.event_category IN ('over_speeding', 'idling')
  )`;

const DAILY_CTE = `
  WITH flagged AS (
    SELECT
        e.vehicle_id,
        e.event_category,
        e.event_detail,
        (e.time AT TIME ZONE $4)::date AS event_day,
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
  ),
    daily AS (
    SELECT
        vehicle_id,
        event_day,
        COUNT(*) FILTER (WHERE event_detail = 'harsh_braking')      AS harsh_brakes,
        COUNT(*) FILTER (WHERE event_detail = 'harsh_acceleration') AS harsh_accelerations,
        COUNT(*) FILTER (WHERE event_detail = 'harsh_cornering')    AS harsh_cornering,
        COUNT(*) FILTER (WHERE event_category = 'crash_detection')  AS crashes,
        COUNT(*) FILTER (WHERE event_category = 'over_speeding')    AS overspeed_events,
        COUNT(*) FILTER (WHERE event_category = 'idling')           AS idling_events,
        COUNT(*)                                                    AS total_events
    FROM flagged
    WHERE starts_incident = 1
    GROUP BY vehicle_id, event_day
  ),
  scored AS (
    SELECT
      d.*,
      GREATEST(0, 100 - (d.harsh_brakes * 2
                       + d.harsh_accelerations * 2
                       + d.harsh_cornering * 1
                       + d.crashes * 25))::INTEGER AS safety_score
    FROM daily d
  )`;

const PER_VEHICLE_SQL = `
${DAILY_CTE}
SELECT
    vehicle_id,
    COUNT(*)                                                  AS days_with_events,
    SUM(harsh_brakes)                                         AS harsh_brakes,
    SUM(harsh_accelerations)                                  AS harsh_accelerations,
    SUM(harsh_cornering)                                     AS harsh_cornering,
    SUM(crashes)                                              AS crashes,
    SUM(overspeed_events)                                     AS overspeed_events,
    SUM(idling_events)                                        AS idling_events,
    SUM(total_events)                                         AS total_events,
    ROUND(AVG(safety_score))::INTEGER                         AS safety_score,
    MIN(safety_score)::INTEGER                                AS worst_daily_score,
    classify_safety_score(ROUND(AVG(safety_score))::INTEGER) AS classification
FROM scored
GROUP BY vehicle_id
ORDER BY vehicle_id
`;

const FLEET_SQL = `
${DAILY_CTE}
SELECT
    COUNT(*)                                                  AS vehicle_days,
    COUNT(DISTINCT vehicle_id)                                AS vehicles_with_events,
    ROUND(AVG(safety_score))::INTEGER                         AS safety_score,
    classify_safety_score(ROUND(AVG(safety_score))::INTEGER) AS classification
FROM scored
`;

const TELEMETRY_EXISTS_SQL = `
SELECT EXISTS (
    SELECT 1 FROM clean_telemetry
    WHERE vehicle_id = ANY($1::text[])
        AND time >= $2
        AND time <  $3
  ) AS has_telemetry
`;

function toNumber(value, fallback = 0){
    if (value === null || value === undefined) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function safeRatio(numerator, denominator){
    if (!denominator) return null;
    return numerator / denominator;
}

function round(value, dp = 2){
    if (value === null || value === undefined || !Number.isFinite(value)) return null;
    const factor = 10 ** dp;
    const sign = value < 0 ? -1 : 1;
    return (sign * Math.round(Math.abs(value) * factor)) / factor;
}

function deriveVehicle(row){
    return {
      vehicleId: row.vehicle_id,
      daysWithEvents: toNumber(row.days_with_events),
      harshBrakes: toNumber(row.harsh_brakes),
      harshAccelerations: toNumber(row.harsh_accelerations),
      harshCornering: toNumber(row.harsh_cornering),
      crashes: toNumber(row.crashes),
      overspeedEvents: toNumber(row.overspeed_events),
      idlingEvents: toNumber(row.idling_events),
      totalEvents: toNumber(row.total_events),
      safetyScore: row.safety_score === null || row.safety_score === undefined ? null : toNumber(row.safety_score),
      worstDailyScore: row.worst_daily_score === null || row.worst_daily_score === undefined ? null : toNumber(row.worst_daily_score),
      classification: row.classification || null,
  
  };

}

function emptySummary(vehiclesInScope, hasTelemetry){
    return {
      hasTelemetry,
      safetyScore: hasTelemetry ? 100 : null,
      classification: null,
      harshBrakes: 0,
      harshAccelerations: 0,
      harshCornering: 0,
      crashes: 0,
      overspeedEvents: 0,
      idlingEvents: 0,
      totalEvents: 0,
      eventsPerVehicleDay: null,
      vehicleDaysWithEvents: 0,
      vehiclesWithEvents: 0,
      vehiclesInScope,
      vehiclesWithoutEvents: vehiclesInScope,
    };

}

async function getSafetyAnalytics(db, vehicleIds, period) {
    if (!db || typeof db.query !== 'function') {
        throw new Error('getSafetyAnalytics requires a pg client or pool');
    }
    if (!Array.isArray(vehicleIds)) {
        throw new Error('getSafetyAnalytics requires a vehicleIds array from scopeResolver');
    }
    if (!period || !(period.from instanceof Date) || !(period.to instanceof Date)) {
        throw new Error('getSafetyAnalytics requires a resolved period with Date bounds');
    }

    if (!vehicleIds.length) {
        return { summary: emptySummary(0, false), vehicles: [] };
    }

    const params = [vehicleIds, period.from, period.to, REPORT_TIMEZONE];

    const [perVehicle, fleet, telemetry] = await Promise.all([
        db.query(PER_VEHICLE_SQL, params),
        db.query(FLEET_SQL, params),
        db.query(TELEMETRY_EXISTS_SQL, params.slice(0, 3)),
    ]);

    const hasTelemetry = Boolean(telemetry.rows[0] && telemetry.rows[0].has_telemetry);
    const vehicles = perVehicle.rows.map(deriveVehicle);

    if (!vehicles.length) {
        return { summary: emptySummary(vehicleIds.length, hasTelemetry), vehicles: [] };
    }

    const fleetRow = fleet.rows[0] || {};
    const sum = (key) => vehicles.reduce((total, v) => total + v[key], 0);
    const vehicleDays = toNumber(fleetRow.vehicle_days);
    const totalEvents = sum('totalEvents');

    return {
        summary: {
            hasTelemetry,
            safetyScore: fleetRow.safety_score === null || fleetRow.safety_score === undefined
                ? null : toNumber(fleetRow.safety_score),
            classification: fleetRow.classification || null,
            harshBrakes: sum('harshBrakes'),
            harshAccelerations: sum('harshAccelerations'),
            harshCornering: sum('harshCornering'),
            crashes: sum('crashes'),
            overspeedEvents: sum('overspeedEvents'),
            idlingEvents: sum('idlingEvents'),
            totalEvents,
            eventsPerVehicleDay: round(safeRatio(totalEvents, vehicleDays)),
            vehicleDaysWithEvents: vehicleDays,
            vehiclesWithEvents: toNumber(fleetRow.vehicles_with_events),
            vehiclesInScope: vehicleIds.length,
            vehiclesWithoutEvents: Math.max(0, vehicleIds.length - vehicles.length),
        },
        vehicles,
    };
}

module.exports = {
    getSafetyAnalytics,
    REPORT_TIMEZONE,
    _deriveVehicle: deriveVehicle,
    _emptySummary: emptySummary,
};