'use strict';

const { assertCanReadReport, ScopeError } = require('./scopeResolver');

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const TRIGGERS = ['manual', 'scheduled'];

const SUMMARY_COLUMNS = `
    id,
    scope_type,
    scope_id,
    scope_label,
    group_ids,
    period_type,
    period_start,
    period_end,
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
        },
        period: {
            type: row.period_type,
            fromDate: row.period_start instanceof Date ? row.period_start.toISOString().slice(0, 10) : String(row.period_start).slice(0, 10),
            toDate: row.period_end instanceof Date ? row.period_end.toISOString().slice(0, 10) : String(row.period_end).slice(0, 10),
        },
        generatedAt: row.generated_at,
        generatedBy: row.generated_by,
        trigger: row.trigger_source,
    };

}

async function saveReport(db, { payload, trigger = 'manual', generatedBy }){
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
               scope_label    = EXCLUDED.scope_label,
               group_ids      = EXCLUDED.group_ids,
               period_end     = EXCLUDED.period_end,
               generated_at   = now(),
               generated_by   = EXCLUDED.generated_by,
               dataset        = EXCLUDED.dataset`
        : '';

    const result = await db.query(
        `INSERT INTO fleet_reports (
            scope_type, scope_id, scope_label, group_ids,
            period_type, period_start, period_end,
            generated_by, trigger_source, dataset
         ) VALUES ($1, $2, $3, $4::bigint[], $5, $6, $7, $8, $9, $10::jsonb)
         ${conflictClause}
         RETURNING ${SUMMARY_COLUMNS}`,
        values,
    );

    return toSummary(result.rows[0]);
    

}