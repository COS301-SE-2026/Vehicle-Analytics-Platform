'use strict';

const {
	resolvePeriod,
	weeksInPeriod,
	trendCoverage,
	getDataClock,
	PERIOD_TYPES,
	REPORT_TZ_OFFSET_HOURS,
	MAX_CUSTOM_PERIOD_DAYS,
	_resetDataClockProbe,
} = require('../src/services/period');

// The reporting timezone is Africa/Johannesburg (UTC+2, no DST). A SAST
// calendar day therefore starts at 22:00 UTC on the previous day. Every
// boundary assertion below is written against that fact.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;

function iso(value) {
	return value.toISOString();
}

// A known Wednesday: 2026-08-12.
const WEDNESDAY = new Date('2026-08-12T10:00:00Z');

describe('period.js - constants', () => {
	test('exposes the four supported period types', () => {
		expect(PERIOD_TYPES).toEqual(['weekly', 'monthly', 'current', 'custom']);
	});

	test('reporting offset is SAST (UTC+2)', () => {
		expect(REPORT_TZ_OFFSET_HOURS).toBe(2);
	});

	test('custom periods are capped at 366 days', () => {
		expect(MAX_CUSTOM_PERIOD_DAYS).toBe(366);
	});
});

describe('resolvePeriod() - validation', () => {
	test('rejects an unknown periodType', () => {
		expect(() => resolvePeriod({ periodType: 'fortnightly' }))
			.toThrow(/Unknown periodType 'fortnightly'/);
	});

	test('rejects a missing periodType', () => {
		expect(() => resolvePeriod({})).toThrow(/Unknown periodType/);
	});

	test('rejects being called with no argument at all', () => {
		expect(() => resolvePeriod()).toThrow(/Unknown periodType/);
	});

	test.each(['weekly', 'monthly', 'current'])(
		'rejects %s without a Date anchor',
		(periodType) => {
			expect(() => resolvePeriod({ periodType }))
				.toThrow('resolvePeriod requires a valid Date anchor');
		},
	);

	test('rejects an Invalid Date anchor', () => {
		expect(() => resolvePeriod({ periodType: 'weekly', anchor: new Date('nonsense') }))
			.toThrow('resolvePeriod requires a valid Date anchor');
	});

	test('rejects a string anchor even when it looks like a date', () => {
		expect(() => resolvePeriod({ periodType: 'weekly', anchor: '2026-08-12' }))
			.toThrow('resolvePeriod requires a valid Date anchor');
	});

	test('custom periods do not require an anchor', () => {
		expect(() => resolvePeriod({
			periodType: 'custom',
			from: new Date('2026-08-03T00:00:00Z'),
			to: new Date('2026-08-09T00:00:00Z'),
		})).not.toThrow();
	});
});

