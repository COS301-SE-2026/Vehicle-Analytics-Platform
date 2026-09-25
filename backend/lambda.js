const serverless = require('serverless-http');
const app = require('./src/app');
const { runScheduled } = require('./src/controllers/reportController');

const httpHandler = serverless(app);

function scheduledJob(event){
    if (!event || typeof event !== 'object') return null;
    const job = event.vaporScheduledReport;
    if (!job || typeof job !== 'object') return null;
    return job;
}

async function handler(event, context) {
    const job = scheduledJob(event);
    if (!job) return httpHandler(event, context);

    const summary = await runScheduled({
    periodType: job.periodType, anchor: job.scheduledTime || null,

});

if (summary.failed.length > 0) {
    const labels = summary.failed.map((f) => f.label).join(', ');
    throw new Error(`Scheduled ${summary.periodType} reports failed for: ${labels}`);

}

    return summary;
}

module.exports = { handler, _scheduledJob: scheduledJob };
