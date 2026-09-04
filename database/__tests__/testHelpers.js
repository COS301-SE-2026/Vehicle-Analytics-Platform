const { Client } = require('pg');
const { getDbConfig } = require('./testDbConfig');

async function createDbClient() {
  const client = new Client(getDbConfig());
  await client.connect();
  return client;
}


async function resetTelemetryData(client, prefix) {
  const like = `${prefix}%`;

  await client.query('DELETE FROM geofence_events WHERE vehicle_id LIKE $1', [like]);
  await client.query('DELETE FROM geofence_state  WHERE vehicle_id LIKE $1', [like]);
  await client.query('DELETE FROM trips           WHERE vehicle_id LIKE $1', [like]);
  await client.query('DELETE FROM current_vehicle_position WHERE vehicle_id LIKE $1', [like]);
  await client.query('DELETE FROM vehicle_location_cache   WHERE vehicle_id LIKE $1', [like]);
  await client.query('DELETE FROM vehicle_events  WHERE vehicle_id LIKE $1', [like]);
  await client.query('DELETE FROM clean_telemetry WHERE vehicle_id LIKE $1', [like]);
  await client.query('DELETE FROM raw_telemetry   WHERE vehicle_id LIKE $1', [like]);
  await client.query('DELETE FROM telemetry_errors WHERE vehicle_id LIKE $1', [like]);
  await client.query('DELETE FROM vehicles        WHERE vehicle_id LIKE $1', [like]);
}

module.exports = { createDbClient, resetTelemetryData, getDbConfig };