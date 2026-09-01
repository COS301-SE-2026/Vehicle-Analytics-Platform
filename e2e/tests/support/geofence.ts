// e2e/tests/support/geofence.ts
//
// Seeds geofences directly via SQL rather than through the UI's draw tool.
// Actually drawing a polygon means simulating pixel-precise clicks through
// Mapbox's projection via MapboxDraw -- a separate, harder effort. This
// covers list/edit/delete against real data; polygon creation is follow-up.

import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'fleet_analytics_e2e',
  user: process.env.DB_USER ?? 'admin',
  password: process.env.DB_PASSWORD ?? 'testpassword',
});

// Small square around Pretoria, in the [lng, lat] order geofenceController's
// ST_GeomFromGeoJSON expects (RFC 7946 -- NOT lat/lng).
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

  const result = await pool.query(
    `INSERT INTO geofences (name, vehicle_id, boundary, trigger_type, source)
     VALUES ($1, NULL, ST_GeomFromGeoJSON($2)::geometry(Polygon,4326), $3, 'user')
     RETURNING id, name, trigger_type`,
    [name, JSON.stringify(DEFAULT_BOUNDARY), triggerType]
  );

  return result.rows[0] as { id: number; name: string; trigger_type: string };
}

export async function deleteGeofenceById(id: number) {
  await pool.query('DELETE FROM geofences WHERE id = $1', [id]);
}

// Cleans up anything this spec file created, by name prefix, so a failed
// run doesn't leak zones into the next one -- same prefix-scoped pattern
// the Jest integration tests use for vehicle_id.
export async function cleanupE2eZones() {
  await pool.query(`DELETE FROM geofences WHERE name LIKE 'E2E Zone %'`);
}

export async function closeGeofencePool() {
  await pool.end();
}