'use strict';

const { ensureWeather } = require('./weatherService');
const { addDays } = require('../utils/dateUtils');

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const MAX_DAYS = 7;
const REFERENCE_DAYS = 28;        // "normal" window before the selected period
const WET_THRESHOLD_MM = 1;       // a wet day has >= 1 mm of rain
const HEAVY_RAIN_MM = 10;
const PROBABILITY_KM = 10;        // probabilities are "at least one event in 10 km"

// Sparse rates are pulled towards their parent rate as if the parent had
// been observed over this many extra km. Stops a 3 km visit to a suburb from
// producing an extreme rate.
const PRIOR_KM = 1000;

const MIN_EXPECTED = 5;           // fewer expected events than this: no verdict
const ALPHA = 0.001;              // strict, because many vehicles are tested at once
const HIGH_RATIO = 1.25;          // must be 25% above the fleet AND significant
const LOW_RATIO = 0.8;
const MIN_AREA_KM = 25;           // areas with less driving are grouped as low exposure
const MAX_AREAS = 200;

// Data-quality checks. Both rest on the same fact: when the fleet would
// normally log 20+ events, seeing (almost) none is not plausible chance.
//  - A day whose events fall below 20% of the fleet's normal rate is treated
//    as missing event data for that event type, and left out.
//  - A vehicle with zero events of a type, over distance where the fleet
//    would log 20+, is treated as not reporting that type, and left out of
//    that type's rates and comparisons.
const GAP_MIN_DAY_KM = 1000;      // only days with this much driving set the normal rate
const GAP_MIN_EXPECTED = 20;
const GAP_RATIO = 0.2;
const NOT_REPORTED_MIN_EXPECTED = 20;

const CONDITIONS = ['dry', 'wet', 'unknown'];

const EVENTS = [
    { key: 'harsh_braking', label: 'Harsh braking', shortLabel: 'Braking' },
    { key: 'harsh_acceleration', label: 'Harsh acceleration', shortLabel: 'Acceleration' },
    { key: 'harsh_cornering', label: 'Harsh cornering', shortLabel: 'Cornering' },
    { key: 'over_speeding', label: 'Overspeeding', shortLabel: 'Overspeeding' },
    {
        key: 'crash_alerts',
        label: 'Crash-detection alerts',
        shortLabel: 'Crash alerts',
        note: 'Device detections, not confirmed crashes',
    },
];

const BENCHMARKS = {
    harsh_braking: {
        ratePer100Km: 5,
        source: 'Vendor rule of thumb (8 per 100 miles). Indicative only, and depends on device thresholds.',
    },
};

