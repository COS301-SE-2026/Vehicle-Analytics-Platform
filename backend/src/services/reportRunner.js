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