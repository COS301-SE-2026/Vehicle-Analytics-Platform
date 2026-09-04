'use strict';

const {
	buildTrend,
	buildTrends,
	TREND,
	MIN_WEEKS_FOR_TREND,
	VOLATILITY_THRESHOLD,
} = require('../src/services/trend');

const { DIRECTION } = require('../src/services/compare');

function weeks(count){
	return Array.from({ length: count }, (_, i) => ({
		index: i + 1,
		label: `Week ${i + 1}`,
		dateLabel: `Week ${i + 1} label`,
		fromDate: `2026-07-${String(6 + i * 7).padStart(2, '0')}`,
		toDate: `2026-07-${String(12 + i * 7).padStart(2, '0')}`,
	}));
}

function points(values){
	const w = weeks(values.length);
	return values.map((value, i) => ({ week: w[i], value }));
}

describe('trend.js - exported contract', () => {
	test('exposes the full classification vocabulary', () => {
		expect(TREND).toEqual({
			IMPROVING: 'improving',
			DETERIORATING: 'deteriorating',
			INCREASING: 'increasing',
			DECREASING: 'decreasing',
			STABLE: 'stable',
			VOLATILE: 'volatile',
			INSUFFICIENT_DATA: 'insufficient_data',
		});
	});

	test('needs three weeks before it will call a trend', () => {
		expect(MIN_WEEKS_FOR_TREND).toBe(3);
	});

	test('exposes the volatility threshold', () => {
		expect(VOLATILITY_THRESHOLD).toBe(0.5);
	});
});

describe('buildTrend() - guard clauses', () => {
	test('rejects a non-array of points', () => {
		expect(() => buildTrend('harshBrakes', null))
			.toThrow('buildTrend requires an array of weekly points');
		expect(() => buildTrend('harshBrakes', {}))
			.toThrow('buildTrend requires an array of weekly points');
	});
});

describe('buildTrend() - series construction', () => {
	test('carries the week metadata through to the report', () => {
		const trend = buildTrend('harshBrakes', points([164, 138, 143, 121]));

		expect(trend.points).toHaveLength(4);
		expect(trend.points[0]).toEqual({
			index: 1,
			label: 'Week 1',
			dateLabel: 'Week 1 label',
			fromDate: '2026-07-06',
			toDate: '2026-07-12',
			value: 164,
		});
	});

	test('falls back to positional labels when week metadata is missing', () => {
		const trend = buildTrend('harshBrakes', [{ value: 10 }, { value: 20 }, { value: 30 }]);

		expect(trend.points.map((p) => p.label)).toEqual(['Week 1', 'Week 2', 'Week 3']);
		expect(trend.points.map((p) => p.index)).toEqual([1, 2, 3]);
		expect(trend.points[0].dateLabel).toBeNull();
	});

	test('reports the metric label and unit from the shared definitions', () => {
		const trend = buildTrend('utilisationPct', points([71, 74, 78]));

		expect(trend.label).toBe('Utilisation');
		expect(trend.unit).toBe('%');
		expect(trend.higherIsBetter).toBe(true);
	});

	test('reports first, last, min, max and mean of the series', () => {
		const trend = buildTrend('harshBrakes', points([164, 138, 143, 121]));

		expect(trend.first).toBe(164);
		expect(trend.last).toBe(121);
		expect(trend.min).toBe(121);
		expect(trend.max).toBe(164);
		expect(trend.mean).toBe(141.5);
	});

	test('distinguishes weeks present from weeks with data', () => {
		const trend = buildTrend('harshBrakes', points([164, null, 143, 121]));

		expect(trend.weeksTotal).toBe(4);
		expect(trend.weeksWithData).toBe(3);
	});

	test('a missing week is preserved as null rather than zero', () => {
		const trend = buildTrend('harshBrakes', points([164, null, 143]));

		expect(trend.points[1].value).toBeNull();
		expect(trend.min).toBe(143);
	});

	test.each([
		['NaN', Number.NaN],
		['a numeric string', '143'],
		['undefined', undefined],
	])('treats %s as a missing week', (_label, value) => {
		const trend = buildTrend('harshBrakes', points([164, value, 121]));

		expect(trend.points[1].value).toBeNull();
		expect(trend.weeksWithData).toBe(2);
	});

	test('always includes a first-to-last comparison alongside the trend', () => {
		const trend = buildTrend('harshBrakes', points([164, 138, 143, 121]));

		expect(trend.change.current).toBe(121);
		expect(trend.change.previous).toBe(164);
		expect(trend.change.absoluteChange).toBe(-43);
		expect(trend.change.percentChange).toBe(-26.2);
		expect(trend.change.direction).toBe(DIRECTION.IMPROVED);
	});
});

