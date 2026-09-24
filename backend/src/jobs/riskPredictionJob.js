

const cron = require('node-cron');
const RiskPredictionService = require('../services/riskPredictionService');

const service = new RiskPredictionService();

async function runDailyRiskPrediction() {
  console.log('[RISK-CRON] Running daily risk prediction...');
  try {
    const { scored, alerts } = await service.predictAll();
    console.log(`[RISK-CRON] Scored ${scored} vehicles, ${alerts} alerts raised.`);
  } catch (err) {
    console.error('[RISK-CRON] Failed:', err.message);
  }
}

function startRiskPredictionJob() {
  cron.schedule('0 3 * * *', runDailyRiskPrediction, {
    timezone: 'Africa/Johannesburg',
  });
  console.log('[RISK-CRON] Scheduled daily risk prediction at 03:00 SAST');
}

module.exports = { startRiskPredictionJob, runDailyRiskPrediction };
