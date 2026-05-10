const { Client } = require('pg');
const { getDbConfig } = require('./testDbConfig');

async function createDbClient(databaseName) {
  const client = new Client(getDbConfig(databaseName));
  await client.connect();
  return client;
}

async function resetTelemetryData(client, vehicleIdPrefix) {
  await client.query(`DELETE FROM clean_telemetry WHERE vehicle_id LIKE '${vehicleIdPrefix}%'`);
  await client.query(`DELETE FROM vehicle_events WHERE vehicle_id LIKE '${vehicleIdPrefix}%'`);
  await client.query(`DELETE FROM raw_telemetry WHERE vehicle_id LIKE '${vehicleIdPrefix}%'`);
  await client.query(`DELETE FROM telemetry_errors WHERE vehicle_id LIKE '${vehicleIdPrefix}%'`);
}

module.exports = {
  createDbClient,
  resetTelemetryData,
};