describe('buildTrend() - classification', () => {
	test('falling harsh braking is an improving trend', () => {
		const trend = buildTrend('harshBrakes', points([164, 138, 143, 121]));

		expect(trend.slopePerWeek).toBe(-12.4);
		expect(trend.slopePctPerWeek).toBe(-8.8);
		expect(trend.modelledChangePct).toBe(-26.3);
		expect(trend.classification).toBe(TREND.IMPROVING);
	});

	test('rising harsh braking is a deteriorating trend', () => {
		const trend = buildTrend('harshBrakes', points([121, 143, 138, 164]));

		expect(trend.slopePerWeek).toBeGreaterThan(0);
		expect(trend.classification).toBe(TREND.DETERIORATING);
	});

	test('rising utilisation is an improving trend', () => {
		const trend = buildTrend('utilisationPct', points([71, 74, 78, 81]));

		expect(trend.slopePerWeek).toBe(3.4);
		expect(trend.modelledChangePct).toBe(13.4);
		expect(trend.classification).toBe(TREND.IMPROVING);
	});

	test('falling utilisation is a deteriorating trend', () => {
		const trend = buildTrend('utilisationPct', points([81, 78, 74, 71]));

		expect(trend.classification).toBe(TREND.DETERIORATING);
	});

	test('a directionless metric rising is reported as increasing, not improving', () => {
		const trend = buildTrend('totalDistanceKm', points([100, 120, 140]));

		expect(trend.higherIsBetter).toBeNull();
		expect(trend.classification).toBe(TREND.INCREASING);
	});

	test('a directionless metric falling is reported as decreasing', () => {
		const trend = buildTrend('totalDistanceKm', points([140, 120, 100]));

		expect(trend.classification).toBe(TREND.DECREASING);
	});

	test('a flat series is stable', () => {
		const trend = buildTrend('harshBrakes', points([50, 50, 50, 50]));

		expect(trend.slopePerWeek).toBe(0);
		expect(trend.modelledChangePct).toBe(0);
		expect(trend.classification).toBe(TREND.STABLE);
	});

	test('a small drift within the threshold is still stable', () => {
		const trend = buildTrend('harshBrakes', points([100, 101, 100, 101]));

		expect(Math.abs(trend.modelledChangePct)).toBeLessThan(5);
		expect(trend.classification).toBe(TREND.STABLE);
	});

	test('a flat but wildly scattered series is volatile, not stable', () => {
		const trend = buildTrend('harshBrakes', points([10, 100, 100, 10]));

		expect(trend.modelledChangePct).toBe(0);
		expect(trend.coefficientOfVariation).toBeGreaterThan(VOLATILITY_THRESHOLD);
		expect(trend.classification).toBe(TREND.VOLATILE);
	});

	test('honours a custom stability threshold', () => {
		const stable = buildTrend('utilisationPct', points([71, 74, 78, 81]), {
			stabilityThresholdPct: 50,
		});

		expect(stable.classification).toBe(TREND.STABLE);
	});

	test('a series averaging zero cannot be expressed as a percentage change', () => {
		const trend = buildTrend('harshBrakes', points([0, 0, 0]));

		expect(trend.slopePerWeek).toBe(0);
		expect(trend.slopePctPerWeek).toBeNull();
		expect(trend.modelledChangePct).toBeNull();
		expect(trend.classification).toBe(TREND.INSUFFICIENT_DATA);
	});
});

describe('buildTrend() - insufficient data', () => {
	test('two weeks is not enough to call a trend', () => {
		const trend = buildTrend('harshBrakes', points([164, 121]));

		expect(trend.classification).toBe(TREND.INSUFFICIENT_DATA);
		expect(trend.slopePerWeek).toBeNull();
		expect(trend.modelledChangePct).toBeNull();
	});

	test('the first-to-last comparison is still reported below the minimum', () => {
		const trend = buildTrend('harshBrakes', points([164, 121]));

		expect(trend.change.absoluteChange).toBe(-43);
	});

	test('four weeks with two gaps is not enough', () => {
		const trend = buildTrend('harshBrakes', points([164, null, null, 121]));

		expect(trend.weeksTotal).toBe(4);
		expect(trend.weeksWithData).toBe(2);
		expect(trend.classification).toBe(TREND.INSUFFICIENT_DATA);
	});

	test('an empty series yields no values and no trend', () => {
		const trend = buildTrend('harshBrakes', []);

		expect(trend.weeksTotal).toBe(0);
		expect(trend.first).toBeNull();
		expect(trend.mean).toBeNull();
		expect(trend.classification).toBe(TREND.INSUFFICIENT_DATA);
		expect(trend.change.direction).toBe(DIRECTION.UNAVAILABLE);
	});

	test('a single week cannot produce a slope even with minWeeks lowered', () => {
		const trend = buildTrend('harshBrakes', points([164]), { minWeeks: 1 });

		expect(trend.slopePerWeek).toBeNull();
		expect(trend.coefficientOfVariation).toBeNull();
		expect(trend.classification).toBe(TREND.INSUFFICIENT_DATA);
	});

	test('honours a lowered minimum week count', () => {
		const trend = buildTrend('harshBrakes', points([164, 121]), { minWeeks: 2 });

		expect(trend.classification).not.toBe(TREND.INSUFFICIENT_DATA);
		expect(trend.slopePerWeek).toBe(-43);
	});

	test('echoes the thresholds used so the report can explain itself', () => {
		const trend = buildTrend('harshBrakes', points([164, 121]), {
			minWeeks: 4,
			stabilityThresholdPct: 12,
		});

		expect(trend.minWeeks).toBe(4);
		expect(trend.stabilityThresholdPct).toBe(12);
	});
});

