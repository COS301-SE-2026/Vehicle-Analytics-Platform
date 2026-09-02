const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { asAdmin, asFleetManager, asViewer } = require('./authHelper');

const PREFIX = 'ITEST Zone';

// [lng, lat] per RFC 7946 -- a small square over Pretoria.
const BOUNDARY = {
  type: 'Polygon',
  coordinates: [[
    [28.20, -25.76],
    [28.24, -25.76],
    [28.24, -25.74],
    [28.20, -25.74],
    [28.20, -25.76],
  ]],
};

function zoneName(suffix = '') {
  return `${PREFIX} ${Date.now()}${suffix}`;
}

async function createZone(overrides = {}) {
  const res = await request(app)
    .post('/api/geofences')
    .set(asFleetManager())
    .send({
      name: zoneName(),
      boundary: BOUNDARY,
      trigger_type: 'both',
      ...overrides,
    });
  return res;
}

afterEach(async () => {
  await pool.query(`DELETE FROM geofences WHERE name LIKE $1`, [`${PREFIX}%`]);
});

afterAll(async () => {
  await pool.end();
});

describe('Geofence API', () => {
  describe('authentication and authorization', () => {
    test('rejects a request with no token', async () => {
      const res = await request(app).get('/api/geofences');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('No token provided');
    });

    test('rejects a malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/geofences')
        .set('Authorization', 'NotBearer abc123');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });

    test('rejects a token signed with the wrong secret', async () => {
      const jwt = require('jsonwebtoken');
      const bad = jwt.sign({ sub: 'x', role: 'admin' }, 'not-the-real-secret');

      const res = await request(app)
        .get('/api/geofences')
        .set('Authorization', `Bearer ${bad}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
    });

    test('a viewer can read but cannot create', async () => {
      const read = await request(app).get('/api/geofences').set(asViewer());
      expect(read.status).toBe(200);

      const write = await request(app)
        .post('/api/geofences')
        .set(asViewer())
        .send({ name: zoneName(), boundary: BOUNDARY });

      expect(write.status).toBe(403);
      expect(write.body.error).toBe('Insufficient permissions');
    });

    test('an admin can create', async () => {
      const res = await request(app)
        .post('/api/geofences')
        .set(asAdmin())
        .send({ name: zoneName(), boundary: BOUNDARY });

      expect(res.status).toBe(201);
    });
  });

  describe('POST /api/geofences', () => {
    test('creates a geofence and returns it', async () => {
      const name = zoneName();
      const res = await createZone({ name, trigger_type: 'entry' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.timestamp).toEqual(expect.any(String));
      expect(res.body.data.message).toBe('Geofence created successfully');

      const zone = res.body.data.geofence;
      expect(zone).toMatchObject({
        name,
        vehicle_id: null,
        trigger_type: 'entry',
      });
      expect(zone.id).toEqual(expect.any(Number));
      expect(zone.boundary.type).toBe('Polygon');
    });

    test('defaults trigger_type to "both"', async () => {
      const res = await request(app)
        .post('/api/geofences')
        .set(asFleetManager())
        .send({ name: zoneName(), boundary: BOUNDARY });

      expect(res.status).toBe(201);
      expect(res.body.data.geofence.trigger_type).toBe('both');
    });

    test('defaults source to "user"', async () => {
      const name = zoneName();
      await createZone({ name });

      // The create response omits `source`, so read it back off the list.
      const list = await request(app).get('/api/geofences').set(asFleetManager());
      const created = list.body.data.geofences.find((g) => g.name === name);

      expect(created.source).toBe('user');
      expect(created.hotspot_kind).toBeNull();
    });

    test('rejects a missing name', async () => {
      const res = await request(app)
        .post('/api/geofences')
        .set(asFleetManager())
        .send({ boundary: BOUNDARY });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name and boundary data are required');
    });

    test('rejects a missing boundary', async () => {
      const res = await request(app)
        .post('/api/geofences')
        .set(asFleetManager())
        .send({ name: zoneName() });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name and boundary data are required');
    });

    test('rejects a non-Polygon geometry', async () => {
      // The column is geometry(Polygon,4326); a Point fails the cast.
      const res = await request(app)
        .post('/api/geofences')
        .set(asFleetManager())
        .send({
          name: zoneName(),
          boundary: { type: 'Point', coordinates: [28.2, -25.7] },
        });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/geofences', () => {
    test('lists created zones newest first', async () => {
      const first = zoneName('-a');
      await createZone({ name: first });
      const second = zoneName('-b');
      await createZone({ name: second });

      const res = await request(app).get('/api/geofences').set(asFleetManager());

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(res.body.data.geofences.length);

      const names = res.body.data.geofences.map((g) => g.name);
      expect(names).toContain(first);
      expect(names).toContain(second);
      // ORDER BY created_at DESC
      expect(names.indexOf(second)).toBeLessThan(names.indexOf(first));
    });

    test('filters by source', async () => {
      const name = zoneName();
      await createZone({ name });

      const res = await request(app)
        .get('/api/geofences?source=user')
        .set(asFleetManager());

      expect(res.status).toBe(200);
      expect(res.body.data.geofences.every((g) => g.source === 'user')).toBe(true);
      expect(res.body.data.geofences.map((g) => g.name)).toContain(name);
    });

    test('an unknown source returns an empty list, not an error', async () => {
      const res = await request(app)
        .get('/api/geofences?source=does-not-exist')
        .set(asFleetManager());

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(0);
      expect(res.body.data.geofences).toEqual([]);
    });
  });

  describe('GET /api/geofences/geojson', () => {
    test('returns a FeatureCollection with the zone in properties', async () => {
      const name = zoneName();
      const created = await createZone({ name });
      const id = created.body.data.geofence.id;

      const res = await request(app)
        .get('/api/geofences/geojson')
        .set(asFleetManager());

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('FeatureCollection');

      const feature = res.body.data.features.find((f) => f.properties.id === id);
      expect(feature).toBeDefined();
      expect(feature.geometry.type).toBe('Polygon');
      expect(feature.properties).toMatchObject({ name, source: 'user' });
    });
  });

  describe('GET /api/geofences/:id', () => {
    test('returns a single zone', async () => {
      const name = zoneName();
      const created = await createZone({ name });
      const id = created.body.data.geofence.id;

      const res = await request(app)
        .get(`/api/geofences/${id}`)
        .set(asViewer());

      expect(res.status).toBe(200);
      expect(res.body.data.geofence).toMatchObject({ id, name });
    });

    test('404s for an id that does not exist', async () => {
      const res = await request(app)
        .get('/api/geofences/99999999')
        .set(asFleetManager());

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Geofence not found');
    });
  });

  describe('PUT /api/geofences/:id', () => {
    test('updates name and trigger_type', async () => {
      const created = await createZone({ trigger_type: 'entry' });
      const id = created.body.data.geofence.id;
      const newName = zoneName('-renamed');

      const res = await request(app)
        .put(`/api/geofences/${id}`)
        .set(asFleetManager())
        .send({ name: newName, trigger_type: 'exit' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Geofence updated successfully');
      expect(res.body.data.geofence).toMatchObject({
        id,
        name: newName,
        trigger_type: 'exit',
      });
    });

    test('a partial update leaves other fields alone', async () => {
      const name = zoneName();
      const created = await createZone({ name, trigger_type: 'entry' });
      const id = created.body.data.geofence.id;

      const res = await request(app)
        .put(`/api/geofences/${id}`)
        .set(asFleetManager())
        .send({ trigger_type: 'both' });

      expect(res.status).toBe(200);
      expect(res.body.data.geofence.name).toBe(name);
      expect(res.body.data.geofence.trigger_type).toBe('both');
    });

    test('404s for an id that does not exist', async () => {
      const res = await request(app)
        .put('/api/geofences/99999999')
        .set(asFleetManager())
        .send({ name: zoneName() });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Geofence not found');
    });

    test('a viewer cannot update', async () => {
      const created = await createZone();
      const id = created.body.data.geofence.id;

      const res = await request(app)
        .put(`/api/geofences/${id}`)
        .set(asViewer())
        .send({ name: zoneName() });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/geofences/:id', () => {
    test('deletes the zone', async () => {
      const created = await createZone();
      const id = created.body.data.geofence.id;

      const res = await request(app)
        .delete(`/api/geofences/${id}`)
        .set(asFleetManager());

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Geofence deleted successfully');

      const after = await request(app)
        .get(`/api/geofences/${id}`)
        .set(asFleetManager());
      expect(after.status).toBe(404);
    });

    test('404s for an id that does not exist', async () => {
      const res = await request(app)
        .delete('/api/geofences/99999999')
        .set(asFleetManager());

      expect(res.status).toBe(404);
    });

    test('a viewer cannot delete', async () => {
      const created = await createZone();
      const id = created.body.data.geofence.id;

      const res = await request(app)
        .delete(`/api/geofences/${id}`)
        .set(asViewer());

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/geofences/events', () => {
    // Event rows are written by database triggers on clean_telemetry /
    // vehicle_events inserts, not by any endpoint -- so with no telemetry
    // ingested this asserts the shape and the empty case only.
    test('returns an events envelope', async () => {
      const res = await request(app)
        .get('/api/geofences/events')
        .set(asViewer());

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.events)).toBe(true);
      expect(res.body.data.total).toBe(res.body.data.events.length);
    });

    test('honours the limit parameter', async () => {
      const res = await request(app)
        .get('/api/geofences/events?limit=1')
        .set(asViewer());

      expect(res.status).toBe(200);
      expect(res.body.data.events.length).toBeLessThanOrEqual(1);
    });

    test('is routed before /:id -- "events" is not treated as an id', async () => {
      const res = await request(app)
        .get('/api/geofences/events')
        .set(asViewer());

      expect(res.status).not.toBe(404);
      expect(res.body.data).toHaveProperty('events');
    });
  });
});