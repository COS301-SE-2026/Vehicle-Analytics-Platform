'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const { setupReportingMockData } = require('./setup/mockReportingDb');

const {
  resolvePeriod,
  weeksInPeriod,
  trendCoverage,
  getDataClock,
  PERIOD_TYPES,
  REPORT_TZ_OFFSET_HOURS,
  _resetDataClockProbe,
} = require('../src/services/periods');

// SAST wall-clock time expressed as the UTC instant it maps to.
function sast(iso) {
  return new Date(`${iso}+02:00`);
}

describe('periods : module contract', () => {
  test('exposes the four supported period types', () => {
    expect(PERIOD_TYPES).toEqual(['weekly', 'monthly', 'current', 'custom']);
  });

  test('reporting timezone is SAST (UTC+2)', () => {
    expect(REPORT_TZ_OFFSET_HOURS).toBe(2);
  });

  test('rejects an unknown period type', () => {
    expect(() => resolvePeriod({ periodType: 'daily', anchor: new Date() }))
      .toThrow(/Unknown periodType 'daily'/);
  });

  test('rejects a missing or invalid anchor', () => {
    expect(() => resolvePeriod({ periodType: 'weekly' })).toThrow(/valid Date anchor/);
    expect(() => resolvePeriod({ periodType: 'weekly', anchor: new Date('nonsense') })).toThrow(/valid Date anchor/);
    expect(() => resolvePeriod({ periodType: 'weekly', anchor: '2026-08-19' })).toThrow(/valid Date anchor/);
  });
});

describe('weekly : normal case', () => {
  // Wednesday 19 August 2026, 06:13 SAST.
  const anchor = sast('2026-08-19T06:13:00');
  const period = resolvePeriod({ periodType: 'weekly', anchor });

  test('returns the previous COMPLETE week, not the week in progress', () => {
    expect(period.fromDate).toBe('2026-08-10'); // Monday
    expect(period.toDate).toBe('2026-08-16');   // note to self : this date should be inclusive 
    // basically the end date is inclusive
    expect(period.days).toBe(7);
  });

  test('boundaries are the correct UTC instants for SAST midnight', () => {
    expect(period.from.toISOString()).toBe('2026-08-09T22:00:00.000Z');
    expect(period.to.toISOString()).toBe('2026-08-16T22:00:00.000Z');
  });

  test('the interval is half-open: end instant belongs to the next period', () => {
    const next = resolvePeriod({ periodType: 'weekly', anchor: sast('2026-08-26T06:13:00') });
    expect(next.from.getTime()).toBe(period.to.getTime());
  });

  test('label is human readable', () => {
    expect(period.label).toBe('10-16 Aug 2026');
  });



  test('previous comparable period is the week before, same length', () => {
    expect(period.previous.fromDate).toBe('2026-08-03');
    expect(period.previous.toDate).toBe('2026-08-09');
    expect(period.previous.days).toBe(7);
    expect(period.previous.to.getTime()).toBe(period.from.getTime());
  });
});

describe('weekly : Monday/Sunday boundary behaviour', () => {
  test('anchor at Monday 00:00 SAST resolves to the week that just ended', () => {
    const period = resolvePeriod({ periodType: 'weekly', anchor: sast('2026-08-17T00:00:00') });
    expect(period.fromDate).toBe('2026-08-10');
    expect(period.toDate).toBe('2026-08-16');
  });

  test('anchor one millisecond before Monday resolves to the week before that', () => {
    const justBefore = new Date(sast('2026-08-17T00:00:00').getTime() - 1);
    const period = resolvePeriod({ periodType: 'weekly', anchor: justBefore });
    expect(period.fromDate).toBe('2026-08-03');
    expect(period.toDate).toBe('2026-08-09');
  });

  test('anchor late on Sunday still resolves to the week before the one ending', () => {
    const period = resolvePeriod({ periodType: 'weekly', anchor: sast('2026-08-16T23:59:59') });
    expect(period.fromDate).toBe('2026-08-03');
    expect(period.toDate).toBe('2026-08-09');
  });

  test('every day of a given week produces the identical reporting period', () => {
    const days = [
      '2026-08-17T00:00:00', '2026-08-18T12:00:00', '2026-08-19T06:13:00',
      '2026-08-20T23:59:59', '2026-08-21T09:00:00', '2026-08-22T18:30:00',
      '2026-08-23T23:59:59',
    ];
    const results = days.map((d) => resolvePeriod({ periodType: 'weekly', anchor: sast(d) }));
    results.forEach((r) => {
      expect(r.fromDate).toBe('2026-08-10');
      expect(r.toDate).toBe('2026-08-16');
    });
  });

  test('week always starts Monday and ends Sunday across a full year of anchors', () => {
    for (let week = 0; week < 52; week += 1) {
      const anchor = new Date(sast('2026-01-07T12:00:00').getTime() + week * 7 * 86400000);
      const period = resolvePeriod({ periodType: 'weekly', anchor });
      // Re-derive weekday in SAST wall-clock space.
      const startWall = new Date(period.from.getTime() + REPORT_TZ_OFFSET_HOURS * 3600000);
      const endWall = new Date(period.to.getTime() + REPORT_TZ_OFFSET_HOURS * 3600000 - 86400000);
      expect(startWall.getUTCDay()).toBe(1); // Monday
      expect(endWall.getUTCDay()).toBe(0);   // Sunday
      expect(period.days).toBe(7);
    }
  });
});

