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

const { buildReportPdf, reportFilename } = require('../services/reportPdf');
const { saveReport, listReports, getReport } = require('../services/reportStore');
const { runScheduledReports } = require('../services/reportRunner');

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
const MAX_TREND_WEEKS = 6;
const OUTPUT_FORMATS = ['json', 'pdf'];

function handleError(res, err, context) {
    if (err instanceof ScopeError) {
        return error(res, err.message, err.statusCode);
    }
    console.error(`${context}:`, err);
    return error(res, 'Failed to generate report', 500);
}

function readParam(body, snake, camel) {
    if (body[snake] !== undefined && body[snake] !== null) return body[snake];
    if (body[camel] !== undefined && body[camel] !== null) return body[camel];
    return undefined;
}

function parseDate(value, field) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new ScopeError(`Invalid ${field} date`, 400);
    }
    return date;
}

async function resolveRequestedPeriod(db, body) {
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

async function runAnalytics(db, vehicleIds, window) {
    const safety = await getSafetyAnalytics(db, vehicleIds, window);
    const distance = await getDistanceAnalytics(db, vehicleIds, window);
    const fuel = await getFuelAnalytics(db, vehicleIds, window);

    return { safety, distance, fuel };
}

async function buildWeeklyTrends(db, vehicleIds, period) {
    const allWeeks = weeksInPeriod(period);

    if (allWeeks.length < MIN_WEEKS_FOR_TREND) return null;

    const weeks = allWeeks.slice(-MAX_TREND_WEEKS);

    const weeklySummaries = [];
    for (const week of weeks) {
        /* eslint-disable no-await-in-loop */
        const safety = await getSafetyAnalytics(db, vehicleIds, week);
        const distance = await getDistanceAnalytics(db, vehicleIds, week);
        /* eslint-enable no-await-in-loop */
        weeklySummaries.push({ ...distance.summary, ...safety.summary });
    }

    return {
        coverage: trendCoverage(period, weeks),
        truncated: allWeeks.length > weeks.length,
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

async function buildReportPayload(db, user, request) {
    const scopeType = readParam(request, 'scope_type', 'scopeType') || 'fleet';
    const scopeId = readParam(request, 'scope_id', 'scopeId') || null;

    const scope = await resolveScope(db, user, { scopeType, scopeId });
    const period = await resolveRequestedPeriod(db, request);

    const current = await runAnalytics(db, scope.vehicleIds, period);

    const previous = period.previous
        ? await runAnalytics(db, scope.vehicleIds, period.previous)
        : null;

    const baselineSufficient = previous
        ? isBaselineSufficient(previous.distance.summary, current.distance.summary)
        : false;

    const compareOptions = { baselineSufficient };

    const trends = await buildWeeklyTrends(db, scope.vehicleIds, period);
    const rankings = buildRankings(current);

    return {
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
            vehiclesWithFuelData: current.fuel.summary.vehiclesWithFuelData,
            fuelIsEstimated: true,
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
    };
}

function sendPdf(res, payload) {
    const filename = reportFilename(payload);

    return buildReportPdf(payload).then((pdf) => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdf.length);
        return res.status(200).send(pdf);
    });
}

async function generateReport(req, res) {
    try {
        const body = req.body || {};

        const format = String(readParam(body, 'format', 'format') || 'json').toLowerCase();
        if (!OUTPUT_FORMATS.includes(format)) {
            throw new ScopeError(
                `Invalid format. Expected one of: ${OUTPUT_FORMATS.join(', ')}`,
                400,
            );
        }

        const payload = await buildReportPayload(pool, req.user, body);

        const persist = readParam(body, 'save', 'save') === true;
        let stored = null;

        if (persist) {
            stored = await saveReport(pool, {
                payload,
                trigger: 'manual',
                generatedBy: String(req.user?.id ?? 'unknown'),
            });
        }

        if (format === 'pdf') return sendPdf(res, payload);

        return success(res, stored ? { ...payload, storedReportId: stored.id } : payload, 200);
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


async function listReportHistory(req, res) {
    try {
        const result = await listReports(pool, req.user, {
            limit: req.query.limit,
            offset: req.query.offset,
            scopeType: req.query.scope_type || null,
            periodType: req.query.period_type || null,
            trigger: req.query.trigger || null,
        });

        return success(res, result, 200);
    } catch (err) {
        return handleError(res, err, 'List report history error');
    }
}

async function getStoredReport(req, res){
    try {
        const stored = await getReport(pool, req.user, req.params.id);
        return success(res, stored, 200);
    } catch (err) {
        return handleError(res, err, 'Get stored report error');
    }
}

async function getStoredReportPdf(req, res){
    try {
        const stored = await getReport(pool, req.user, req.params.id);
        return sendPdf(res, stored.dataset);
    } catch (err) {
        return handleError(res, err, 'Get stored report PDF error');
    }
}

async function runScheduled({ periodType = 'weekly', anchor = null } = {}){
    return runScheduledReports(pool, { buildReportPayload }, { periodType, anchor });
}



async function runScheduledHttp(req, res){
    try {
        const body = req.body || {};
        const summary = await runScheduled({
            periodType: readParam(body, 'period_type', 'periodType') || 'weekly',
            anchor: readParam(body, 'anchor', 'anchor') || null,
        });

        return success(res, summary, 200);
    } catch (err) {
        return handleError(res, err, 'Scheduled report run error');
    }
}


module.exports = {
    generateReport,
    getReportScopes,
    listReportHistory,
    getStoredReport,
    getStoredReportPdf,
    runScheduledHttp,

    buildReportPayload,
    runScheduled,
};