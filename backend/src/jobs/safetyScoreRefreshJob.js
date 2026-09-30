

const cron = require('node-cron');
const { pool } = require('../db/pool');

async function runSafetyScoreRefresh() {
  console.log('[SAFETY-CRON] Refreshing daily safety scores...');
  try {
    await pool.query('CALL refresh_safety_scores_daily(0, $1::jsonb)', ['{}']);
    console.log('[SAFETY-CRON] Refresh complete.');
  } catch (err) {
    console.error('[SAFETY-CRON] Failed:', err.message);
  }
}

function startSafetyScoreRefreshJob() {
  cron.schedule('0 2 * * *', runSafetyScoreRefresh, {
    timezone: 'Africa/Johannesburg',
  });
  console.log('[SAFETY-CRON] Scheduled daily safety score refresh at 02:00 SAST');
}

module.exports = { startSafetyScoreRefreshJob, runSafetyScoreRefresh };