describe('weekly : year boundary', () => {
  test('a week spanning December into January is handled as one week', () => {
    // Monday 5 Jan 2026; previous complete week is 29 Dec 2025 - 4 Jan 2026.
    const period = resolvePeriod({ periodType: 'weekly', anchor: sast('2026-01-07T10:00:00') });
    expect(period.fromDate).toBe('2025-12-29');
    expect(period.toDate).toBe('2026-01-04');
    expect(period.days).toBe(7);
    expect(period.label).toBe('29 Dec - 4 Jan 2026');
  });

  test('previous comparable period also crosses the year correctly', () => {
    const period = resolvePeriod({ periodType: 'weekly', anchor: sast('2026-01-07T10:00:00') });
    expect(period.previous.fromDate).toBe('2025-12-22');
    expect(period.previous.toDate).toBe('2025-12-28');
  });
});

describe('monthly : normal case', () => {
  const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2026-08-19T06:13:00') });

  test('returns the previous COMPLETE calendar month', () => {
    expect(period.fromDate).toBe('2026-07-01');
    expect(period.toDate).toBe('2026-07-31');
    expect(period.days).toBe(31);
    expect(period.label).toBe('July 2026');
  });

  test('boundaries are SAST midnights', () => {
    expect(period.from.toISOString()).toBe('2026-06-30T22:00:00.000Z');
    expect(period.to.toISOString()).toBe('2026-07-31T22:00:00.000Z');
  });

  test('previous comparable period is the month before, with its own length', () => {
    expect(period.previous.fromDate).toBe('2026-06-01');
    expect(period.previous.toDate).toBe('2026-06-30');
    expect(period.previous.days).toBe(30);
  });
});

describe('monthly : month-length and boundary behaviour', () => {
  test('anchor on the 1st at 00:00 resolves to the month that just ended', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2026-08-01T00:00:00') });
    expect(period.fromDate).toBe('2026-07-01');
    expect(period.toDate).toBe('2026-07-31');
  });

  test('anchor one millisecond before the 1st resolves to the month before that', () => {
    const justBefore = new Date(sast('2026-08-01T00:00:00').getTime() - 1);
    const period = resolvePeriod({ periodType: 'monthly', anchor: justBefore });
    expect(period.fromDate).toBe('2026-06-01');
    expect(period.toDate).toBe('2026-06-30');
  });

  test('30-day month', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2026-05-15T12:00:00') });
    expect(period.fromDate).toBe('2026-04-01');
    expect(period.toDate).toBe('2026-04-30');
    expect(period.days).toBe(30);
  });

  test('leap-year February has 29 days', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2024-03-10T12:00:00') });
    expect(period.fromDate).toBe('2024-02-01');
    expect(period.toDate).toBe('2024-02-29');
    expect(period.days).toBe(29);
    expect(period.label).toBe('February 2024');
  });

  test('non-leap February has 28 days', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2026-03-10T12:00:00') });
    expect(period.fromDate).toBe('2026-02-01');
    expect(period.toDate).toBe('2026-02-28');
    expect(period.days).toBe(28);
  });

  test('century non-leap year (2100) has 28 days', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2100-03-10T12:00:00') });
    expect(period.toDate).toBe('2100-02-28');
    expect(period.days).toBe(28);
  });

  test('January anchor rolls back into the previous year', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2026-01-15T12:00:00') });
    expect(period.fromDate).toBe('2025-12-01');
    expect(period.toDate).toBe('2025-12-31');
    expect(period.label).toBe('December 2025');
    expect(period.previous.fromDate).toBe('2025-11-01');
    expect(period.previous.toDate).toBe('2025-11-30');
  });

  test('every month of 2026 is contiguous with the next', () => {
    for (let month = 1; month <= 12; month += 1) {
      const mm = String(month).padStart(2, '0');
      const period = resolvePeriod({ periodType: 'monthly', anchor: sast(`2026-${mm}-15T12:00:00`) });
      expect(period.previous.to.getTime()).toBe(period.from.getTime());
    }
  });
});

