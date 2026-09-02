'use strict';

const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');

const {
    resolvePeriod,
    getDataClock,
    weeksInPeriod,
    trendCoverage,
    PERIOD_TYPES,
} = require('../services/period');

const { resolveScope, listAvailableScopes, ScopeError } = require('../services/scopeResolver');

const { getSafetyAnalytics } = require('../services/safetyAnalytics');
const { getDistanceAnalytics } = require('../services/distanceAnalytics');
const { getFuelAnalytics } = require('../services/fuelAnalytics');

const { compareSummaries, isBaselineSufficient } = require('../services/compare');
const { topPerformers, requiresAttention, mergeEntities } = require('../services/rank');
const { buildTrends, MIN_WEEKS_FOR_TREND } = require('../services/trend');

const COMPARED_METRICS = [
    'safetyScore',
    'totalEvents',
    'harshBrakes',
    'harshAccelerations',
    'harshCornering',
    'crashes',
    'overspeedEvents',
    'idlingEvents',
];

const DISTANCE_COMPARED_METRICS = [
    'totalDistanceKm',
    'totalDurationSeconds',
    'totalMovingSeconds',
    'totalIdleSeconds',
    'idleRatio',
    'tripCount',
    'avgTripDistanceKm',
    'avgMovingSpeedKmh',
    'activeVehicles',
    'utilisationPct',
];

const FUEL_COMPARED_METRICS = [
    'totalFuelLiters',
    'avgEfficiencyKmPerL',
    'avgConsumptionLPer100Km',
    'tripsWithFuelData',
];

const TREND_METRICS = [
    'utilisationPct',
    'totalDistanceKm',
    'safetyScore',
    'totalEvents',
    'harshBrakes',
    'harshAccelerations',
    'harshCornering',
    'overspeedEvents',
    'idlingEvents',
];

const DEFAULT_CURRENT_DAYS = 7;

function handleError(res, err, context){
    if (err instanceof ScopeError) {
        return error(res, err.message, err.statusCode);
    }
    console.error(`${context}:`, err);
    return error(res, 'Failed to generate report', 500);
}

function readParam(body, snake, camel){
    if (body[snake] !== undefined && body[snake] !== null) return body[snake];
    if (body[camel] !== undefined && body[camel] !== null) return body[camel];
    return undefined;
}

function parseDate(value, field){
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new ScopeError(`Invalid ${field} date`, 400);
    }
    return date;
}

async function resolveRequestedPeriod(db, body){
    const periodType = readParam(body, 'period_type', 'periodType') || 'weekly';

    if (!PERIOD_TYPES.includes(periodType)) {
        throw new ScopeError(
            `Invalid period_type. Expected one of: ${PERIOD_TYPES.join(', ')}`,
            400,
        );
    }

    if (periodType === 'custom') {
        const from = readParam(body, 'from', 'fromDate');
        const to = readParam(body, 'to', 'toDate');

        if (!from || !to) {
            throw new ScopeError("A custom period requires both 'from' and 'to'", 400);
        }

        try {
            return resolvePeriod({
                periodType,
                from: parseDate(from, 'from'),
                to: parseDate(to, 'to'),
            });
        } catch (err) {
            if (err instanceof ScopeError) throw err;
            throw new ScopeError(err.message, 400);
        }
    }

    const rawAnchor = readParam(body, 'anchor', 'anchor');
    const anchor = rawAnchor ? parseDate(rawAnchor, 'anchor') : await getDataClock(db);
    const currentDays = Number(readParam(body, 'current_days', 'currentDays')) || DEFAULT_CURRENT_DAYS;

    return resolvePeriod({ periodType, anchor, currentDays });
}

async function runAnalytics(db, vehicleIds, window){
    const [safety, distance, fuel] = await Promise.all([
        getSafetyAnalytics(db, vehicleIds, window),
        getDistanceAnalytics(db, vehicleIds, window),
        getFuelAnalytics(db, vehicleIds, window),
    ]);

    return { safety, distance, fuel };
}

async function buildWeeklyTrends(db, vehicleIds, period){
    const weeks = weeksInPeriod(period);

    if (weeks.length < MIN_WEEKS_FOR_TREND) return null;

    const weeklySummaries = await Promise.all(
        weeks.map(async (week) => {
            const [safety, distance] = await Promise.all([
                getSafetyAnalytics(db, vehicleIds, week),
                getDistanceAnalytics(db, vehicleIds, week),
            ]);
            return { ...distance.summary, ...safety.summary };
        }),
    );

    return {
        coverage: trendCoverage(period, weeks),
        weeks: weeks.map((w) => ({
            index: w.index,
            label: w.label,
            dateLabel: w.dateLabel,
            fromDate: w.fromDate,
            toDate: w.toDate,
        })),
        metrics: buildTrends(TREND_METRICS, weeks, weeklySummaries),
    };
}

function buildRankings(current) {
    const merged = mergeEntities([
        current.distance.vehicles,
        current.fuel.vehicles,
        current.safety.vehicles,
    ]);

    return {
        entities: merged,
        safestVehicles: topPerformers(merged, 'safetyScore'),
        vehiclesRequiringAttention: requiresAttention(merged, 'safetyScore'),
        mostEvents: requiresAttention(merged, 'totalEvents'),
        highestUtilisation: topPerformers(merged, 'utilisationPct'),
        mostIdle: requiresAttention(merged, 'idleRatio'),
        bestFuelEfficiency: topPerformers(merged, 'avgEfficiencyKmPerL'),
    };
}