describe('buildTrend() - gaps are positioned, not compressed', () => {
	test('a gap keeps the surrounding weeks in their real positions', () => {
		const withGap = buildTrend('totalDistanceKm', points([100, null, 140]), { minWeeks: 2 });
		const adjacent = buildTrend('totalDistanceKm', points([100, 140]), { minWeeks: 2 });

		expect(withGap.slopePerWeek).toBe(20);
		expect(adjacent.slopePerWeek).toBe(40);
	});

	test('the modelled change spans the full period including the gap', () => {
		const trend = buildTrend('totalDistanceKm', points([100, null, 140]), { minWeeks: 2 });

		expect(trend.modelledChangePct).toBe(33.3);
	});
});

describe('buildTrends()', () => {
	const WEEKS = weeks(4);

	const SUMMARIES = [
		{ utilisationPct: 71, harshBrakes: 164, safetyScore: 80 },
		{ utilisationPct: 74, harshBrakes: 138, safetyScore: 84 },
		{ utilisationPct: 78, harshBrakes: 143, safetyScore: 83 },
		{ utilisationPct: 81, harshBrakes: 121, safetyScore: 88 },
	];

	test.each([
		['a non-array of metrics', [null, WEEKS, SUMMARIES], 'buildTrends requires a metrics array'],
		['a non-array of weeks', [['harshBrakes'], null, SUMMARIES], 'buildTrends requires a weeks array'],
		['a non-array of summaries', [['harshBrakes'], WEEKS, null], 'buildTrends requires a summaries array'],
	])('rejects %s', (_label, args, message) => {
		expect(() => buildTrends(...args)).toThrow(message);
	});

	test('rejects a mismatch between weeks and summaries', () => {
		expect(() => buildTrends(['harshBrakes'], WEEKS, SUMMARIES.slice(0, 3)))
			.toThrow('buildTrends requires one summary per week');
	});

	test('builds one trend per requested metric', () => {
		const result = buildTrends(['utilisationPct', 'harshBrakes'], WEEKS, SUMMARIES);

		expect(Object.keys(result)).toEqual(['utilisationPct', 'harshBrakes']);
		expect(result.utilisationPct.classification).toBe(TREND.IMPROVING);
		expect(result.harshBrakes.classification).toBe(TREND.IMPROVING);
	});

	test('reproduces the worked example from the report specification', () => {
		const result = buildTrends(['utilisationPct', 'harshBrakes'], WEEKS, SUMMARIES);

		expect(result.utilisationPct.points.map((p) => p.value)).toEqual([71, 74, 78, 81]);
		expect(result.harshBrakes.points.map((p) => p.value)).toEqual([164, 138, 143, 121]);
	});

	test('a metric absent from every summary yields an empty trend, not a crash', () => {
		const result = buildTrends(['crashes'], WEEKS, SUMMARIES);

		expect(result.crashes.weeksWithData).toBe(0);
		expect(result.crashes.classification).toBe(TREND.INSUFFICIENT_DATA);
	});

	test('a metric present in only some weeks keeps its gaps', () => {
		const partial = [
			{ harshBrakes: 164 },
			{},
			{ harshBrakes: 143 },
			{ harshBrakes: 121 },
		];

		const result = buildTrends(['harshBrakes'], WEEKS, partial);

		expect(result.harshBrakes.weeksTotal).toBe(4);
		expect(result.harshBrakes.weeksWithData).toBe(3);
	});

	test('an explicit null in a summary is treated as a missing week', () => {
		const withNull = SUMMARIES.map((s, i) => (i === 1 ? { ...s, harshBrakes: null } : s));
		const result = buildTrends(['harshBrakes'], WEEKS, withNull);

		expect(result.harshBrakes.points[1].value).toBeNull();
	});

	test('tolerates a missing summary object for a week', () => {
		const sparse = [SUMMARIES[0], undefined, SUMMARIES[2], SUMMARIES[3]];
		const result = buildTrends(['harshBrakes'], WEEKS, sparse);

		expect(result.harshBrakes.weeksWithData).toBe(3);
	});

	test('passes options through to every metric', () => {
		const result = buildTrends(['harshBrakes'], WEEKS, SUMMARIES, { stabilityThresholdPct: 50 });

		expect(result.harshBrakes.stabilityThresholdPct).toBe(50);
		expect(result.harshBrakes.classification).toBe(TREND.STABLE);
	});

	test('an empty metric list yields an empty result', () => {
		expect(buildTrends([], WEEKS, SUMMARIES)).toEqual({});
	});

	test('a single week is accepted but yields no trend', () => {
		const result = buildTrends(['harshBrakes'], weeks(1), [SUMMARIES[0]]);

		expect(result.harshBrakes.classification).toBe(TREND.INSUFFICIENT_DATA);
	});
});