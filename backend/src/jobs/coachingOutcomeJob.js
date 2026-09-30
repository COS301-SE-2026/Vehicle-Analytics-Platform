

const cron = require('node-cron');
const RiskPredictionService = require('../services/riskPredictionService');

const service = new RiskPredictionService();

async function runCoachingOutcomeCheck() {
  console.log('[COACH-CRON] Measuring coaching outcomes...');
  try {
    const { updated } = await service.measureCoachingOutcomes();
    console.log(`[COACH-CRON] Updated ${updated} interventions.`);
  } catch (err) {
    console.error('[COACH-CRON] Failed:', err.message);
  }
}

function startCoachingOutcomeJob() {
  cron.schedule('0 4 * * *', runCoachingOutcomeCheck, {
    timezone: 'Africa/Johannesburg',
  });
  console.log('[COACH-CRON] Scheduled daily coaching outcome check at 04:00 SAST');
}

module.exports = { startCoachingOutcomeJob, runCoachingOutcomeCheck };