describe('current / on-demand period', () => {
  const anchor = sast('2026-08-19T06:13:00');

  test('defaults to a rolling 7 days that includes the anchor day', () => {
    const period = resolvePeriod({ periodType: 'current', anchor });
    expect(period.fromDate).toBe('2026-08-13');
    expect(period.toDate).toBe('2026-08-19');
    expect(period.days).toBe(7);
  });

  test('ends at the SAST day boundary after the anchor, not at the anchor instant', () => {
    const period = resolvePeriod({ periodType: 'current', anchor });
    expect(period.to.toISOString()).toBe('2026-08-19T22:00:00.000Z');
  });

  test('honours a custom window size', () => {
    const period = resolvePeriod({ periodType: 'current', anchor, currentDays: 30 });
    expect(period.days).toBe(30);
    expect(period.fromDate).toBe('2026-07-21');
    expect(period.toDate).toBe('2026-08-19');
  });

  test('previous comparable period is an equal-length window immediately before', () => {
    const period = resolvePeriod({ periodType: 'current', anchor });
    expect(period.previous.days).toBe(period.days);
    expect(period.previous.toDate).toBe('2026-08-12');
    expect(period.previous.to.getTime()).toBe(period.from.getTime());
  });

  test('rejects a non-positive or non-integer window', () => {
    expect(() => resolvePeriod({ periodType: 'current', anchor, currentDays: 0 })).toThrow(/positive integer/);
    expect(() => resolvePeriod({ periodType: 'current', anchor, currentDays: -3 })).toThrow(/positive integer/);
    expect(() => resolvePeriod({ periodType: 'current', anchor, currentDays: 2.5 })).toThrow(/positive integer/);
  });
});

describe('custom period', () => {
  test('resolves an explicit range with an exclusive end', () => {
    const period = resolvePeriod({
      periodType: 'custom',
      anchor: sast('2026-08-19T06:13:00'),
      from: sast('2026-08-01T00:00:00'),
      to: sast('2026-08-08T00:00:00'),
    });
    expect(period.fromDate).toBe('2026-08-01');
    expect(period.toDate).toBe('2026-08-07');
    expect(period.days).toBe(7);
  });

  test('accepts ISO strings as well as Date objects', () => {
    const period = resolvePeriod({
      periodType: 'custom',
      anchor: sast('2026-08-19T06:13:00'),
      from: '2026-08-01T00:00:00+02:00',
      to: '2026-08-08T00:00:00+02:00',
    });
    expect(period.fromDate).toBe('2026-08-01');
    expect(period.toDate).toBe('2026-08-07');
  });

  test('has no previous comparable period', () => {
    const period = resolvePeriod({
      periodType: 'custom',
      anchor: sast('2026-08-19T06:13:00'),
      from: sast('2026-08-01T00:00:00'),
      to: sast('2026-08-08T00:00:00'),
    });
    expect(period.previous).toBeNull();
  });

  test('rejects an inverted, zero-length or invalid range', () => {
    const anchor = sast('2026-08-19T06:13:00');
    expect(() => resolvePeriod({
      periodType: 'custom', anchor, from: sast('2026-08-08T00:00:00'), to: sast('2026-08-01T00:00:00'),
    })).toThrow(/must be after/);
    expect(() => resolvePeriod({
      periodType: 'custom', anchor, from: sast('2026-08-01T00:00:00'), to: sast('2026-08-01T00:00:00'),
    })).toThrow(/must be after/);
    expect(() => resolvePeriod({
      periodType: 'custom', anchor, from: 'not-a-date', to: sast('2026-08-08T00:00:00'),
    })).toThrow(/valid 'from' and 'to'/);
  });

  test('rejects a sub-day range that would collapse to zero days', () => {
    const anchor = sast('2026-08-19T06:13:00');
    expect(() => resolvePeriod({
      periodType: 'custom', anchor, from: sast('2026-08-01T09:00:00'), to: sast('2026-08-01T17:00:00'),
    })).toThrow(/at least one full day/);
  });
});

