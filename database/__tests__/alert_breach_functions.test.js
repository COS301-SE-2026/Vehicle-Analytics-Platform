const { createDbClient } = require('../testHelpers');

describe('Alert breach functions', () => {
  let client;

  beforeAll(async () => {
    client = await createDbClient();
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  async function breach(fnCall) {
    const res = await client.query(`SELECT ${fnCall} AS result`);
    return res.rows[0].result;
  }

  describe('alert_speed_breach', () => {
    test('returns true when speed is above the threshold', async () => {
      const result = await breach(
        `alert_speed_breach(95, '{"max_speed_kmh": 90}'::jsonb)`
      );
      expect(result).toBe(true);
    });

    test('returns false when speed is below the threshold', async () => {
      const result = await breach(
        `alert_speed_breach(85, '{"max_speed_kmh": 90}'::jsonb)`
      );
      expect(result).toBe(false);
    });

    test('returns false when speed exactly equals the threshold (must be strictly above)', async () => {
      const result = await breach(
        `alert_speed_breach(90, '{"max_speed_kmh": 90}'::jsonb)`
      );
      expect(result).toBe(false);
    });
  });

  describe('alert_time_breach', () => {
    test('returns true inside a normal (non-overnight) window', async () => {
      const result = await breach(
        `alert_time_breach('2026-01-01 12:00:00'::timestamptz, '{"start_time":"09:00","end_time":"17:00"}'::jsonb)`
      );
      expect(result).toBe(true);
    });

    test('returns false outside a normal (non-overnight) window', async () => {
      const result = await breach(
        `alert_time_breach('2026-01-01 20:00:00'::timestamptz, '{"start_time":"09:00","end_time":"17:00"}'::jsonb)`
      );
      expect(result).toBe(false);
    });

    test('returns true inside an overnight window (past midnight)', async () => {
      const result = await breach(
        `alert_time_breach('2026-01-01 23:00:00'::timestamptz, '{"start_time":"22:00","end_time":"05:00"}'::jsonb)`
      );
      expect(result).toBe(true);
    });

    test('returns true inside an overnight window (before the wrap, early morning)', async () => {
      const result = await breach(
        `alert_time_breach('2026-01-01 03:00:00'::timestamptz, '{"start_time":"22:00","end_time":"05:00"}'::jsonb)`
      );
      expect(result).toBe(true);
    });

    test('returns false outside an overnight window (midday)', async () => {
      const result = await breach(
        `alert_time_breach('2026-01-01 12:00:00'::timestamptz, '{"start_time":"22:00","end_time":"05:00"}'::jsonb)`
      );
      expect(result).toBe(false);
    });

    test('returns true when restricted_days includes the timestamp\'s day', async () => {
      // 2026-01-01 is a Thursday
      const result = await breach(
        `alert_time_breach('2026-01-01 23:00:00'::timestamptz, '{"start_time":"22:00","end_time":"05:00","restricted_days":["Thu","Fri"]}'::jsonb)`
      );
      expect(result).toBe(true);
    });

    test('returns false when restricted_days excludes the timestamp\'s day', async () => {
      // 2026-01-01 is a Thursday, not in the restricted list below
      const result = await breach(
        `alert_time_breach('2026-01-01 23:00:00'::timestamptz, '{"start_time":"22:00","end_time":"05:00","restricted_days":["Sat","Sun"]}'::jsonb)`
      );
      expect(result).toBe(false);
    });

    test('returns true regardless of day when restricted_days is not set', async () => {
      const result = await breach(
        `alert_time_breach('2026-01-01 23:00:00'::timestamptz, '{"start_time":"22:00","end_time":"05:00"}'::jsonb)`
      );
      expect(result).toBe(true);
    });
  });

  describe('alert_score_breach', () => {
    test('returns true when score is below the minimum', async () => {
      const result = await breach(
        `alert_score_breach(55, '{"min_score": 60}'::jsonb)`
      );
      expect(result).toBe(true);
    });

    test('returns false when score is above the minimum', async () => {
      const result = await breach(
        `alert_score_breach(70, '{"min_score": 60}'::jsonb)`
      );
      expect(result).toBe(false);
    });

    test('returns false when score exactly equals the minimum (must be strictly below)', async () => {
      const result = await breach(
        `alert_score_breach(60, '{"min_score": 60}'::jsonb)`
      );
      expect(result).toBe(false);
    });
  });

  describe('alert_trip_duration_breach', () => {
    test('returns true when a single trip exceeds max_trip_minutes', async () => {
      const result = await breach(
        `alert_trip_duration_breach(150, '{"max_trip_minutes": 120}'::jsonb, 'max_trip_minutes')`
      );
      expect(result).toBe(true);
    });

    test('returns false when a single trip is under max_trip_minutes', async () => {
      const result = await breach(
        `alert_trip_duration_breach(90, '{"max_trip_minutes": 120}'::jsonb, 'max_trip_minutes')`
      );
      expect(result).toBe(false);
    });

    test('returns true when cumulative daily duration exceeds max_daily_minutes', async () => {
      const result = await breach(
        `alert_trip_duration_breach(250, '{"max_daily_minutes": 200}'::jsonb, 'max_daily_minutes')`
      );
      expect(result).toBe(true);
    });

    test('returns false when the relevant key is missing from condition_params', async () => {
      // Only max_trip_minutes is set; asking about max_daily_minutes should
      // not breach, since that cap was never configured on this rule.
      const result = await breach(
        `alert_trip_duration_breach(500, '{"max_trip_minutes": 120}'::jsonb, 'max_daily_minutes')`
      );
      expect(result).toBe(false);
    });

    test('defaults to max_trip_minutes when p_key is omitted', async () => {
      const result = await breach(
        `alert_trip_duration_breach(150, '{"max_trip_minutes": 120}'::jsonb)`
      );
      expect(result).toBe(true);
    });
  });

  describe('alert_unsafe_events_breach', () => {
    test('returns true when event count meets the required count', async () => {
      const result = await breach(
        `alert_unsafe_events_breach(3, '{"count": 3}'::jsonb)`
      );
      expect(result).toBe(true);
    });

    test('returns true when event count exceeds the required count', async () => {
      const result = await breach(
        `alert_unsafe_events_breach(5, '{"count": 3}'::jsonb)`
      );
      expect(result).toBe(true);
    });

    test('returns false when event count is below the required count', async () => {
      const result = await breach(
        `alert_unsafe_events_breach(2, '{"count": 3}'::jsonb)`
      );
      expect(result).toBe(false);
    });

    test('returns false when count is missing from condition_params', async () => {
      const result = await breach(
        `alert_unsafe_events_breach(10, '{}'::jsonb)`
      );
      expect(result).toBe(false);
    });
  });
});