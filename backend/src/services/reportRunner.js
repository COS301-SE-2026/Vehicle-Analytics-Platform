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