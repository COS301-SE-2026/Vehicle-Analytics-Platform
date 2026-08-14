const { createDbClient } = require('../testHelpers');

describe('OSM geocoding functions', () => {
  let client;

  beforeAll(async () => {
    client = await createDbClient();

    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM roads');
    if (rows[0].n === 0) {
      throw new Error(
        'roads is empty -- bootstrap.sql must be applied before the migrations.'
      );
    }
  });

  afterAll(async () => {
    if (client) await client.end();
  });

  describe('get_nearest_road', () => {
    test('picks the closest road and returns its tagged speed limit', async () => {
      const { rows } = await client.query(
        'SELECT * FROM get_nearest_road($1, $2)', [-27.7640, 30.0530]
      );
      expect(rows[0].road_name).toBe('Allen Street');
      expect(rows[0].road_class).toBe('residential');
      expect(rows[0].speed_limit).toBe(60);
      expect(rows[0].speed_limit_estimated).toBe(false);
    });

    test('estimates a limit from road_class when OSM has no maxspeed tag', async () => {
      const { rows } = await client.query(
        'SELECT * FROM get_nearest_road($1, $2)', [-27.7700, 30.0550]
      );
      expect(rows[0].road_name).toBe('Newcastle Road');
      expect(rows[0].speed_limit).toBe(100);         
      expect(rows[0].speed_limit_estimated).toBe(true);
    });

    test('returns NULL beyond the 2km ceiling rather than a distant road', async () => {
      const { rows } = await client.query(
        'SELECT * FROM get_nearest_road($1, $2)', [0.0, -30.0]
      );
      expect(rows[0].road_name).toBeNull();
    });

    test('reports the distance to the matched road', async () => {
      const { rows } = await client.query(
        'SELECT * FROM get_nearest_road($1, $2)', [-27.7645, 30.0530]
      );
      expect(Number(rows[0].distance_m)).toBeGreaterThan(0);
      expect(Number(rows[0].distance_m)).toBeLessThan(200);
    });
  });

  describe('get_place', () => {
    test('resolves a suburb by polygon containment', async () => {
      const { rows } = await client.query(
        'SELECT * FROM get_place($1, $2)', [-27.7700, 30.0550]
      );
      expect(rows[0].suburb).toBe('Madadeni');
    });

    test('resolves a city by nearest point within range', async () => {
      const { rows } = await client.query(
        'SELECT * FROM get_place($1, $2)', [-27.7640, 30.0530]
      );
      expect(rows[0].city).toBe('Newcastle');
    });

    test('excludes places beyond the ceiling', async () => {
      const { rows } = await client.query(
        'SELECT * FROM get_place($1, $2)', [-27.7640, 30.0530]
      );
      expect(rows[0].city).not.toBe('Distant Town');
    });
  });

  describe('get_admin_name', () => {
    test('resolves province (level 4) and country (level 2)', async () => {
      const res = await client.query(`
        SELECT get_admin_name($1, $2, 4) AS province,
               get_admin_name($1, $2, 2) AS country
      `, [-27.7640, 30.0530]);
      expect(res.rows[0].province).toBe('KwaZulu-Natal');
      expect(res.rows[0].country).toBe('South Africa');
    });
  });

  describe('get_location_details', () => {
    test('composes a full display name from road, suburb, city, province, country', async () => {
      const { rows } = await client.query(
        'SELECT * FROM get_location_details($1, $2)', [-27.7700, 30.0550]
      );
      const loc = rows[0];
      expect(loc.road).toBe('Newcastle Road');
      expect(loc.suburb).toBe('Madadeni');
      expect(loc.province).toBe('KwaZulu-Natal');
      expect(loc.country).toBe('South Africa');
      expect(loc.display_name).toContain('Newcastle Road');
      expect(loc.display_name).toContain('Madadeni');
    });

    test('degrades gracefully outside coverage instead of erroring', async () => {
      const { rows } = await client.query(
        'SELECT * FROM get_location_details($1, $2)', [0.0, -30.0]
      );
      expect(rows[0].road).toBeNull();
      expect(rows[0].suburb).toBeNull();
    });
  });

  describe('describe_point_area', () => {
    test('uses the road name when there is one', async () => {
      const { rows } = await client.query(
        'SELECT describe_point_area($1, $2) AS area', [-27.7640, 30.0530]
      );
      expect(rows[0].area).toBe('Allen Street');
    });

    test('falls back to suburb when the nearest road is unnamed', async () => {
      const { rows } = await client.query(
        'SELECT describe_point_area($1, $2) AS area', [-27.7800, 30.0530]
      );
      expect(rows[0].area).not.toBe('Unnamed Road');
      expect(rows[0].area).toBe('Madadeni');
    });

    test('returns a usable label even with no road and no place', async () => {
      const { rows } = await client.query(
        'SELECT describe_point_area($1, $2) AS area', [0.0, -30.0]
      );
      // NULL is acceptable; 'Unnamed Road' is not -- it would become a
      // geofence name.
      expect(rows[0].area === null || rows[0].area === 'Unnamed area').toBe(true);
    });
  });

  describe('estimated_speed_limit', () => {
    test('maps road classes to South African defaults', async () => {
      const { rows } = await client.query(`
        SELECT estimated_speed_limit('motorway')     AS motorway,
               estimated_speed_limit('primary')      AS primary_road,
               estimated_speed_limit('residential')  AS residential,
               estimated_speed_limit('service')      AS service,
               estimated_speed_limit('not_a_class')  AS unknown
      `);
      const r = rows[0];
      expect(r.motorway).toBe(120);
      expect(r.primary_road).toBe(100);
      expect(r.residential).toBe(60);
      expect(r.service).toBe(20);
      expect(r.unknown).toBeNull();
    });
  });
});