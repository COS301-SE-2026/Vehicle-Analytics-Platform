const { Client } = require('pg');
const config = require('./__tests__/testDbConfig');

async function createDbClient() {
  const client = new Client({
    host: config.host || '16.28.17.33',
    port: config.port || 6432,
    database: config.database || 'fleet_analytics',
    user: config.user || 'fleet_admin',
    password: config.password || 'Capstone26',
  });
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
}

module.exports = {
  createDbClient,
  resetTelemetryData,
};
