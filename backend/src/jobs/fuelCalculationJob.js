// backend/src/jobs/fuelCalculationJob.js
const cron = require('node-cron');
const { pool } = require('../db/pool');
const FuelHistoryService = require('../services/fuelHistoryService');

const fuelHistoryService = new FuelHistoryService();

async function calculateFuelForAllVehicles() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  console.log('[FUEL-CRON] Starting daily fuel calculation for', yesterday.toISOString().slice(0, 10));

  let successCount = 0;
  let failCount = 0;

  try {
    const { rows } = await pool.query('SELECT DISTINCT vehicle_id FROM vehicles');

    for (const row of rows) {
      try {
        await fuelHistoryService.calculateAndStoreDailyHistory(row.vehicle_id, yesterday);
        successCount++;
      } catch (err) {
        failCount++;
        console.error(`[FUEL-CRON] Failed for vehicle ${row.vehicle_id}:`, err.message);
      }
    }

    try {
      await pool.query(
        `INSERT INTO fuel_calculation_log (vehicles_processed, vehicles_failed, status)
         VALUES ($1, $2, $3)`,
        [successCount, failCount, failCount === 0 ? 'success' : 'partial']
      );
    } catch (logErr) {
      console.error('[FUEL-CRON] Could not write to fuel_calculation_log:', logErr.message);
    }

    console.log(`[FUEL-CRON] Complete. Success: ${successCount}, Failed: ${failCount}`);
  } catch (err) {
    console.error('[FUEL-CRON] Fatal error:', err);
  }
}

function startFuelCalculationJob() {
  cron.schedule('0 2 * * *', calculateFuelForAllVehicles, {
    timezone: 'Africa/Johannesburg',
  });
  console.log('[FUEL-CRON] Scheduled daily fuel calculation at 02:00 SAST');
}

module.exports = { startFuelCalculationJob, calculateFuelForAllVehicles };