describe('weeksInPeriod : monthly trend breakdown', () => {
  test('August 2026 yields five complete 7-day weeks', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2026-09-10T12:00:00') });
    const weeks = weeksInPeriod(period);

    // Monday 31 Aug falls inside the month, so it opens a fifth bucket thats running into thatof sepember
    expect(weeks).toHaveLength(5);
    expect(weeks.map((w) => w.label))
      .toEqual(['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5']);
    expect(weeks.map((w) => w.fromDate))
      .toEqual(['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31']);
    expect(weeks[4].dateLabel).toBe('31 Aug - 6 Sep 2026');
    weeks.forEach((w) => expect(w.days).toBe(7));
  });

  test('weeks are contiguous and half-open', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2026-09-10T12:00:00') });
    const weeks = weeksInPeriod(period);
    for (let i = 1; i < weeks.length; i += 1) {
      expect(weeks[i].from.getTime()).toBe(weeks[i - 1].to.getTime());
    }
  });

  test('every week starts on a Monday inside the month', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2026-09-10T12:00:00') });
    const weeks = weeksInPeriod(period);
    weeks.forEach((w) => {
      expect(w.from.getTime()).toBeGreaterThanOrEqual(period.from.getTime());
      expect(w.from.getTime()).toBeLessThan(period.to.getTime());
    });
  });

  test('a month starting on a Monday is covered from day one', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2026-07-10T12:00:00') });
    const weeks = weeksInPeriod(period);
    expect(weeks).toHaveLength(5);
    expect(weeks[0].fromDate).toBe('2026-06-01');
    expect(weeks[4].fromDate).toBe('2026-06-29');
  });

  test('February 2026 (28 days, starts Sunday) keeps four equal weeks', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2026-03-10T12:00:00') });
    const weeks = weeksInPeriod(period);
    expect(weeks).toHaveLength(4);
    expect(weeks[0].fromDate).toBe('2026-02-02');
    expect(weeks[3].fromDate).toBe('2026-02-23');
    expect(weeks[3].toDate).toBe('2026-03-01');
    weeks.forEach((w) => expect(w.days).toBe(7));
  });

  test('every month of 2026 yields four or five equal-length weeks', () => {
    for (let month = 1; month <= 12; month += 1) {
      const mm = String(month).padStart(2, '0');
      const period = resolvePeriod({ periodType: 'monthly', anchor: sast(`2026-${mm}-15T12:00:00`) });
      const weeks = weeksInPeriod(period);
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      expect(weeks.length).toBeLessThanOrEqual(5);
      weeks.forEach((w) => expect(w.days).toBe(7));
    }
  });

  test('rejects an object that is not a resolved period', () => {
    expect(() => weeksInPeriod(null)).toThrow(/resolved period/);
    expect(() => weeksInPeriod({ from: '2026-08-01', to: '2026-09-01' })).toThrow(/resolved period/);
  });
});



describe('trendCoverage', () => {
  test('reports which days the weekly trend actually covers', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2026-09-10T12:00:00') });
    const coverage = trendCoverage(period, weeksInPeriod(period));
    expect(coverage.covered).toBe(true);
    expect(coverage.totalDays).toBe(31);
    expect(coverage.leadInDays).toBe(2);
    expect(coverage.coveredDays).toBe(29);
    expect(coverage.spillDays).toBe(6);
    expect(coverage.firstDate).toBe('2026-08-03');
    expect(coverage.lastDate).toBe('2026-09-06');
  });



  test('discloses spill for a month whose last week crosses the boundary', () => {
    const period = resolvePeriod({ periodType: 'monthly', anchor: sast('2026-03-10T12:00:00') });
    const coverage = trendCoverage(period, weeksInPeriod(period));
    expect(coverage.totalDays).toBe(28);
    expect(coverage.leadInDays).toBe(1);
    expect(coverage.coveredDays).toBe(27);
    expect(coverage.spillDays).toBe(1);
  });



  test('handles a period with no complete weeks', () => {
    const period = resolvePeriod({
      periodType: 'custom',
      anchor: sast('2026-08-19T06:13:00'),
      from: sast('2026-08-01T00:00:00'),
      to: sast('2026-08-03T00:00:00'),
    });
    const coverage = trendCoverage(period, weeksInPeriod(period));
    expect(coverage.covered).toBe(false);
    expect(coverage.leadInDays).toBe(2);
    expect(coverage.coveredDays).toBe(0);
  });
});



