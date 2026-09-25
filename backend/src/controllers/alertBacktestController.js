const {pool} = require('../db/pool');
const {success, error} = require('../utils/response');
const {applyDebounce} = require('../utils/alertDebounce');

//1 for local testing
const VALID_DAYS = new Set([1, 7, 30, 90]);
const MAX_SAMPLES = 50;

const CONDITION_TYPES = {
    SPEED: 'speed_threshold',
    TIME: 'time_based_restriction',
    EVENTS: 'repeated_unsafe_events',
    SCORE: 'safety_score_drop',
    TRIP: 'trip_duration_exceeded',
};

function validate({ condition_type, condition_params, fleet_group_id, days}) {
    const errors = [];

    if(!Object.values(CONDITION_TYPES).includes(condition_type)) {
        errors.push('condition_type is invalid');
    }

    if(!condition_params || typeof condition_params !== 'object') {
        errors.push('condition_params is required');
    }

    if(!fleet_group_id) {
        errors.push('fleet_group_id is required');
    }

    if(!VALID_DAYS.has(Number(days))) {
        errors.push('days must be 7, 30 or 90');
    }

    return errors;
}

async function getDataNow() {
    const result = await pool.query('SELECT data_now() AS now');
    return result.rows[0].now;
}

async function querySpeed(groupId, cutoff, params) {
    const threshold = Number(params.max_speed_kmh);

    const result = await pool.query(`
        SELECT ct.vehicle_id,
               min(ct.time) AS time,
               max(ct.speed) AS breach_value,
               min(ct.latitude) AS latitude,
               min(ct.longitude) AS longitude
        FROM clean_telemetry ct
        JOIN vehicles v ON v.vehicle_id = ct.vehicle_id
        WHERE v.fleet_group_id = $1
          AND ct.time >= $2::timestamptz
          AND ct.speed > $3::numeric
        GROUP BY ct.vehicle_id, date_trunc('minute', ct.time)
        ORDER BY ct.vehicle_id, min(ct.time)
    `, [groupId, cutoff, threshold]);

    return { rows: result.rows, threshold };
}

async function queryTime(groupId, cutoff, params) {
    const days = Array.isArray(params.restricted_days) && params.restricted_days.length > 0
        ? params.restricted_days
        : null;

    const result = await pool.query(`
        SELECT ct.vehicle_id,
               min(ct.time) AS time,
               to_char(min(ct.time), 'HH24:MI') AS breach_value,
               min(ct.latitude) AS latitude,
               min(ct.longitude) AS longitude
        FROM clean_telemetry ct
        JOIN vehicles v ON v.vehicle_id = ct.vehicle_id
        WHERE v.fleet_group_id = $1
          AND ct.time >= $2::timestamptz
          AND (
            CASE
                WHEN $3::time > $4::time
                    THEN ct.time::time >= $3::time OR ct.time::time < $4::time
                ELSE ct.time::time >= $3::time AND ct.time::time < $4::time
            END
          )
          AND ($5::text[] IS NULL OR to_char(ct.time, 'Dy') = ANY($5::text[]))
        GROUP BY ct.vehicle_id, date_trunc('minute', ct.time)
        ORDER BY ct.vehicle_id, min(ct.time)

    `, [groupId, cutoff, params.start_time, params.end_time, days]);

    return {
        rows: result.rows, 
        threshold: `${params.start_time}-${params.end_time}`,
    };
}

async function queryEvents(groupId, cutoff, params) {
    const required = Number.parseInt(params.count, 10);
    const windowMinutes = Number.parseInt(params.window_minutes, 10);

    const result = await pool.query(`
        WITH windowed AS (
            SELECT ve.vehicle_id, ve.time,
                COUNT(*) OVER (
                    PARTITION BY ve.vehicle_id ORDER BY ve.time
                    RANGE BETWEEN make_interval(mins => $4::int) PRECEDING AND CURRENT ROW
                ) AS event_count
            FROM vehicle_events ve
            JOIN vehicles v ON v.vehicle_id = ve.vehicle_id
            WHERE v.fleet_group_id = $1
                AND ve.time >= $2::timestamptz
                AND ve.event_detail = ANY($3::text[])
        )
        SELECT vehicle_id, time, event_count AS breach_value, NULL::numeric AS latitude, NULL::numeric AS longitude
        FROM windowed
        WHERE event_count >= $5::int
        ORDER BY vehicle_id, time
    `, [groupId, cutoff, params.event_types, windowMinutes, required]);

    return {rows: result.rows, threshold: required};
}