function zeroEvents() {
    return Object.fromEntries(EVENTS.map(({ key }) => [key, 0]));
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------
// $1 window start, $2 window end, $3 vehicle ids, $4 wet threshold,
// $5 period start, $6.. one date[] per event: days with missing event data.

const gapParam = (i) => `$${6 + i}::date[]`;

const ENRICHED_CTE = `
WITH scoped AS (
    SELECT avd.*
    FROM area_vehicle_day avd
    WHERE avd.day BETWEEN $1::date AND $2::date
      AND avd.vehicle_id = ANY($3::text[])
),
day_points AS (
    SELECT day, vehicle_id, SUM(moving_points) AS total_points
    FROM scoped
    GROUP BY day, vehicle_id
),
day_km AS (
    SELECT vehicle_id, day::date AS day, SUM(distance_km)::float8 AS km
    FROM vehicle_daily_distance
    WHERE day::date BETWEEN $1::date AND $2::date
      AND vehicle_id = ANY($3::text[])
    GROUP BY vehicle_id, day::date
),
enriched AS (
    SELECT s.day,
           s.vehicle_id,
           s.area_id,
           ${EVENTS.map(({ key }) => `s.${key}`).join(', ')},
           ${EVENTS.map(({ key }, i) => `(s.day = ANY(${gapParam(i)})) AS gap_${key}`).join(',\n           ')},
           (k.km IS NULL) AS missing_km,
           -- Split the vehicle's daily distance across areas in proportion
           -- to where it was moving.
           COALESCE(k.km * s.moving_points / NULLIF(dp.total_points, 0), 0) AS km,
           CASE WHEN wo.precipitation_mm IS NULL THEN 'unknown'
                WHEN wo.precipitation_mm >= $4 THEN 'wet'
                ELSE 'dry' END AS condition,
           (s.day >= $5::date) AS in_period
    FROM scoped s
    JOIN day_points dp
      ON dp.day = s.day AND dp.vehicle_id = s.vehicle_id
    JOIN report_areas ra
      ON ra.id = s.area_id
    LEFT JOIN day_km k
      ON k.vehicle_id = s.vehicle_id AND k.day = s.day
    LEFT JOIN weather_observations wo
      ON wo.lat_grid = ra.weather_lat
     AND wo.lon_grid = ra.weather_lon
     AND wo.obs_date = s.day
)`;

// Per event: events and km, both with gap days removed, so every rate is
// events over the km during which that event type was being recorded.
const GROUPED_SQL = `${ENRICHED_CTE}
SELECT vehicle_id,
       area_id::text AS area_id,
       condition,
       in_period,
       SUM(km)::float8 AS km,
       ${EVENTS.map(({ key }) => `SUM(CASE WHEN gap_${key} THEN 0 ELSE ${key} END)::int AS ${key},
       SUM(CASE WHEN gap_${key} THEN 0 ELSE km END)::float8 AS km_${key}`).join(',\n       ')}
FROM enriched
GROUP BY vehicle_id, area_id, condition, in_period`;

const DAILY_SQL = `${ENRICHED_CTE}
SELECT day::text AS day,
       condition,
       SUM(km)::float8 AS km,
       ${EVENTS.map(({ key }) => `SUM(${key})::int AS ${key}`).join(',\n       ')}
FROM enriched
GROUP BY day, condition
ORDER BY day`;

// One row per vehicle per day driven in the period. An event column is NULL
// on that event's gap days, so those days drop out of the denominator.
const VEHICLE_DAY_SQL = `${ENRICHED_CTE}
SELECT vehicle_id,
       day::text AS day,
       ${EVENTS.map(({ key }) => `(CASE WHEN bool_or(gap_${key}) THEN NULL ELSE SUM(${key}) END)::int AS ${key}`).join(',\n       ')}
FROM enriched
WHERE in_period
GROUP BY vehicle_id, day
HAVING SUM(km) > 0`;

const STATS_SQL = `${ENRICHED_CTE}
SELECT
    (COUNT(DISTINCT (area_id, day)) FILTER (WHERE condition = 'wet'))::int AS wet_area_days,
    (COUNT(DISTINCT (area_id, day)) FILTER (WHERE condition = 'dry'))::int AS dry_area_days,
    (COUNT(DISTINCT day) FILTER (WHERE condition = 'wet'))::int            AS wet_calendar_days,
    (COUNT(DISTINCT (vehicle_id, day)) FILTER (WHERE in_period AND missing_km))::int
                                                                            AS vehicle_days_missing_distance,
    COALESCE(SUM(km) FILTER (WHERE in_period), 0)::float8                   AS period_km,
    COALESCE(SUM(km) FILTER (WHERE in_period AND condition = 'unknown'), 0)::float8
                                                                            AS period_unknown_weather_km
FROM enriched`;

const CELLS_SQL = `
SELECT DISTINCT ra.weather_lat::float8 AS lat, ra.weather_lon::float8 AS lon
FROM area_vehicle_day avd
JOIN report_areas ra ON ra.id = avd.area_id
WHERE avd.day BETWEEN $1::date AND $2::date
  AND avd.vehicle_id = ANY($3::text[])`;

const UNBUILT_DAYS_SQL = `
SELECT d::date::text AS day
FROM generate_series($1::date, $2::date, INTERVAL '1 day') AS d
WHERE NOT EXISTS (SELECT 1 FROM area_refresh_log l WHERE l.day = d::date)
ORDER BY d`;

const AREA_DETAIL_SQL = `
SELECT ra.id::text AS area_id,
       ra.area_name,
       ra.city_name,
       ra.area_kind,
       wo.obs_date::text AS day,
       wo.precipitation_mm::float8 AS precip,
       wo.temp_max_c::float8 AS tmax
FROM report_areas ra
LEFT JOIN weather_observations wo
       ON wo.lat_grid = ra.weather_lat
      AND wo.lon_grid = ra.weather_lon
      AND wo.obs_date BETWEEN $2::date AND $3::date
WHERE ra.id = ANY($1::bigint[])`;

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

function round(value, dp = 2) {
    if (value === null || value === undefined || !Number.isFinite(value)) return null;
    const f = 10 ** dp;
    return Math.round(value * f) / f;
}

function rate100(events, km) {
    return km > 0 ? events / (km / 100) : null;
}

function median(values) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Chance of at least one event within PROBABILITY_KM, treating events as a
// Poisson process along the distance driven.
function probWithin(ratePer100Km) {
    if (ratePer100Km === null) return null;
    return 1 - Math.exp(-ratePer100Km * (PROBABILITY_KM / 100));
}

// Rate pulled towards parentRate by PRIOR_KM of pseudo-distance.
function shrunkRate(events, km, parentRate) {
    if (parentRate === null) return rate100(events, km);
    return (events + parentRate * (PRIOR_KM / 100)) / ((Math.max(km, 0) + PRIOR_KM) / 100);
}

// Ratio of two rates with a 95% interval (log method). A 0.5 correction is
// applied when one count is zero so the interval stays finite. When both are
// zero there is nothing to compare.
function rateRatio(e1, km1, e0, km0) {
    if (!(km1 > 0) || !(km0 > 0)) return null;
    if (e1 === 0 && e0 === 0) return null;
    const zero = e1 === 0 || e0 === 0;
    const a = zero ? e1 + 0.5 : e1;
    const b = zero ? e0 + 0.5 : e0;
    const ratio = (a / km1) / (b / km0);
    const se = Math.sqrt(1 / a + 1 / b);
    const low = ratio * Math.exp(-1.96 * se);
    const high = ratio * Math.exp(1.96 * se);
    return {
        ratio: round(ratio, 2),
        low: round(low, 2),
        high: round(high, 2),
        significant: low > 1 || high < 1,
    };
}

// Mantel-Haenszel rate ratio across areas, with the Greenland-Robins
// variance. Compares wet and dry driving *within the same area*, so wet
// days that happen to fall in riskier areas do not masquerade as a weather
// effect. Areas without both wet and dry driving drop out.
function mantelHaenszelRateRatio(strata, key) {
    let num = 0;
    let den = 0;
    let varNum = 0;

    for (const { wet, dry } of strata) {
        if (!wet || !dry) continue;
        const t1 = wet.eventKm[key];
        const t0 = dry.eventKm[key];
        if (!(t1 > 0) || !(t0 > 0)) continue;
        const t = t1 + t0;
        const a = wet.events[key];
        const b = dry.events[key];
        num += (a * t0) / t;
        den += (b * t1) / t;
        varNum += ((a + b) * t1 * t0) / (t * t);
    }

    if (!(num > 0) || !(den > 0)) return null;

    const ratio = num / den;
    const se = Math.sqrt(varNum / (num * den));
    const low = ratio * Math.exp(-1.96 * se);
    const high = ratio * Math.exp(1.96 * se);
    return {
        ratio: round(ratio, 2),
        low: round(low, 2),
        high: round(high, 2),
        significant: low > 1 || high < 1,
    };
}

const LANCZOS = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
];

