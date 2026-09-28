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
    test.each([
      ['speed above the threshold', 95, 90, true],
      ['speed below the threshold', 85, 90, false],
      ['speed exactly equal to the threshold (must be strictly above)', 90, 90, false],
    ])('%s', async (_label, speed, maxSpeedKmh, expected) => {
      const result = await breach(
        `alert_speed_breach(${speed}, '{"max_speed_kmh": ${maxSpeedKmh}}'::jsonb)`
      );
      expect(result).toBe(expected);
    });
  });

  describe('alert_time_breach', () => {
    test.each([
      ['inside a normal (non-overnight) window', '2026-01-01 12:00:00', '09:00', '17:00', null, true],
      ['outside a normal (non-overnight) window', '2026-01-01 20:00:00', '09:00', '17:00', null, false],
      ['inside an overnight window (past midnight)', '2026-01-01 23:00:00', '22:00', '05:00', null, true],
      ['inside an overnight window (before the wrap, early morning)', '2026-01-01 03:00:00', '22:00', '05:00', null, true],
      ['outside an overnight window (midday)', '2026-01-01 12:00:00', '22:00', '05:00', null, false],
      ['restricted_days includes the timestamp\'s day (Thursday)', '2026-01-01 23:00:00', '22:00', '05:00', '["Thu","Fri"]', true],
      ['restricted_days excludes the timestamp\'s day (Thursday)', '2026-01-01 23:00:00', '22:00', '05:00', '["Sat","Sun"]', false],
      ['restricted_days is not set at all', '2026-01-01 23:00:00', '22:00', '05:00', null, true],
    ])('returns correctly when %s', async (_label, timestamp, startTime, endTime, restrictedDays, expected) => {
      const restrictedDaysJson = restrictedDays ? `, "restricted_days": ${restrictedDays}` : '';
      const result = await breach(
        `alert_time_breach('${timestamp}'::timestamptz, '{"start_time":"${startTime}","end_time":"${endTime}"${restrictedDaysJson}}'::jsonb)`
      );
      expect(result).toBe(expected);
    });
  });

  describe('alert_score_breach', () => {
    test.each([
      ['score below the minimum', 55, 60, true],
      ['score above the minimum', 70, 60, false],
      ['score exactly equal to the minimum (must be strictly below)', 60, 60, false],
    ])('%s', async (_label, score, minScore, expected) => {
      const result = await breach(
        `alert_score_breach(${score}, '{"min_score": ${minScore}}'::jsonb)`
      );
      expect(result).toBe(expected);
    });
  });

  describe('alert_trip_duration_breach', () => {
    test.each([
      ['a single trip exceeds max_trip_minutes', 150, 'max_trip_minutes', 120, 'max_trip_minutes', true],
      ['a single trip is under max_trip_minutes', 90, 'max_trip_minutes', 120, 'max_trip_minutes', false],
      ['cumulative daily duration exceeds max_daily_minutes', 250, 'max_daily_minutes', 200, 'max_daily_minutes', true],
      ['the relevant key is missing from condition_params', 500, 'max_trip_minutes', 120, 'max_daily_minutes', false],
    ])('returns correctly when %s', async (_label, duration, setKey, setValue, checkKey, expected) => {
      const result = await breach(
        `alert_trip_duration_breach(${duration}, '{"${setKey}": ${setValue}}'::jsonb, '${checkKey}')`
      );
      expect(result).toBe(expected);
    });

    test('defaults to max_trip_minutes when p_key is omitted', async () => {
      const result = await breach(
        `alert_trip_duration_breach(150, '{"max_trip_minutes": 120}'::jsonb)`
      );
      expect(result).toBe(true);
    });
  });

  describe('alert_unsafe_events_breach', () => {
    test.each([
      ['event count meets the required count', 3, 3, true],
      ['event count exceeds the required count', 5, 3, true],
      ['event count is below the required count', 2, 3, false],
    ])('returns correctly when %s', async (_label, eventCount, requiredCount, expected) => {
      const result = await breach(
        `alert_unsafe_events_breach(${eventCount}, '{"count": ${requiredCount}}'::jsonb)`
      );
      expect(result).toBe(expected);
    });

    test('returns false when count is missing from condition_params', async () => {
      const result = await breach(
        `alert_unsafe_events_breach(10, '{}'::jsonb)`
      );
      expect(result).toBe(false);
    });
  });
});