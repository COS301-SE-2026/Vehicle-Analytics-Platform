'use strict';

const { pool } = require('../db/pool');
const { success, error } = require('../utils/response');
const { getDataClock } = require('../services/period');
const { resolveScope, ScopeError } = require('../services/scopeResolver');
const { getWeatherAreaReport, MAX_DAYS } = require('../services/weatherAreaAnalytics');
const { toLocalDate } = require('../utils/dateUtils');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reads a parameter value supporting both snake_case and camelCase keys.
 */
function readParam(body, snake, camel) {
    if (body[snake] !== undefined && body[snake] !== null) return body[snake];
    if (body[camel] !== undefined && body[camel] !== null) return body[camel];
    return undefined;
}

/**
 * Validates format and calendar accuracy of a YYYY-MM-DD date string.
 */
function isValidIsoDate(dateStr) {
    if (typeof dateStr !== 'string' || !ISO_DATE.test(dateStr)) return false;
    const d = new Date(dateStr);
    return !Number.isNaN(d.getTime());
}

/**
 * Generate weather area analytics report for a resolved fleet/vehicle scope
 * POST /api/reports/weather
 */
async function generateWeatherReport(req, res) {
    try {
        const body = req.body || {};

        const scopeType = readParam(body, 'scope_type', 'scopeType') || 'fleet';
        const scopeId = readParam(body, 'scope_id', 'scopeId') || null;

        const daysParam = readParam(body, 'days', 'days') ?? MAX_DAYS;
        const days = Number(daysParam);

        if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
            throw new ScopeError(`days must be a whole number from 1 to ${MAX_DAYS}`, 400);
        }

        const rawEnd = readParam(body, 'end_date', 'endDate');
        if (rawEnd !== undefined && !isValidIsoDate(String(rawEnd))) {
            throw new ScopeError('end_date must be a valid date in YYYY-MM-DD format', 400);
        }

        const scope = await resolveScope(pool, req.user, { scopeType, scopeId });

        // Default to the day of the newest telemetry, not the wall clock
        const endDate = rawEnd || toLocalDate(await getDataClock(pool));

        const report = await getWeatherAreaReport(pool, scope.vehicleIds, { endDate, days });

        return success(res, {
            report: {
                generatedAt: new Date().toISOString(),
                scope: {
                    type: scope.scopeType,
                    id: scope.scopeId,
                    label: scope.label,
                    vehicleCount: scope.vehicleCount,
                },
                requestedBy: { role: scope.role },
            },
            ...report,
        }, 200);
    } catch (err) {
        if (err instanceof ScopeError) {
            return error(res, err.message, err.statusCode || 400);
        }
        console.error('Generate weather report error:', err);
        return error(res, 'Failed to generate weather report', 500);
    }
}

module.exports = { generateWeatherReport };