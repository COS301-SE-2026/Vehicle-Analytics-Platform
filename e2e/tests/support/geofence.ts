import { Pool } from 'pg';
import { getPool, closeDbPool } from './auth';

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'fleet_analytics_e2e',
  user: process.env.DB_USER ?? 'admin',
  password: process.env.DB_PASSWORD ?? 'testpassword',
});

const DEFAULT_BOUNDARY = {
  type: 'Polygon',
  coordinates: [[
    [28.20, -25.76],
    [28.24, -25.76],
    [28.24, -25.74],
    [28.20, -25.74],
    [28.20, -25.76],
  ]],
};

export async function seedGeofence(overrides: {
  name?: string;
  triggerType?: 'entry' | 'exit' | 'both';
} = {}) {
  const name = overrides.name ?? `E2E Zone ${Date.now()}`;
  const triggerType = overrides.triggerType ?? 'both';

  const db = getPool();
  const result = await db.query(
    `INSERT INTO geofences (name, vehicle_id, boundary, trigger_type, source)
     VALUES ($1, NULL, ST_GeomFromGeoJSON($2)::geometry(Polygon,4326), $3, 'user')
     RETURNING id, name, trigger_type`,
    [name, JSON.stringify(DEFAULT_BOUNDARY), triggerType]
  );

  return result.rows[0] as { id: number; name: string; trigger_type: string };
}

export async function deleteGeofenceById(id: number) {
  const db = getPool();
  await db.query('DELETE FROM geofences WHERE id = $1', [id]);
}

export async function cleanupE2eZones() {
  const db = getPool();
  await db.query(`DELETE FROM geofences WHERE name LIKE 'E2E Zone %'`);
}

export async function closeGeofencePool() {
  await closeDbPool();
}