describe('determinism and timezone independence', () => {
  test('identical anchor produces identical output on repeated calls', () => {
    const anchor = sast('2026-08-19T06:13:00');
    const a = resolvePeriod({ periodType: 'weekly', anchor });
    const b = resolvePeriod({ periodType: 'weekly', anchor });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('output does not depend on the host timezone', () => {
    const modulePath = path.resolve(__dirname, '../src/services/periods.js');
    const script = `
      const { resolvePeriod, weeksInPeriod } = require(${JSON.stringify(modulePath)});
      const anchor = new Date('2026-08-19T06:13:00+02:00');
      const out = { weekly: resolvePeriod({ periodType: 'weekly', anchor }),
        monthly: resolvePeriod({ periodType: 'monthly', anchor }),
        current: resolvePeriod({ periodType: 'current', anchor }),
        weeks: weeksInPeriod(resolvePeriod({ periodType: 'monthly', anchor })),
      };
      process.stdout.write(JSON.stringify(out));
    `;

    const zones = ['UTC', 'Africa/Johannesburg', 'Pacific/Kiritimati', 'America/Los_Angeles'];
    const outputs = zones.map((tz) => execFileSync(
      process.execPath, ['-e', script],
      { env: { ...process.env, TZ: tz }, encoding: 'utf8' },
    ));

    outputs.forEach((out) => expect(out).toBe(outputs[0]));

    const parsed = JSON.parse(outputs[0]);
    expect(parsed.weekly.fromDate).toBe('2026-08-10');
    expect(parsed.weekly.toDate).toBe('2026-08-16');
  });
});


describe('getDataClock', () => {
  beforeEach(() => _resetDataClockProbe());

  test('uses data_now() when the function exists, so reports match the dashboard', async () => {
    const { pool } = setupReportingMockData({
      clock: { dataNowFnPresent: true, dataNow: '2026-08-22T06:13:00.000Z' },
    });
    const clock = await getDataClock(pool);
    expect(clock.toISOString()).toBe('2026-08-22T06:13:00.000Z');
  });


  test('falls back to newest telemetry when data_now() is absent', async () => {
    const { pool, calls } = setupReportingMockData({
      clock: { dataNowFnPresent: false, latestTelemetry: '2026-08-22T04:00:00.000Z' },
    });
    const clock = await getDataClock(pool);

    expect(clock.toISOString()).toBe('2026-08-22T04:00:00.000Z');
    expect(calls.some((c) => c.sql.includes('data_now() AS data_now'))).toBe(false);
  });



  test('falls back when data_now() exists but returns NULL on an empty database', async () => {
    const { pool } = setupReportingMockData({
      clock: {
        dataNowFnPresent: true,
        dataNow: null,
        latestTelemetry: '2026-08-22T04:00:00.000Z',
      },
    });
    const clock = await getDataClock(pool);
    expect(clock.toISOString()).toBe('2026-08-22T04:00:00.000Z');
  });

  

  test('returns wall clock when there is no telemetry at all', async () => {
    const { pool } = setupReportingMockData({
      clock: { dataNowFnPresent: false, latestTelemetry: null },
    });
    const before = Date.now();
    const clock = await getDataClock(pool);
    expect(clock.getTime()).toBeGreaterThanOrEqual(before);
  });



  test('probes for data_now() only once per process', async () => {
    const { pool, calls } = setupReportingMockData({ 
        clock: { dataNowFnPresent: true, dataNow: '2026-08-22T06:13:00.000Z' },
    });
    await getDataClock(pool);
    await getDataClock(pool);
    expect(calls.filter((c) => c.sql.includes('to_regproc'))).toHaveLength(1);
  });

  test('rejects a client that cannot query', async () => {
    await expect(getDataClock(null)).rejects.toThrow(/pg client or pool/);
    await expect(getDataClock({})).rejects.toThrow(/pg client or pool/);
  });
});

describe('integration of clock and period resolution', () => {
  test('a data clock ahead of wall time still yields a complete past week', async () => {
    const { pool } = setupReportingMockData({ 
        clock: { dataNowFnPresent: false, latestTelemetry: '2026-08-22T04:13:00.000Z' }, 
    });
    _resetDataClockProbe();

    const anchor = await getDataClock(pool);
    const period = resolvePeriod({ periodType: 'weekly', anchor });
    expect(period.fromDate).toBe('2026-08-10');
    expect(period.toDate).toBe('2026-08-16');
    expect(period.to.getTime()).toBeLessThan(anchor.getTime());
  });
});