describe('resolvePeriod() - weekly', () => {
	test('returns the previous complete Monday to Sunday week', () => {
		const period = resolvePeriod({ periodType: 'weekly', anchor: WEDNESDAY });

		expect(period.type).toBe('weekly');
		expect(period.fromDate).toBe('2026-08-03');
		expect(period.toDate).toBe('2026-08-09');
		expect(period.days).toBe(7);
	});

	test('boundaries are SAST midnights expressed as UTC instants', () => {
		const period = resolvePeriod({ periodType: 'weekly', anchor: WEDNESDAY });

		// 2026-08-03 00:00 SAST == 2026-08-02 22:00 UTC
		expect(iso(period.from)).toBe('2026-08-02T22:00:00.000Z');
		expect(iso(period.to)).toBe('2026-08-09T22:00:00.000Z');
		expect(period.to.getTime() - period.from.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
	});

	test('the upper bound is exclusive and matches the next period lower bound', () => {
		const period = resolvePeriod({ periodType: 'weekly', anchor: WEDNESDAY });
		expect(iso(period.previous.to)).toBe(iso(period.from));
	});

	test('produces a human readable same-month label', () => {
		const period = resolvePeriod({ periodType: 'weekly', anchor: WEDNESDAY });
		expect(period.label).toBe('3 - 9 Aug 2026');
	});

	test('produces a cross-month label when the week straddles two months', () => {
		const period = resolvePeriod({ periodType: 'weekly', anchor: WEDNESDAY });
		expect(period.previous.label).toBe('27 Jul - 2 Aug 2026');
	});

	test('previous week is the seven days immediately before', () => {
		const period = resolvePeriod({ periodType: 'weekly', anchor: WEDNESDAY });

		expect(period.previous.fromDate).toBe('2026-07-27');
		expect(period.previous.toDate).toBe('2026-08-02');
		expect(period.previous.days).toBe(7);
	});

	test('an anchor on Monday still reports the week that just ended', () => {
		const monday = new Date('2026-08-10T08:00:00Z');
		const period = resolvePeriod({ periodType: 'weekly', anchor: monday });

		expect(period.fromDate).toBe('2026-08-03');
		expect(period.toDate).toBe('2026-08-09');
	});

	test('an anchor at 23:30 SAST on Sunday is still inside the old week', () => {
		// 2026-08-09T21:30Z == Sunday 23:30 SAST
		const period = resolvePeriod({
			periodType: 'weekly',
			anchor: new Date('2026-08-09T21:30:00Z'),
		});

		expect(period.fromDate).toBe('2026-07-27');
		expect(period.toDate).toBe('2026-08-02');
	});

	test('an anchor at 00:30 SAST on Monday has rolled into the new week', () => {
		// 2026-08-09T22:30Z == Monday 00:30 SAST. This is the exact case that
		// breaks if the code uses UTC dates instead of SAST wall-clock dates.
		const period = resolvePeriod({
			periodType: 'weekly',
			anchor: new Date('2026-08-09T22:30:00Z'),
		});

		expect(period.fromDate).toBe('2026-08-03');
		expect(period.toDate).toBe('2026-08-09');
	});

	test('anchors 30 minutes apart across the SAST midnight give different weeks', () => {
		const before = resolvePeriod({
			periodType: 'weekly',
			anchor: new Date('2026-08-09T21:59:59Z'),
		});
		const after = resolvePeriod({
			periodType: 'weekly',
			anchor: new Date('2026-08-09T22:00:01Z'),
		});

		expect(before.fromDate).not.toBe(after.fromDate);
	});
});

describe('resolvePeriod() - monthly', () => {
	test('returns the previous complete calendar month', () => {
		const period = resolvePeriod({ periodType: 'monthly', anchor: WEDNESDAY });

		expect(period.type).toBe('monthly');
		expect(period.fromDate).toBe('2026-07-01');
		expect(period.toDate).toBe('2026-07-31');
		expect(period.days).toBe(31);
		expect(period.label).toBe('July 2026');
	});

	test('month boundaries are SAST midnights', () => {
		const period = resolvePeriod({ periodType: 'monthly', anchor: WEDNESDAY });

		expect(iso(period.from)).toBe('2026-06-30T22:00:00.000Z');
		expect(iso(period.to)).toBe('2026-07-31T22:00:00.000Z');
	});

	test('previous month has its own correct day count', () => {
		const period = resolvePeriod({ periodType: 'monthly', anchor: WEDNESDAY });

		expect(period.previous.fromDate).toBe('2026-06-01');
		expect(period.previous.toDate).toBe('2026-06-30');
		expect(period.previous.days).toBe(30);
		expect(period.previous.label).toBe('June 2026');
	});

	test('crosses the year boundary correctly', () => {
		const period = resolvePeriod({
			periodType: 'monthly',
			anchor: new Date('2026-01-15T09:00:00Z'),
		});

		expect(period.label).toBe('December 2025');
		expect(period.fromDate).toBe('2025-12-01');
		expect(period.toDate).toBe('2025-12-31');
		expect(period.previous.label).toBe('November 2025');
	});

	test('handles February in a non-leap year', () => {
		const period = resolvePeriod({
			periodType: 'monthly',
			anchor: new Date('2026-03-10T09:00:00Z'),
		});

		expect(period.label).toBe('February 2026');
		expect(period.days).toBe(28);
	});

	test('an anchor on the 1st at 00:30 SAST reports the month that just ended', () => {
		// 2026-07-31T22:30Z == 2026-08-01 00:30 SAST
		const period = resolvePeriod({
			periodType: 'monthly',
			anchor: new Date('2026-07-31T22:30:00Z'),
		});

		expect(period.label).toBe('July 2026');
	});
});

describe('resolvePeriod() - current', () => {
	test('defaults to the last 7 days including the anchor day', () => {
		const period = resolvePeriod({ periodType: 'current', anchor: WEDNESDAY });

		expect(period.type).toBe('current');
		expect(period.fromDate).toBe('2026-08-06');
		expect(period.toDate).toBe('2026-08-12');
		expect(period.days).toBe(7);
		expect(period.label).toBe('Last 7 days to and including 12 Aug');
	});

	test('honours a custom currentDays window', () => {
		const period = resolvePeriod({
			periodType: 'current',
			anchor: WEDNESDAY,
			currentDays: 30,
		});

		expect(period.days).toBe(30);
		expect(period.fromDate).toBe('2026-07-14');
		expect(period.toDate).toBe('2026-08-12');
	});

	test('previous window is the same length immediately before', () => {
		const period = resolvePeriod({ periodType: 'current', anchor: WEDNESDAY });

		expect(period.previous.fromDate).toBe('2026-07-30');
		expect(period.previous.toDate).toBe('2026-08-05');
		expect(period.previous.days).toBe(7);
		expect(period.previous.label).toBe('Previous 7 days');
	});

	test('includes the whole anchor day, not just up to the anchor time', () => {
		const period = resolvePeriod({ periodType: 'current', anchor: WEDNESDAY });
		// Upper bound is 2026-08-13 00:00 SAST == 2026-08-12 22:00 UTC
		expect(iso(period.to)).toBe('2026-08-12T22:00:00.000Z');
	});

	test('a single day window is allowed', () => {
		const period = resolvePeriod({
			periodType: 'current',
			anchor: WEDNESDAY,
			currentDays: 1,
		});

		expect(period.days).toBe(1);
		expect(period.fromDate).toBe('2026-08-12');
		expect(period.toDate).toBe('2026-08-12');
	});

	test.each([0, -3, 2.5])('rejects currentDays of %p', (currentDays) => {
		expect(() => resolvePeriod({ periodType: 'current', anchor: WEDNESDAY, currentDays }))
			.toThrow('currentDays must be a positive integer');
	});
});

describe('resolvePeriod() - custom', () => {
	test('resolves an inclusive date range', () => {
		const period = resolvePeriod({
			periodType: 'custom',
			from: new Date('2026-08-03T00:00:00Z'),
			to: new Date('2026-08-09T00:00:00Z'),
		});

		expect(period.type).toBe('custom');
		expect(period.fromDate).toBe('2026-08-03');
		expect(period.toDate).toBe('2026-08-09');
		expect(period.days).toBe(7);
	});

	test('accepts ISO strings as well as Date objects', () => {
		const period = resolvePeriod({
			periodType: 'custom',
			from: '2026-08-03T00:00:00Z',
			to: '2026-08-09T00:00:00Z',
		});

		expect(period.days).toBe(7);
		expect(period.fromDate).toBe('2026-08-03');
	});

	test('the "to" day is included in full', () => {
		const period = resolvePeriod({
			periodType: 'custom',
			from: '2026-08-03T00:00:00Z',
			to: '2026-08-09T13:45:00Z',
		});

		expect(iso(period.to)).toBe('2026-08-09T22:00:00.000Z');
		expect(period.days).toBe(7);
	});

	test('a same-day range is one day long', () => {
		const period = resolvePeriod({
			periodType: 'custom',
			from: '2026-08-03T06:00:00Z',
			to: '2026-08-03T18:00:00Z',
		});

		expect(period.days).toBe(1);
		expect(period.label).toBe('3 Aug 2026');
	});

	test('builds a comparable previous window of equal length', () => {
		const period = resolvePeriod({
			periodType: 'custom',
			from: '2026-08-03T00:00:00Z',
			to: '2026-08-09T00:00:00Z',
		});

		expect(period.previous.fromDate).toBe('2026-07-27');
		expect(period.previous.toDate).toBe('2026-08-02');
		expect(period.previous.days).toBe(period.days);
	});

	test('rejects a reversed range', () => {
		expect(() => resolvePeriod({
			periodType: 'custom',
			from: '2026-08-09T00:00:00Z',
			to: '2026-08-03T00:00:00Z',
		})).toThrow("Custom period 'to' must not be before 'from'");
	});

	test('rejects unparseable dates', () => {
		expect(() => resolvePeriod({
			periodType: 'custom',
			from: 'not-a-date',
			to: '2026-08-03T00:00:00Z',
		})).toThrow("Custom period requires valid 'from' and 'to' dates");
	});

	test('rejects a missing "to"', () => {
		expect(() => resolvePeriod({ periodType: 'custom', from: '2026-08-03T00:00:00Z' }))
			.toThrow("Custom period requires valid 'from' and 'to' dates");
	});

	test('allows a range of exactly the maximum length', () => {
		const period = resolvePeriod({
			periodType: 'custom',
			from: '2026-01-01T00:00:00Z',
			to: '2027-01-01T00:00:00Z',
		});

		expect(period.days).toBe(MAX_CUSTOM_PERIOD_DAYS);
	});

	test('rejects a range longer than the maximum', () => {
		expect(() => resolvePeriod({
			periodType: 'custom',
			from: '2026-01-01T00:00:00Z',
			to: '2027-01-02T00:00:00Z',
		})).toThrow(`Custom period may not exceed ${MAX_CUSTOM_PERIOD_DAYS} days`);
	});
});

describe('weeksInPeriod()', () => {
	test('rejects anything that is not a resolved period', () => {
		expect(() => weeksInPeriod(null))
			.toThrow('weeksInPeriod requires a resolved period with Date bounds');
		expect(() => weeksInPeriod({ from: '2026-08-03', to: '2026-08-10' }))
			.toThrow('weeksInPeriod requires a resolved period with Date bounds');
	});

	test('splits a month into whole Monday-aligned weeks', () => {
		const period = resolvePeriod({ periodType: 'monthly', anchor: WEDNESDAY });
		const weeks = weeksInPeriod(period);

		expect(weeks).toHaveLength(4);
		expect(weeks.map((w) => w.fromDate)).toEqual([
			'2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27',
		]);
		expect(weeks.map((w) => w.toDate)).toEqual([
			'2026-07-12', '2026-07-19', '2026-07-26', '2026-08-02',
		]);
	});

	test('numbers and labels the weeks sequentially', () => {
		const period = resolvePeriod({ periodType: 'monthly', anchor: WEDNESDAY });
		const weeks = weeksInPeriod(period);

		expect(weeks.map((w) => w.index)).toEqual([1, 2, 3, 4]);
		expect(weeks.map((w) => w.label)).toEqual(['Week 1', 'Week 2', 'Week 3', 'Week 4']);
		expect(weeks[0].dateLabel).toBe('6 - 12 Jul 2026');
	});

	test('every week is exactly seven days and contiguous', () => {
		const period = resolvePeriod({ periodType: 'monthly', anchor: WEDNESDAY });
		const weeks = weeksInPeriod(period);

		weeks.forEach((week) => expect(week.days).toBe(7));
		for (let i = 1; i < weeks.length; i += 1) {
			expect(iso(weeks[i].from)).toBe(iso(weeks[i - 1].to));
		}
	});

	test('skips a partial leading week rather than reporting a short week', () => {
		const period = resolvePeriod({ periodType: 'monthly', anchor: WEDNESDAY });
		const weeks = weeksInPeriod(period);

		// July 2026 starts on a Wednesday, so 1-5 July is dropped.
		expect(weeks[0].from.getTime()).toBeGreaterThan(period.from.getTime());
	});

	test('a weekly period contains exactly one week', () => {
		const period = resolvePeriod({ periodType: 'weekly', anchor: WEDNESDAY });
		const weeks = weeksInPeriod(period);

		expect(weeks).toHaveLength(1);
		expect(weeks[0].fromDate).toBe('2026-08-03');
	});

	test('returns no weeks when the period contains no whole week', () => {
		const period = resolvePeriod({
			periodType: 'custom',
			from: '2026-08-04T00:00:00Z',
			to: '2026-08-06T00:00:00Z',
		});

		expect(weeksInPeriod(period)).toEqual([]);
	});
});

describe('trendCoverage()', () => {
	test('reports lead-in and spill for a month of whole weeks', () => {
		const period = resolvePeriod({ periodType: 'monthly', anchor: WEDNESDAY });
		const weeks = weeksInPeriod(period);
		const coverage = trendCoverage(period, weeks);

		expect(coverage.covered).toBe(true);
		expect(coverage.totalDays).toBe(31);
		expect(coverage.leadInDays).toBe(5);
		expect(coverage.coveredDays).toBe(26);
		expect(coverage.spillDays).toBe(2);
		expect(coverage.firstDate).toBe('2026-07-06');
		expect(coverage.lastDate).toBe('2026-08-02');
	});

	test('reports no coverage when there are no whole weeks', () => {
		const period = resolvePeriod({
			periodType: 'custom',
			from: '2026-08-04T00:00:00Z',
			to: '2026-08-06T00:00:00Z',
		});
		const coverage = trendCoverage(period, weeksInPeriod(period));

		expect(coverage).toEqual({
			covered: false,
			totalDays: 3,
			coveredDays: 0,
			leadInDays: 3,
			spillDays: 0,
		});
	});

	test('a weekly period is perfectly covered with no lead-in or spill', () => {
		const period = resolvePeriod({ periodType: 'weekly', anchor: WEDNESDAY });
		const coverage = trendCoverage(period, weeksInPeriod(period));

		expect(coverage.leadInDays).toBe(0);
		expect(coverage.spillDays).toBe(0);
		expect(coverage.coveredDays).toBe(7);
	});
});

describe('getDataClock()', () => {
	// The probe result is cached at module level, so it must be cleared between
	// tests or the second test would reuse the first test's answer.
	beforeEach(() => {
		_resetDataClockProbe();
	});

	function makeDb(handlers) {
		const calls = [];
		return {
			calls,
			query: jest.fn((sql) => {
				calls.push(sql.trim());
				const key = Object.keys(handlers).find((k) => sql.includes(k));
				if (!key) throw new Error(`Unexpected SQL in test: ${sql}`);
				return Promise.resolve(handlers[key]);
			}),
		};
	}

	test('rejects a db handle without a query function', async () => {
		await expect(getDataClock(null)).rejects.toThrow('getDataClock requires a pg client or pool');
		await expect(getDataClock({})).rejects.toThrow('getDataClock requires a pg client or pool');
	});

	test('uses data_now() when the function exists', async () => {
		const db = makeDb({
			to_regproc: { rows: [{ present: true }] },
			'data_now() AS data_now': { rows: [{ data_now: '2026-08-12T10:00:00Z' }] },
		});

		const clock = await getDataClock(db);

		expect(iso(clock)).toBe('2026-08-12T10:00:00.000Z');
		expect(db.calls.some((sql) => sql.includes('current_vehicle_position'))).toBe(false);
	});

	test('falls back to newest telemetry when data_now() has been dropped', async () => {
		const db = makeDb({
			to_regproc: { rows: [{ present: false }] },
			current_vehicle_position: { rows: [{ data_now: '2026-08-11T06:30:00Z' }] },
		});

		const clock = await getDataClock(db);

		expect(iso(clock)).toBe('2026-08-11T06:30:00.000Z');
		// It must not attempt to call a function that does not exist.
		expect(db.calls.some((sql) => sql.includes('data_now() AS data_now'))).toBe(false);
	});

	test('falls back when data_now() exists but returns null', async () => {
		const db = makeDb({
			to_regproc: { rows: [{ present: true }] },
			'data_now() AS data_now': { rows: [{ data_now: null }] },
			current_vehicle_position: { rows: [{ data_now: '2026-08-11T06:30:00Z' }] },
		});

		const clock = await getDataClock(db);
		expect(iso(clock)).toBe('2026-08-11T06:30:00.000Z');
	});

	test('falls back to wall-clock now when there is no telemetry at all', async () => {
		const db = makeDb({
			to_regproc: { rows: [{ present: false }] },
			current_vehicle_position: { rows: [{ data_now: null }] },
		});

		const before = Date.now();
		const clock = await getDataClock(db);

		expect(clock).toBeInstanceOf(Date);
		expect(clock.getTime()).toBeGreaterThanOrEqual(before);
	});

	test('handles an empty result set from the fallback query', async () => {
		const db = makeDb({
			to_regproc: { rows: [] },
			current_vehicle_position: { rows: [] },
		});

		await expect(getDataClock(db)).resolves.toBeInstanceOf(Date);
	});

	test('probes for data_now() only once across repeated calls', async () => {
		const db = makeDb({
			to_regproc: { rows: [{ present: true }] },
			'data_now() AS data_now': { rows: [{ data_now: '2026-08-12T10:00:00Z' }] },
		});

		await getDataClock(db);
		await getDataClock(db);
		await getDataClock(db);

		const probes = db.calls.filter((sql) => sql.includes('to_regproc'));
		expect(probes).toHaveLength(1);
	});

	test('the returned clock is a usable anchor for resolvePeriod', async () => {
		const db = makeDb({
			to_regproc: { rows: [{ present: true }] },
			'data_now() AS data_now': { rows: [{ data_now: '2026-08-12T10:00:00Z' }] },
		});

		const period = resolvePeriod({ periodType: 'weekly', anchor: await getDataClock(db) });
		expect(period.fromDate).toBe('2026-08-03');
	});
});

describe('period.js - cross-cutting invariants', () => {
	const cases = [
		['weekly', { periodType: 'weekly', anchor: WEDNESDAY }],
		['monthly', { periodType: 'monthly', anchor: WEDNESDAY }],
		['current', { periodType: 'current', anchor: WEDNESDAY }],
		['custom', { periodType: 'custom', from: '2026-08-03T00:00:00Z', to: '2026-08-09T00:00:00Z' }],
	];

	test.each(cases)('%s exposes Date bounds the analytics services accept', (_name, input) => {
		const period = resolvePeriod(input);

		expect(period.from).toBeInstanceOf(Date);
		expect(period.to).toBeInstanceOf(Date);
		expect(period.from.getTime()).toBeLessThan(period.to.getTime());
	});

	test.each(cases)('%s always supplies a previous window for comparison', (_name, input) => {
		const period = resolvePeriod(input);

		expect(period.previous).toBeDefined();
		expect(period.previous.from).toBeInstanceOf(Date);
		expect(iso(period.previous.to)).toBe(iso(period.from));
	});

	test.each(cases)('%s day count matches the span of the bounds', (_name, input) => {
		const period = resolvePeriod(input);
		const spanDays = (period.to.getTime() - period.from.getTime()) / (24 * 60 * 60 * 1000);

		expect(period.days).toBe(spanDays);
	});

	test.each(cases)('%s bounds land on SAST midnight', (_name, input) => {
		const period = resolvePeriod(input);
		expect((period.from.getTime() + SAST_OFFSET_MS) % (24 * 60 * 60 * 1000)).toBe(0);
		expect((period.to.getTime() + SAST_OFFSET_MS) % (24 * 60 * 60 * 1000)).toBe(0);
	});
});