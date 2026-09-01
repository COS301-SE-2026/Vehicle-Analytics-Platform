'use strict';

const { pool } = require('../db/pool');

const { success, error } = require('../utils/response');

const { resolvePeriod, getDataClock, PERIOD_TYPES } = require('../services/periods');

const { resolveScope, listAvailableScopes, ScopeError } = require('../services/scopeResolver');

const { getSafetyAnalytics } = require('../services/safetyAnalytics');

const { compareSummaries, isBaselineSufficient } = require('../services/compare');

const { topPerformers, requiresAttention } = require('../services/rank');


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



function handleError(res, err, context){
    if (err instanceof ScopeError) {
        return error(res, err.message, err.statusCode);
    }
    console.error(`${context}:`, err);
    return error(res, 'Failed to generate report', 500);
}