async function queryScore(groupId, cutoff, params) {
    const threshold = Number(params.min_score);

    const result = await pool.query(`
        SELECT dss.vehicle_id,
                (dss.score_date + time '23:59')::timestamptz AS time, dss.safety_score AS breach_value,
                NULL::numeric AS latitude, NULL::numeric AS longitude
        FROM driver_daily_safety_scores dss
        JOIN vehicles v ON v.vehicle_id = dss.vehicle_id
        WHERE v.fleet_group_id = $1
            AND dss.score_date >= ($2::timestamptz)::date
            AND dss.safety_score < $3::numeric
        ORDER BY dss.vehicle_id, dss.score_date
    `, [groupId, cutoff, threshold]);

    return {rows: result.rows, threshold};
}

async function queryTrip(groupId, cutoff, params) {
    const threshold = Number(params.max_trip_minutes);

    const result = await pool.query(`
        SELECT t.vehicle_id, t.end_time AS time,
                ROUND(t.duration_seconds / 60.0, 1) AS breach_value,
                NULL::numeric AS latitude, NULL::numeric AS longitude
        FROM trips t
        JOIN vehicles v ON v.vehicle_id = t.vehicle_id
        WHERE v.fleet_group_id = $1
            AND t.end_time >= $2::timestamptz
            AND t.status = 'completed'
            AND  (t.duration_seconds / 60.0) > $3::numeric
        ORDER BY t.vehicle_id, t.end_time
    `, [groupId, cutoff, threshold]);

    return {rows: result.rows, threshold};
}

const QUERIES = {
    [CONDITION_TYPES.SPEED]: querySpeed,
    [CONDITION_TYPES.TIME]: queryTime,
    [CONDITION_TYPES.EVENTS]: queryEvents,
    [CONDITION_TYPES.SCORE]: queryScore,
    [CONDITION_TYPES.TRIP]: queryTrip,
};

function sortSamples(breaches, conditionType) {
    if(conditionType === CONDITION_TYPES.SCORE) {
        return [...breaches].sort((a,b) => Number(a.breach_value) - Number(b.breach_value));
    }

    if(conditionType === CONDITION_TYPES.TIME) {
        return [...breaches].sort((a,b) => new Date(b.time) - new Date(a.time));
    }

    return [...breaches].sort((a,b) => Number(b.breach_value) - Number(a.breach_value));
}

function buildByDay(breaches, cutoff, days) {
    const counts = new Map();

    for (const breach of breaches) {
        const key = new Date(breach.time).toISOString().slice(0,10);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const series = [];
    const start = new Date(cutoff);

    for (let i = 0; i<days; i++) {
        const day = new Date(start);
        day.setUTCDate(start.getUTCDate() + i);
        

        const key = day.toISOString().slice(0, 10);
        series.push({date: key, count: counts.get(key) ?? 0});
    }

    return series;
}

async function backtestRule(req, res){
    const {condition_type, condition_params, fleet_group_id, days = 30} = req.body;

    const validationErrors = validate({ condition_type, condition_params, fleet_group_id, days});

    if (validationErrors.length > 0) {
        return error(res, validationErrors.join(', '), 400);
    }

    const managerId = req.user.id;
    const rangeDays = Number(days);

    try {
        const assignment = await pool.query(
            'SELECT 1 FROM fleet_manager_assignments WHERE fleet_manager_id = $1 AND fleet_group_id = $2',
            [managerId, fleet_group_id]
        );

        if (assignment.rows.length === 0) {
            return error(res, 'You are not assigned to this fleet group', 403);
        }

        const dataNow = await getDataNow();
        const cutoff = new Date(dataNow);
        cutoff.setUTCDate(cutoff.getUTCDate() - (rangeDays - 1));
        cutoff.setUTCHours(0, 0, 0, 0);

        const {rows,threshold} = await QUERIES[condition_type](fleet_group_id, cutoff.toISOString(), condition_params);

        const alerts = applyDebounce(rows);
        const vehicles = new Set(alerts.map((a) => a.vehicle_id));

        const samples = sortSamples(alerts, condition_type)
            .slice(0, MAX_SAMPLES)
            .map((a) => ({
                vehicle_id: a.vehicle_id,
                time: new Date(a.time).toISOString(),
                breach_value: Number(a.breach_value),
                threshold_value: Number.isNaN(Number(threshold)) ? threshold: Number(threshold),
                latitude: a.latitude === null ? null : Number(a.latitude),
                longitude: a.longitude === null ? null : Number(a.longitude),
            }));

        return success(res, {
            total_alerts: alerts.length,
            vehicles_affected: vehicles.size,
            days: rangeDays,
            by_day: buildByDay(alerts, cutoff, rangeDays),
            samples,
        }, 200);
    }catch (err) {
        console.error('Backtest rule error:', err);
        return error(res, 'Failed to backtest rule: ' + (err.message || 'unknown error'), 500);
    }
}

module.exports = {backtestRule};


