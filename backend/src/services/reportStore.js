'use strict';

const { assertCanReadReport,assertReportingUser, getAccessibleGroups, ScopeError,
} = require('./scopeResolver');

const DEFAULT_LIMIT = 25;


const MAX_LIMIT = 100;

const TRIGGERS = ['manual', 'scheduled'];


const SUMMARY_COLUMNS = `
    id,
    scope_type,
    scope_id,
    scope_label,
    group_ids,
    includes_unassigned,
    period_type,
    period_start::text AS period_start,
    period_end::text   AS period_end,
    generated_at,
    generated_by,
    trigger_source
`;

function toSummary(row){
    return {
        id: Number(row.id),
        scope: {
            type: row.scope_type,
            id: row.scope_id,
            label: row.scope_label,
            groupIds: (row.group_ids || []).map(Number),
            includesUnassigned: Boolean(row.includes_unassigned),
        },
        period: {
            type: row.period_type,
            fromDate: String(row.period_start).slice(0, 10),
            toDate: String(row.period_end).slice(0, 10),
        },
        generatedAt: row.generated_at,
        generatedBy: row.generated_by,
        trigger: row.trigger_source,
    };

}



async function saveReport(db, { payload, trigger = 'manual', generatedBy } = {}){
    if (!db || typeof db.query !== 'function') {
        throw new Error('saveReport requires a pg client or pool');
    }
    if (!payload || !payload.report || !payload.period) {
        throw new Error('saveReport requires a report dataset');
    }
    if (!TRIGGERS.includes(trigger)) {
        throw new Error(`Unknown trigger '${trigger}'`);
    }

    const { scope } = payload.report;
    const scopeId = Array.isArray(scope.id) ? scope.id.join(',') : scope.id;

    const values = [
        scope.type,
        scopeId || null,
        scope.label,
        scope.groupIds || [],
        Boolean(scope.includesUnassigned),
        payload.period.type,
        payload.period.fromDate,
        payload.period.toDate,
        generatedBy || 'unknown',
        trigger,
        JSON.stringify(payload),
    ];


    const conflictClause = trigger === 'scheduled'
        ? `ON CONFLICT (scope_type, COALESCE(scope_id, ''), period_type, period_start)
           WHERE trigger_source = 'scheduled'
           DO UPDATE SET
               scope_label         = EXCLUDED.scope_label,
               group_ids           = EXCLUDED.group_ids,
               includes_unassigned = EXCLUDED.includes_unassigned,
               period_end          = EXCLUDED.period_end,
               generated_at        = now(),
               generated_by        = EXCLUDED.generated_by,
               dataset             = EXCLUDED.dataset`
        : '';

    const result = await db.query(
        `INSERT INTO fleet_reports (
            scope_type, scope_id, scope_label, group_ids, includes_unassigned,
            period_type, period_start, period_end,
            generated_by, trigger_source, dataset
         ) VALUES ($1, $2, $3, $4::bigint[], $5, $6, $7, $8, $9, $10, $11::jsonb)
         ${conflictClause}
         RETURNING ${SUMMARY_COLUMNS}`,
        values,
    );

    return toSummary(result.rows[0]);
}

async function listReports(db, user, options = {}){
    const role = assertReportingUser(user);

    const {
        limit = DEFAULT_LIMIT,
        offset = 0,
        scopeType = null,
        periodType = null,
        trigger = null,
    } = options;

    const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

    const safeOffset = Math.max(Number(offset) || 0, 0);

    const conditions = [];

    const params = [];



    if (role !== 'admin') {
        const groups = await getAccessibleGroups(db, user);
        params.push(groups.map((g) => g.id));
        conditions.push(
            `cardinality(group_ids) > 0 AND group_ids <@ $${params.length}::bigint[] AND NOT includes_unassigned`,
        );
    }

    if (scopeType) {
        params.push(scopeType);
        conditions.push(`scope_type = $${params.length}`);
    }

    if (periodType) {
        params.push(periodType);
        conditions.push(`period_type = $${params.length}`);
    }

    if (trigger) {
        params.push(trigger);
        conditions.push(`trigger_source = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(safeLimit);

    params.push(safeOffset);

    const result = await db.query(
        `SELECT ${SUMMARY_COLUMNS}
         FROM fleet_reports
         ${where}
         ORDER BY generated_at DESC, id DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
    );

    return {
        reports: result.rows.map(toSummary),
        limit: safeLimit,
        offset: safeOffset,
    };

}

async function getReport(db, user, id){
    
    assertReportingUser(user);

    const reportId = Number(id);
    if (!Number.isInteger(reportId) || reportId < 1) {
        throw new ScopeError('Invalid report id', 400);
    }

    const result = await db.query(
        `SELECT ${SUMMARY_COLUMNS}, dataset
         FROM fleet_reports
         WHERE id = $1`,
        [reportId],
    );


    if (!result.rows.length) {
        throw new ScopeError('Report not found or not authorized', 403);
    }

    const row = result.rows[0];
    try {
        await assertCanReadReport(db, user, row.group_ids || [], Boolean(row.includes_unassigned));
    } catch (err) {
        if (err instanceof ScopeError && err.statusCode === 403) {
            throw new ScopeError('Report not found or not authorized', 403);
        }
        throw err;
    }

    return {
        ...toSummary(row),
        dataset: row.dataset,
    };
}

module.exports = {
    saveReport,
    listReports,
    getReport,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    TRIGGERS,
    _toSummary: toSummary,
};