function buildNotes({ scope, period, current, previous, baselineSufficient, trends }){
    const notes = [];

    if (!scope.vehicleCount) {
        notes.push('No vehicles fall inside this scope, so every metric is empty.');
    }

    if (!current.safety.summary.hasTelemetry) {
        notes.push(
            `No telemetry was recorded between ${period.fromDate} and ${period.toDate}, `
            + 'so safety scores cannot be calculated for this period.',
        );
    }

    if (period.previous && !baselineSufficient) {
        notes.push(
            `Too few vehicles were active during ${period.previous.label} for percentage `
            + 'changes to be meaningful, so comparisons are shown without a verdict.',
        );
    }

    if (!period.previous) {
        notes.push('This period has no comparable previous period.');
    }

    notes.push(
        'V.A.P.O.R has no driver entity, so all behaviour metrics are attributed to the '
        + 'vehicle rather than to a named driver.',
    );

    notes.push(
        'Fuel figures are modelled from speed and road class, not measured from a fuel '
        + 'sensor, and are labelled estimated throughout.',
    );

    if (scope.unassignedVehicleCount > 0 && scope.scopeType === 'fleet') {
        notes.push(
            `${scope.unassignedVehicleCount} vehicle(s) belong to no fleet group and are `
            + 'therefore outside every manager-scoped report.',
        );
    }

    if (trends && trends.coverage.leadInDays > 0) {
        notes.push(
            `Weekly trend buckets start on ${trends.coverage.firstDate}; the first `
            + `${trends.coverage.leadInDays} day(s) of the period fall outside a whole week.`,
        );
    }

    return notes;
}

async function generateReport(req, res){
    try {
        const body = req.body || {};

        const scopeType = readParam(body, 'scope_type', 'scopeType') || 'fleet';
        const scopeId = readParam(body, 'scope_id', 'scopeId') || null;

        const scope = await resolveScope(pool, req.user, { scopeType, scopeId });
        const period = await resolveRequestedPeriod(pool, body);

        const current = await runAnalytics(pool, scope.vehicleIds, period);

        const previous = period.previous
            ? await runAnalytics(pool, scope.vehicleIds, period.previous)
            : null;

        const baselineSufficient = previous
            ? isBaselineSufficient(previous.distance.summary)
            : false;

        const compareOptions = { baselineSufficient };

        const trends = await buildWeeklyTrends(pool, scope.vehicleIds, period);
        const rankings = buildRankings(current);

        const notes = buildNotes({
            scope, period, current, previous, baselineSufficient, trends,
        });

        return success(res, {
            report: {
                generatedAt: new Date().toISOString(),
                scope: {
                    type: scope.scopeType,
                    id: scope.scopeId,
                    label: scope.label,
                    vehicleCount: scope.vehicleCount,
                    groupIds: scope.groupIds,
                    unassignedVehicleCount: scope.unassignedVehicleCount,
                },
                requestedBy: { role: scope.role },
            },

            period: {
                type: period.type,
                label: period.label,
                fromDate: period.fromDate,
                toDate: period.toDate,
                days: period.days,
            },

            previousPeriod: period.previous
                ? {
                    label: period.previous.label,
                    fromDate: period.previous.fromDate,
                    toDate: period.previous.toDate,
                    days: period.previous.days,
                }
                : null,

            coverage: {
                hasTelemetry: current.safety.summary.hasTelemetry,
                vehiclesInScope: scope.vehicleCount,
                vehiclesWithEvents: current.safety.summary.vehiclesWithEvents,
                activeVehicles: current.distance.summary.activeVehicles,
                inactiveVehicles: current.distance.summary.inactiveVehicles,
                baselineSufficient,
            },

            safety: {
                summary: current.safety.summary,
                vehicles: current.safety.vehicles,
                comparison: previous
                    ? compareSummaries(
                        current.safety.summary,
                        previous.safety.summary,
                        { ...compareOptions, metrics: COMPARED_METRICS },
                    )
                    : null,
            },

            distance: {
                summary: current.distance.summary,
                vehicles: current.distance.vehicles,
                comparison: previous
                    ? compareSummaries(
                        current.distance.summary,
                        previous.distance.summary,
                        { ...compareOptions, metrics: DISTANCE_COMPARED_METRICS },
                    )
                    : null,
            },

            fuel: {
                summary: current.fuel.summary,
                vehicles: current.fuel.vehicles,
                comparison: previous
                    ? compareSummaries(
                        current.fuel.summary,
                        previous.fuel.summary,
                        { ...compareOptions, metrics: FUEL_COMPARED_METRICS },
                    )
                    : null,
            },

            rankings,
            trends,
            notes,
        }, 200);
    } catch (err) {
        return handleError(res, err, 'Generate report error');
    }
}

async function getReportScopes(req, res) {
    try {
        const scopes = await listAvailableScopes(pool, req.user);
        return success(res, scopes, 200);
    } catch (err) {
        return handleError(res, err, 'Get report scopes error');
    }
}

module.exports = {
    generateReport,
    getReportScopes,
};