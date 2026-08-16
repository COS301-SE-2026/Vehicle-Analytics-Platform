const { Client } = require('pg');
const { getDbConfig } = require('./__tests__/testDbConfig');

async function createDbClient() {
  const config = getDbConfig();
  const client = new Client(config);
  await client.connect();
  return client;
}

async function resetTelemetryData(client, vehicleIdPrefix) {
  if (!client) {
    return;
  }

  await client.query(`DELETE FROM clean_telemetry WHERE vehicle_id LIKE '${vehicleIdPrefix}%'`);
  await client.query(`DELETE FROM vehicle_events WHERE vehicle_id LIKE '${vehicleIdPrefix}%'`);
  await client.query(`DELETE FROM raw_telemetry WHERE vehicle_id LIKE '${vehicleIdPrefix}%'`);
  await client.query(`DELETE FROM telemetry_errors WHERE vehicle_id LIKE '${vehicleIdPrefix}%'`);
  await client.query(`DELETE FROM current_vehicle_position WHERE vehicle_id LIKE '${vehicleIdPrefix}%'`);
  await client.query(`DELETE FROM vehicle_daily_events WHERE vehicle_id LIKE '${vehicleIdPrefix}%'`);
}

module.exports = {
  createDbClient,
  resetTelemetryData,
};
