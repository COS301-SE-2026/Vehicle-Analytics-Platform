import { getPool } from './auth';

const E2E_PREFIX = 'E2E-VEH-';

export interface SeedVehicleOptions {
  vehicleId?: string;
  withPosition?: boolean;
  latitude?: number;
  longitude?: number;
  speed?: number;
  ignition?: string;
  movement?: string;
}

export async function seedVehicle(options: SeedVehicleOptions = {}) {
  const vehicleId = options.vehicleId ?? `${E2E_PREFIX}${Date.now()}`;
  const deviceId = `${vehicleId}-DEV`;
  const withPosition = options.withPosition ?? true;

  const db = getPool();

  await db.query(
    `INSERT INTO vehicles (vehicle_id, device_id)
     VALUES ($1, $2)
     ON CONFLICT (vehicle_id) DO NOTHING`,
    [vehicleId, deviceId]
  );

  if (withPosition) {
    await db.query(
      `INSERT INTO current_vehicle_position
         (vehicle_id, device_id, latitude, longitude, last_update,
          speed, total_odometer, ignition, movement)
       VALUES ($1, $2, $3, $4, NOW(), $5, 100000, $6, $7)
       ON CONFLICT (vehicle_id) DO UPDATE SET
         latitude    = EXCLUDED.latitude,
         longitude   = EXCLUDED.longitude,
         last_update = EXCLUDED.last_update,
         speed       = EXCLUDED.speed,
         ignition    = EXCLUDED.ignition,
         movement    = EXCLUDED.movement`,
      [
        vehicleId,
        deviceId,
        options.latitude ?? -25.7546,
        options.longitude ?? 28.2293,
        options.speed ?? 0,
        options.ignition ?? 'Ignition Off',
        options.movement ?? 'Movement Off',
      ]
    );
  }

  return { vehicleId, deviceId };
}

export async function cleanupE2eVehicles() {
  const db = getPool();
  const like = `${E2E_PREFIX}%`;

  await db.query(`DELETE FROM current_vehicle_position WHERE vehicle_id LIKE $1`, [like]);
  await db.query(`DELETE FROM geofence_events WHERE vehicle_id LIKE $1`, [like]);
  await db.query(`DELETE FROM geofence_state  WHERE vehicle_id LIKE $1`, [like]);
  await db.query(`DELETE FROM trips           WHERE vehicle_id LIKE $1`, [like]);
  await db.query(`DELETE FROM vehicles        WHERE vehicle_id LIKE $1`, [like]);
}