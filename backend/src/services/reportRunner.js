'use strict';

const { getAccessibleGroups } = require('./scopeResolver');

const { saveReport } = require('./reportStore');


const SYSTEM_USER = Object.freeze({ id: 0, role: 'admin', name: 'scheduler' });


const SCHEDULED_PERIOD_TYPES = ['weekly', 'monthly'];


function validateScheduledInputs(db, deps, periodType){
    if (!db || typeof db.query !== 'function') {
        throw new Error('runScheduledReports requires a pg client or pool');
    }

    const { buildReportPayload } = deps || {};
    if (typeof buildReportPayload !== 'function') {
        throw new Error('runScheduledReports requires a buildReportPayload function');
    }


    if (!SCHEDULED_PERIOD_TYPES.includes(periodType)) {
        throw new Error(
            `Scheduled reports support ${SCHEDULED_PERIOD_TYPES.join(' and ')}, got '${periodType}'`,
        );
    }


    return buildReportPayload;

}




function resolveRunAnchor(anchor, now){
    if (anchor === null || anchor === undefined || anchor === '') return now();

    const date = anchor instanceof Date ? anchor : new Date(anchor);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid scheduled report anchor '${anchor}'`);
    }
    return date;
}

async function runScheduledReports(db, deps, options = {}){
    const { periodType = 'weekly', anchor = null, now = () => new Date() } = options;
    const buildReportPayload = validateScheduledInputs(db, deps, periodType);
    const runAnchor = resolveRunAnchor(anchor, now);

    const startedAt = new Date();
    const groups = await getAccessibleGroups(db, SYSTEM_USER);

    const targets = [
        { scopeType: 'fleet', scopeId: null, label: 'Entire fleet' },
        ...groups.map((g) => ({ scopeType: 'group', scopeId: String(g.id), label: g.name })),
    ];

    const generated = [];

    const failed = [];

    for (const target of targets) {
        try {
            const payload = await buildReportPayload(db, SYSTEM_USER, {
                scope_type: target.scopeType,
                scope_id: target.scopeId,
                period_type: periodType,
                anchor: runAnchor.toISOString(),
            });



            const saved = await saveReport(db, {
                payload,
                trigger: 'scheduled',
                generatedBy: 'scheduler',
            });



            generated.push({
                reportId: saved.id,
                scopeType: target.scopeType,
                scopeId: target.scopeId,
                label: target.label,
                periodFrom: saved.period.fromDate,
                periodTo: saved.period.toDate,
                vehicleCount: payload.report.scope.vehicleCount,
                hasTelemetry: payload.coverage.hasTelemetry,
            });
            
        } catch (err) {
            console.error(
                `Scheduled ${periodType} report failed for ${target.scopeType} ${target.label}:`,
                err.message,
            );
            failed.push({
                scopeType: target.scopeType,
                scopeId: target.scopeId,
                label: target.label,
                error: err.message,
            });
        }
    }

    const finishedAt = new Date();

    const summary = {
        periodType,
        anchor: runAnchor.toISOString(),
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        attempted: targets.length,
        generated,
        failed,
    };

    console.log(
        `Scheduled ${periodType} reports: ${generated.length} generated, `
        + `${failed.length} failed, ${summary.durationMs}ms`,
    );

    return summary;
}

module.exports = {
    runScheduledReports,
    SYSTEM_USER,
    SCHEDULED_PERIOD_TYPES,
};