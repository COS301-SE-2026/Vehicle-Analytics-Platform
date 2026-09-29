'use strict';

const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');
const { resolvePeriod, getDataClock, PERIOD_TYPES } = require('../services/period');
const { resolveScope, ScopeError } = require('../services/scopeResolver');
const { getAnomalyFeatures } = require('../services/anomalyAnalytics');
const { detectFleetAnomalies } = require('../services/anomalyDetection');
const DEFAULT_PERIOD_TYPE = 'current';
const DEFAULT_CURRENT_DAYS = 7;
const FOCUSED_SCOPE_TYPES = new Set(['vehicle', 'vehicles']);

function handleError(res, err, context) {
    if (err instanceof ScopeError) {
        return error(res, err.message, err.statusCode);
    }

    console.error(`${context}:`, err);

    const message = process.env.NODE_ENV === 'production'
        ? 'Failed to detect anomalies'
        : `Anomaly detection failed: ${err.message}`;

    return error(res, message, 500);
}

function readParam(input, snake, camel) {
    if (input[snake] !== undefined && input[snake] !== null && input[snake] !== '') return input[snake];
    if (input[camel] !== undefined && input[camel] !== null && input[camel] !== '') return input[camel];
    return undefined;
}

function parseDate(value, field) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new ScopeError(`Invalid ${field} date`, 400);
    }
    return date;
}

async function resolveRequestedPeriod(db, input) {
    const periodType = readParam(input, 'period_type', 'periodType') || DEFAULT_PERIOD_TYPE;

    if (!PERIOD_TYPES.includes(periodType)) {
        throw new ScopeError(
            `Invalid period_type. Expected one of: ${PERIOD_TYPES.join(', ')}`,
            400,
        );
    }

    if (periodType === 'custom') {
        const from = readParam(input, 'from', 'fromDate');
        const to = readParam(input, 'to', 'toDate');

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

    const rawAnchor = readParam(input, 'anchor', 'anchor');
    const anchor = rawAnchor ? parseDate(rawAnchor, 'anchor') : await getDataClock(db);
    const currentDays = Number(readParam(input, 'current_days', 'currentDays')) || DEFAULT_CURRENT_DAYS;

    return resolvePeriod({ periodType, anchor, currentDays });
}


async function resolvePeerGroup(db, user, scope){
    if (!FOCUSED_SCOPE_TYPES.has(scope.scopeType)) {
        return {
            peerScope: scope,
            peerVehicleIds: scope.vehicleIds,
            focusIds: null,
            peerNoun: scope.scopeType === 'group' ? 'group' : 'fleet',
        };
    }

    const fleet = await resolveScope(db, user, { scopeType: 'fleet', scopeId: null });

    const peerVehicleIds = [...new Set([...fleet.vehicleIds, ...scope.vehicleIds])];

    return {
        peerScope: fleet,
        peerVehicleIds,
        focusIds: scope.vehicleIds,
        peerNoun: 'fleet',
    };
}

async function getAnomalies(req, res) {
    try {
        const input = { ...(req.query || {}), ...(req.body || {}) };

        const scopeType = readParam(input, 'scope_type', 'scopeType') || 'fleet';
        const scopeId = readParam(input, 'scope_id', 'scopeId') || null;

        const scope = await resolveScope(pool, req.user, { scopeType, scopeId });
        const period = await resolveRequestedPeriod(pool, input);
        const peers = await resolvePeerGroup(pool, req.user, scope);

        const features = await getAnomalyFeatures(pool, peers.peerVehicleIds, period);
        const detection = detectFleetAnomalies(features, {
            focusIds: peers.focusIds,
            peerNoun: peers.peerNoun,
        });

        return success(res, {
            generatedAt: new Date().toISOString(),
            scope: {
                type: scope.scopeType,
                id: scope.scopeId,
                label: scope.label,
                vehicleCount: scope.vehicleCount,
                groupIds: scope.groupIds,
            },
            peerGroup: {
                type: peers.peerScope.scopeType,
                label: peers.peerScope.label,
                vehicleCount: peers.peerVehicleIds.length,
            },
            period: {
                type: period.type,
                label: period.label,
                fromDate: period.fromDate,
                toDate: period.toDate,
                days: period.days,
            },
            anomalies: detection,
        }, 200);
    } catch (err) {
        return handleError(res, err, 'Detect anomalies error');
    }
}

module.exports = {
    getAnomalies,
    _resolveRequestedPeriod: resolveRequestedPeriod,
    _resolvePeerGroup: resolvePeerGroup,
};