function logGamma(z) {
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    const zz = z - 1;
    let x = 0.9999999999998099;
    for (let i = 0; i < LANCZOS.length; i += 1) x += LANCZOS[i] / (zz + i + 1);
    const t = zz + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

function poissonPmf(k, mu) {
    return Math.exp(k * Math.log(mu) - mu - logGamma(k + 1));
}

// P(X >= k)
function poissonUpperTail(k, mu) {
    if (k <= 0) return 1;
    if (k <= mu) return 1 - poissonLowerTail(k - 1, mu);
    let term = poissonPmf(k, mu);
    let sum = 0;
    for (let i = k; term > 0 && i < k + 100000; i += 1) {
        sum += term;
        term *= mu / (i + 1);
        if (term < sum * 1e-14) break;
    }
    return Math.min(1, sum);
}

// P(X <= k)
function poissonLowerTail(k, mu) {
    if (k < 0) return 0;
    if (k >= mu) return 1 - poissonUpperTail(k + 1, mu);
    let term = poissonPmf(k, mu);
    let sum = 0;
    for (let i = k; i >= 0 && term > 0; i -= 1) {
        sum += term;
        term *= i / mu;
        if (term < sum * 1e-14) break;
    }
    return Math.min(1, sum);
}

// Observed vs expected events, with a verdict only when the difference is
// both large and unlikely to be chance.
function compareToExpected(observed, expected) {
    const result = {
        observed,
        expected: round(expected, 1),
        ratio: expected > 0 ? round(observed / expected, 2) : null,
        pValue: null,
        status: 'in_line',
    };

    if (!(expected >= MIN_EXPECTED)) {
        result.status = 'insufficient_data';
        return result;
    }

    const ratio = observed / expected;
    if (ratio >= HIGH_RATIO) {
        const p = poissonUpperTail(observed, expected);
        result.pValue = Number(p.toPrecision(3));
        if (p < ALPHA) result.status = 'above_fleet';
    } else if (ratio <= LOW_RATIO) {
        const p = poissonLowerTail(observed, expected);
        result.pValue = Number(p.toPrecision(3));
        if (p < ALPHA) result.status = 'below_fleet';
    }
    return result;
}

// ---------------------------------------------------------------------------
// Data-quality checks
// ---------------------------------------------------------------------------

function aggregateDaily(dailyRows) {
    const byDay = new Map();
    for (const row of dailyRows) {
        if (!byDay.has(row.day)) {
            byDay.set(row.day, { day: row.day, km: 0, wetKm: 0, unknownKm: 0, events: zeroEvents() });
        }
        const d = byDay.get(row.day);
        d.km += row.km || 0;
        if (row.condition === 'wet') d.wetKm += row.km || 0;
        if (row.condition === 'unknown') d.unknownKm += row.km || 0;
        for (const { key } of EVENTS) d.events[key] += row[key] || 0;
    }
    return [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
}

// Days whose event count is far below what the fleet's normal rate predicts
// for the km driven that day. Returns { eventKey: [days] }.
function detectGapDays(days) {
    const gaps = {};
    for (const { key } of EVENTS) {
        const normal = median(
            days.filter((d) => d.km >= GAP_MIN_DAY_KM).map((d) => d.events[key] / (d.km / 100)),
        );
        gaps[key] = normal > 0
            ? days
                .filter((d) => {
                    const expected = normal * (d.km / 100);
                    return expected >= GAP_MIN_EXPECTED && d.events[key] < GAP_RATIO * expected;
                })
                .map((d) => d.day)
            : [];
    }
    return gaps;
}

// Vehicles that logged none of an event type over the whole window, where
// the fleet would have logged NOT_REPORTED_MIN_EXPECTED or more.
function detectNotReported(rows) {
    const fleet = { events: zeroEvents(), km: zeroEvents() };
    const perVehicle = new Map();

    for (const row of rows) {
        if (!perVehicle.has(row.vehicle_id)) {
            perVehicle.set(row.vehicle_id, { events: zeroEvents(), km: zeroEvents() });
        }
        const v = perVehicle.get(row.vehicle_id);
        for (const { key } of EVENTS) {
            const n = row[key] || 0;
            const km = row[`km_${key}`] || 0;
            v.events[key] += n;
            v.km[key] += km;
            fleet.events[key] += n;
            fleet.km[key] += km;
        }
    }

    const notReported = new Map();
    const counts = zeroEvents();
    for (const { key } of EVENTS) {
        const fleetRate = rate100(fleet.events[key], fleet.km[key]);
        if (!fleetRate) continue;
        for (const [vehicleId, v] of perVehicle) {
            if (v.events[key] === 0 && fleetRate * (v.km[key] / 100) >= NOT_REPORTED_MIN_EXPECTED) {
                if (!notReported.has(vehicleId)) notReported.set(vehicleId, new Set());
                notReported.get(vehicleId).add(key);
                counts[key] += 1;
            }
        }
    }
    return { notReported, counts };
}

// ---------------------------------------------------------------------------
// Accumulators
// ---------------------------------------------------------------------------
// km:       all distance, for display
// eventKm:  per event, the distance during which that event was being
//           recorded (gap days and non-reporting vehicles removed)

function emptyAcc() {
    return { km: 0, events: zeroEvents(), eventKm: zeroEvents() };
}

function addRow(acc, row, skip) {
    acc.km += row.km || 0;
    for (const { key } of EVENTS) {
        if (skip && skip.has(key)) continue;
        acc.events[key] += row[key] || 0;
        acc.eventKm[key] += row[`km_${key}`] || 0;
    }
}

function getAcc(map, key) {
    if (!map.has(key)) map.set(key, emptyAcc());
    return map.get(key);
}

function summarise(rows, notReported) {
    const period = {
        all: emptyAcc(),
        byCond: new Map(),
        byArea: new Map(),
        byAreaCond: new Map(),
        areaVehicles: new Map(),
    };
    const reference = { all: emptyAcc(), byArea: new Map() };
    const pooled = { byCond: new Map(), byAreaCond: new Map() };

    for (const row of rows) {
        const skip = notReported.get(row.vehicle_id);
        const area = row.area_id;
        const areaCond = `${area}|${row.condition}`;

        if (row.in_period) {
            addRow(period.all, row, skip);
            addRow(getAcc(period.byCond, row.condition), row, skip);
            addRow(getAcc(period.byArea, area), row, skip);
            addRow(getAcc(period.byAreaCond, areaCond), row, skip);
            if (!period.areaVehicles.has(area)) period.areaVehicles.set(area, new Set());
            period.areaVehicles.get(area).add(row.vehicle_id);
        } else {
            addRow(reference.all, row, skip);
            addRow(getAcc(reference.byArea, area), row, skip);
        }

        addRow(getAcc(pooled.byCond, row.condition), row, skip);
        addRow(getAcc(pooled.byAreaCond, areaCond), row, skip);
    }

    return { period, reference, pooled };
}

// Fleet rate for a weather condition in the selected period. Unknown
// weather falls back to the overall fleet rate.
function makeConditionRate(period) {
    const cache = new Map();
    return (key, condition) => {
        const cacheKey = `${key}|${condition}`;
        if (cache.has(cacheKey)) return cache.get(cacheKey);
        const allRate = rate100(period.all.events[key], period.all.eventKm[key]);
        let value = allRate;
        if (condition !== 'unknown') {
            const acc = period.byCond.get(condition);
            value = acc ? shrunkRate(acc.events[key], acc.eventKm[key], allRate) : allRate;
        }
        cache.set(cacheKey, value);
        return value;
    };
}

// Share of vehicle-days with at least one event, skipping gap days and
// vehicles that do not report the event type.
function vehicleDayShares(vehicleDayRows, notReported) {
    const shares = {};
    for (const { key } of EVENTS) {
        let days = 0;
        let withEvent = 0;
        for (const row of vehicleDayRows) {
            if (row[key] === null || row[key] === undefined) continue;
            if (notReported.get(row.vehicle_id)?.has(key)) continue;
            days += 1;
            if (row[key] > 0) withEvent += 1;
        }
        shares[key] = days > 0 ? round(withEvent / days, 3) : null;
    }
    return shares;
}

// ---------------------------------------------------------------------------
// Report sections
// ---------------------------------------------------------------------------

function buildFleetSummary(period, reference, shares, notReportedCounts) {
    return EVENTS.map((ev) => {
        const rate = rate100(period.all.events[ev.key], period.all.eventKm[ev.key]);
        const refRate = rate100(reference.all.events[ev.key], reference.all.eventKm[ev.key]);
        return {
            key: ev.key,
            label: ev.label,
            shortLabel: ev.shortLabel,
            note: ev.note || null,
            events: period.all.events[ev.key],
            ratePer100Km: round(rate, 2),
            pPer10Km: round(probWithin(rate), 3),
            pPerVehicleDay: shares[ev.key],
            referenceRatePer100Km: round(refRate, 2),
            vsReference: reference.all.eventKm[ev.key] >= MIN_AREA_KM
                ? rateRatio(period.all.events[ev.key], period.all.eventKm[ev.key],
                    reference.all.events[ev.key], reference.all.eventKm[ev.key])
                : null,
            vehiclesNotReporting: notReportedCounts[ev.key],
            benchmark: BENCHMARKS[ev.key] || null,
        };
    });
}

function weatherReliability(wetKm, wetAreaDays, wetCalendarDays) {
    if (wetKm < 200 || wetAreaDays < 5) return 'insufficient';
    if (wetCalendarDays < 10 || wetAreaDays < 30) return 'indicative';
    return 'reliable';
}

function buildWeatherImpact(pooled, stats, window) {
    const wet = pooled.byCond.get('wet') || emptyAcc();
    const dry = pooled.byCond.get('dry') || emptyAcc();

    const areaIds = new Set([...pooled.byAreaCond.keys()].map((k) => k.split('|')[0]));
    const strata = [...areaIds].map((id) => ({
        wet: pooled.byAreaCond.get(`${id}|wet`),
        dry: pooled.byAreaCond.get(`${id}|dry`),
    }));

    return {
        window,
        wetKm: round(wet.km, 0),
        dryKm: round(dry.km, 0),
        wetAreaDays: stats.wet_area_days,
        dryAreaDays: stats.dry_area_days,
        wetCalendarDays: stats.wet_calendar_days,
        reliability: weatherReliability(wet.km, stats.wet_area_days, stats.wet_calendar_days),
        events: EVENTS.map((ev) => {
            const dryRate = rate100(dry.events[ev.key], dry.eventKm[ev.key]);
            const wetRate = rate100(wet.events[ev.key], wet.eventKm[ev.key]);
            return {
                key: ev.key,
                label: ev.label,
                shortLabel: ev.shortLabel,
                dryRatePer100Km: round(dryRate, 2),
                wetRatePer100Km: round(wetRate, 2),
                dryPPer10Km: round(probWithin(dryRate), 3),
                wetPPer10Km: round(probWithin(wetRate), 3),
                crude: rateRatio(wet.events[ev.key], wet.eventKm[ev.key], dry.events[ev.key], dry.eventKm[ev.key]),
                areaAdjusted: mantelHaenszelRateRatio(strata, ev.key),
            };
        }),
    };
}

function buildDaily(days, periodStart, gapDays) {
    return days
        .filter((d) => d.day >= periodStart)
        .map((d) => ({
            day: d.day,
            km: round(d.km, 1),
            wetKmShare: d.km > 0 ? round(d.wetKm / d.km, 3) : null,
            unknownWeatherKmShare: d.km > 0 ? round(d.unknownKm / d.km, 3) : null,
            events: d.events,
            ratesPer100Km: Object.fromEntries(
                EVENTS.map(({ key }) => [key, round(rate100(d.events[key], d.km), 2)]),
            ),
            gaps: EVENTS.filter(({ key }) => gapDays[key].includes(d.day)).map(({ key }) => key),
        }));
}

function summariseAreaWeather(rows) {
    const out = new Map();
    for (const row of rows) {
        if (!out.has(row.area_id)) {
            out.set(row.area_id, {
                meta: { name: row.area_name, city: row.city_name, kind: row.area_kind },
                days: 0, wetDays: 0, heavyRainDays: 0, precip: 0, tmaxSum: 0,
            });
        }
        const w = out.get(row.area_id);
        if (row.day === null || row.precip === null) continue;
        w.days += 1;
        w.precip += row.precip;
        w.tmaxSum += row.tmax ?? 0;
        if (row.precip >= WET_THRESHOLD_MM) w.wetDays += 1;
        if (row.precip >= HEAVY_RAIN_MM) w.heavyRainDays += 1;
    }
    return out;
}

function buildAreas(period, reference, conditionRate, areaDetail) {
    const areas = [];
    const lowExposure = { areas: 0, km: 0 };

    for (const [areaId, acc] of period.byArea) {
        if (acc.km < MIN_AREA_KM) {
            lowExposure.areas += 1;
            lowExposure.km += acc.km;
            continue;
        }

        const detail = areaDetail.get(areaId);
        const refAcc = reference.byArea.get(areaId);
        const wetAcc = period.byAreaCond.get(`${areaId}|wet`);

        const metrics = {};
        for (const ev of EVENTS) {
            // What the fleet as a whole would log over this area's km,
            // given the weather on the days those km were driven.
            let expected = 0;
            for (const condition of CONDITIONS) {
                const c = period.byAreaCond.get(`${areaId}|${condition}`);
                if (c) expected += (c.eventKm[ev.key] / 100) * conditionRate(ev.key, condition);
            }

            const observed = acc.events[ev.key];
            const rate = rate100(observed, acc.eventKm[ev.key]);

            metrics[ev.key] = {
                ...compareToExpected(observed, expected),
                ratePer100Km: round(rate, 2),
                pPer10Km: round(probWithin(rate), 3),
                recordedKm: round(acc.eventKm[ev.key], 0),
                vsReference: refAcc && refAcc.eventKm[ev.key] >= MIN_AREA_KM
                    ? rateRatio(observed, acc.eventKm[ev.key], refAcc.events[ev.key], refAcc.eventKm[ev.key])
                    : null,
            };
        }

        const weather = detail && detail.days > 0
            ? {
                daysWithData: detail.days,
                wetDays: detail.wetDays,
                heavyRainDays: detail.heavyRainDays,
                totalPrecipMm: round(detail.precip, 1),
                avgMaxTempC: round(detail.tmaxSum / detail.days, 1),
            }
            : null;

        areas.push({
            areaId,
            name: detail ? detail.meta.name : `Area ${areaId}`,
            city: detail ? detail.meta.city : null,
            kind: detail ? detail.meta.kind : null,
            km: round(acc.km, 1),
            vehicles: period.areaVehicles.get(areaId)?.size ?? 0,
            wetKmShare: round((wetAcc ? wetAcc.km : 0) / acc.km, 3),
            weather,
            metrics,
        });
    }

    areas.sort((a, b) => b.km - a.km);

    return {
        areas: areas.slice(0, MAX_AREAS),
        truncated: areas.length > MAX_AREAS,
        lowExposure: { areas: lowExposure.areas, km: round(lowExposure.km, 1) },
    };
}

const STATUS_ORDER = ['above_fleet', 'in_line', 'below_fleet', 'insufficient_data', 'not_reported'];

function overallStatus(metrics) {
    const statuses = EVENTS
        .map(({ key }) => metrics[key].status)
        .filter((s) => s !== 'not_reported');
    if (statuses.includes('above_fleet')) return 'above_fleet';
    if (statuses.length === 0 || statuses.every((s) => s === 'insufficient_data')) return 'insufficient_data';
    if (statuses.includes('below_fleet')) return 'below_fleet';
    return 'in_line';
}

function buildVehicles(rows, period, conditionRate, areaDetail, notReported) {
    const vehicles = new Map();

    for (const row of rows) {
        if (!row.in_period) continue;
        const skip = notReported.get(row.vehicle_id);

        if (!vehicles.has(row.vehicle_id)) {
            vehicles.set(row.vehicle_id, {
                acc: emptyAcc(), expected: zeroEvents(), wetKm: 0, areaKm: new Map(),
            });
        }
        const v = vehicles.get(row.vehicle_id);
        addRow(v.acc, row, skip);
        if (row.condition === 'wet') v.wetKm += row.km;
        v.areaKm.set(row.area_id, (v.areaKm.get(row.area_id) || 0) + row.km);

        // Expected events: the rate the REST of the fleet showed in this same
        // area and weather (this vehicle's own driving is left out, so a
        // vehicle that dominates an area is not compared with itself).
        const areaCond = period.byAreaCond.get(`${row.area_id}|${row.condition}`);
        for (const { key } of EVENTS) {
            if (skip && skip.has(key)) continue;
            const rowKm = row[`km_${key}`] || 0;
            const parent = conditionRate(key, row.condition);
            const othersEvents = Math.max(0, areaCond.events[key] - (row[key] || 0));
            const othersKm = Math.max(0, areaCond.eventKm[key] - rowKm);
            v.expected[key] += (rowKm / 100) * shrunkRate(othersEvents, othersKm, parent);
        }
    }

    const out = [];
    for (const [vehicleId, v] of vehicles) {
        if (!(v.acc.km > 0)) continue;

        let mainAreaId = null;
        let mainKm = -1;
        for (const [areaId, km] of v.areaKm) {
            if (km > mainKm) { mainAreaId = areaId; mainKm = km; }
        }
        const main = areaDetail.get(mainAreaId);
        const skip = notReported.get(vehicleId);

        const metrics = {};
        for (const ev of EVENTS) {
            if (skip && skip.has(ev.key)) {
                metrics[ev.key] = {
                    observed: 0, expected: null, ratio: null, pValue: null,
                    status: 'not_reported', ratePer100Km: null,
                };
                continue;
            }
            metrics[ev.key] = {
                ...compareToExpected(v.acc.events[ev.key], v.expected[ev.key]),
                ratePer100Km: round(rate100(v.acc.events[ev.key], v.acc.eventKm[ev.key]), 2),
            };
        }

        out.push({
            vehicleId,
            km: round(v.acc.km, 1),
            wetKmShare: round(v.wetKm / v.acc.km, 3),
            mainArea: main ? main.meta.name : null,
            areasVisited: v.areaKm.size,
            status: overallStatus(metrics),
            metrics,
        });
    }

    out.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
        || b.km - a.km);
    return out;
}

function gapWarning(gapDays, periodStart) {
    const byDay = new Map();
    for (const ev of EVENTS) {
        for (const day of gapDays[ev.key]) {
            if (day < periodStart) continue;
            if (!byDay.has(day)) byDay.set(day, []);
            byDay.get(day).push(ev.label.toLowerCase());
        }
    }
    if (byDay.size === 0) return null;
    const parts = [...byDay.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([day, labels]) => `${day} (${labels.join(', ')})`);
    return `Event data looks incomplete on ${parts.join('; ')}: far fewer events were recorded than the km driven would normally produce. Those days are left out of the rates and comparisons for the affected events.`;
}

function notReportedWarning(counts) {
    const parts = EVENTS
        .filter(({ key }) => counts[key] > 0)
        .map(({ key, label }) => `${counts[key]} for ${label.toLowerCase()}`);
    if (parts.length === 0) return null;
    return `Some vehicles recorded none of an event type over distances where the fleet would normally record 20 or more (${parts.join(', ')}). Their devices are probably not reporting that event, so they are left out of it rather than counted as perfect. Check those devices' event settings.`;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function emptySections() {
    return {
        coverage: null,
        fleet: [],
        weatherImpact: null,
        daily: [],
        areas: [],
        areasTruncated: false,
        lowExposureAreas: { areas: 0, km: 0 },
        vehicles: [],
    };
}

/**
 * @param db          pg pool
 * @param vehicleIds  vehicles in scope
 * @param endDate     last day of the period, 'YYYY-MM-DD' (local)
 * @param days        1..7
 */
async function getWeatherAreaReport(db, vehicleIds, { endDate, days }) {
    const periodStart = addDays(endDate, -(days - 1));
    const referenceStart = addDays(periodStart, -REFERENCE_DAYS);
    const referenceEnd = addDays(periodStart, -1);
    const ids = (vehicleIds || []).map(String);
    const warnings = [];

    const base = {
        period: { fromDate: periodStart, toDate: endDate, days },
        reference: { fromDate: referenceStart, toDate: referenceEnd, days: REFERENCE_DAYS },
        method: {
            wetThresholdMm: WET_THRESHOLD_MM,
            heavyRainMm: HEAVY_RAIN_MM,
            probabilityKm: PROBABILITY_KM,
            priorKm: PRIOR_KM,
            minExpected: MIN_EXPECTED,
            alpha: ALPHA,
            highRatio: HIGH_RATIO,
            lowRatio: LOW_RATIO,
            minAreaKm: MIN_AREA_KM,
            gapRatio: GAP_RATIO,
            notReportedMinExpected: NOT_REPORTED_MIN_EXPECTED,
        },
        events: EVENTS,
    };

    if (ids.length === 0) {
        return { ...base, ...emptySections(), warnings: ['There are no vehicles in the selected scope.'] };
    }

    const unbuilt = await db.query(UNBUILT_DAYS_SQL, [periodStart, endDate]);
    if (unbuilt.rows.length) {
        warnings.push(
            `Area summaries have not been built for ${unbuilt.rows.map((r) => r.day).join(', ')}. `
            + 'Driving on those days is missing from this report.',
        );
    }

    try {
        const cells = await db.query(CELLS_SQL, [referenceStart, endDate, ids]);
        await ensureWeather(db, cells.rows, referenceStart, endDate);
    } catch (err) {
        console.error('Weather fetch failed:', err);
        warnings.push('Weather could not be fetched for part of this period. That distance is counted as unknown weather.');
    }

    const baseParams = [referenceStart, endDate, ids, WET_THRESHOLD_MM, periodStart];

    // Pass 1: daily totals across the whole window, to find days with
    // missing event data.
    const dailyResult = await db.query(DAILY_SQL, [...baseParams, ...EVENTS.map(() => [])]);
    const dailyTotals = aggregateDaily(dailyResult.rows);
    const gapDays = detectGapDays(dailyTotals);

    // Pass 2: everything else, with gap days removed per event.
    const params = [...baseParams, ...EVENTS.map(({ key }) => gapDays[key])];
    const [grouped, statsResult, vehicleDayResult] = await Promise.all([
        db.query(GROUPED_SQL, params),
        db.query(STATS_SQL, params),
        db.query(VEHICLE_DAY_SQL, params),
    ]);

    const rows = grouped.rows;
    const stats = statsResult.rows[0];
    const { notReported, counts: notReportedCounts } = detectNotReported(rows);
    const { period, reference, pooled } = summarise(rows, notReported);

    if (!(period.all.km > 0)) {
        return {
            ...base,
            ...emptySections(),
            warnings: [...warnings, 'No driving was recorded for this scope in the selected period.'],
        };
    }

    const gapText = gapWarning(gapDays, periodStart);
    if (gapText) warnings.push(gapText);
    const notReportedText = notReportedWarning(notReportedCounts);
    if (notReportedText) warnings.push(notReportedText);

    if (!(reference.all.km >= MIN_AREA_KM)) {
        warnings.push(`There is no driving in the ${REFERENCE_DAYS} days before this period, so comparisons with normal are unavailable.`);
    }
    if (stats.vehicle_days_missing_distance > 0) {
        warnings.push(`${stats.vehicle_days_missing_distance} vehicle-days have telemetry but no daily distance, so their events count without any km. Rates for those vehicles are overstated.`);
    }
    const unknownShare = stats.period_km > 0 ? stats.period_unknown_weather_km / stats.period_km : 0;
    if (unknownShare > 0.1) {
        warnings.push(`${Math.round(unknownShare * 100)}% of the distance has no weather data and is excluded from the wet/dry comparison.`);
    }

    const areaIds = [...new Set(rows.filter((r) => r.in_period).map((r) => r.area_id))];
    const areaDetailResult = await db.query(AREA_DETAIL_SQL, [areaIds, periodStart, endDate]);
    const areaDetail = summariseAreaWeather(areaDetailResult.rows);

    const conditionRate = makeConditionRate(period);
    const areaSection = buildAreas(period, reference, conditionRate, areaDetail);
    const shares = vehicleDayShares(vehicleDayResult.rows, notReported);

    return {
        ...base,
        warnings,
        coverage: {
            vehiclesInScope: ids.length,
            vehiclesWithDriving: new Set(rows.filter((r) => r.in_period && r.km > 0).map((r) => r.vehicle_id)).size,
            periodKm: round(period.all.km, 0),
            referenceKm: round(reference.all.km, 0),
            areasVisited: period.byArea.size,
            wetKmShare: round((period.byCond.get('wet')?.km || 0) / period.all.km, 3),
            unknownWeatherKmShare: round(unknownShare, 3),
            vehicleDaysMissingDistance: stats.vehicle_days_missing_distance,
            gapDays,
            vehiclesNotReporting: notReportedCounts,
        },
        fleet: buildFleetSummary(period, reference, shares, notReportedCounts),
        weatherImpact: buildWeatherImpact(pooled, stats, { fromDate: referenceStart, toDate: endDate }),
        daily: buildDaily(dailyTotals, periodStart, gapDays),
        areas: areaSection.areas,
        areasTruncated: areaSection.truncated,
        lowExposureAreas: areaSection.lowExposure,
        vehicles: buildVehicles(rows, period, conditionRate, areaDetail, notReported),
    };
}

module.exports = {
    getWeatherAreaReport,
    MAX_DAYS,
    EVENTS,
    // exported for unit tests
    _internal: {
        rateRatio,
        mantelHaenszelRateRatio,
        poissonUpperTail,
        poissonLowerTail,
        compareToExpected,
        shrunkRate,
        probWithin,
        detectGapDays,
        detectNotReported,
    },
};