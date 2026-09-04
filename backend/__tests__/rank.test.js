'use strict';

const {
	rankBy,
	topPerformers,
	requiresAttention,
	mergeEntities,
	ORDER,
	STATUS,
	MIN_ENTITIES_FOR_RANKING,
	DEFAULT_LIMIT,
} = require('../src/services/rank');



const FLEET = [
	{ vehicleId: 'V001', safetyScore: 90, totalEvents: 4, utilisationPct: 71 },
	{ vehicleId: 'V002', safetyScore: 70, totalEvents: 18, utilisationPct: 95 },
	{ vehicleId: 'V003', safetyScore: 90, totalEvents: 4, utilisationPct: 62 },
	{ vehicleId: 'V004', safetyScore: 55, totalEvents: 31, utilisationPct: 88 },
];



describe('rank.js - exported contract', () => {
	test('exposes both sort directions', () => {
		expect(ORDER).toEqual({ ASC: 'asc', DESC: 'desc' });
	});

	test('exposes the three ranking outcomes', () => {
		expect(STATUS).toEqual({
			OK: 'ok',
			INSUFFICIENT_DATA: 'insufficient_data',
			NOT_RANKABLE: 'not_rankable',
		});
	});

	test('needs at least two entities before a ranking is meaningful', () => {
		expect(MIN_ENTITIES_FOR_RANKING).toBe(2);
	});

	test('defaults to a top five', () => {
		expect(DEFAULT_LIMIT).toBe(5);
	});

});

describe('rankBy() - guard clauses', () => {
	test('rejects a non-array of entities', () => {
		expect(() => rankBy(null, 'safetyScore')).toThrow('rankBy requires an array of entities');
		expect(() => rankBy({}, 'safetyScore')).toThrow('rankBy requires an array of entities');
	});

	test.each([
		['a missing metric', undefined],
		['an empty metric', ''],
		['a non-string metric', 7],
	])('rejects %s', (_label, metric) => {
		expect(() => rankBy(FLEET, metric)).toThrow('rankBy requires a metric name');
	});

});

describe('rankBy() - direction is derived from the metric definition', () => {
	test('a higher-is-better metric sorts descending', () => {
		const result = rankBy(FLEET, 'safetyScore');

		expect(result.higherIsBetter).toBe(true);
		expect(result.order).toBe(ORDER.DESC);
		expect(result.entries[0].value).toBe(90);
	});

	test('a lower-is-better metric sorts ascending', () => {
		const result = rankBy(FLEET, 'totalEvents');
		expect(result.higherIsBetter).toBe(false);
		expect(result.order).toBe(ORDER.ASC);
		expect(result.entries[0].value).toBe(4);

	});

	test('a directionless metric cannot be ranked', () => {
		const result = rankBy(FLEET, 'totalDistanceKm');
		expect(result.status).toBe(STATUS.NOT_RANKABLE);
		expect(result.order).toBeNull();
		expect(result.entries).toEqual([]);

	});

	test('an unknown metric is not rankable without an explicit order', () => {
		const result = rankBy(FLEET, 'somethingNew');
		expect(result.status).toBe(STATUS.NOT_RANKABLE);
		expect(result.label).toBe('somethingNew');
	});

	test('an explicit order overrides the derived direction', () => {
		const result = rankBy(FLEET, 'safetyScore', { order: ORDER.ASC });
		expect(result.order).toBe(ORDER.ASC);
		expect(result.entries[0].value).toBe(55);

	});

	test('an explicit order makes an otherwise unrankable metric rankable', () => {
		const withDistance = [
			{ vehicleId: 'V001', totalDistanceKm: 300 },
			{ vehicleId: 'V002', totalDistanceKm: 120 },
		];
		const result = rankBy(withDistance, 'totalDistanceKm', { order: ORDER.DESC });
		expect(result.status).toBe(STATUS.OK);
		expect(result.entries[0].id).toBe('V001');
	});

	test('carries the metric label and unit through from the definitions', () => {
		const result = rankBy(FLEET, 'totalEvents');
		expect(result.label).toBe('Total events');
		expect(result.unit).toBe('events');

	});

});

describe('rankBy() - rank assignment', () => {
	test('assigns sequential ranks starting at one', () => {
		const result = rankBy(FLEET, 'totalEvents');
		expect(result.entries.map((e) => e.rank)).toEqual([1, 1, 3, 4]);
	});

	test('gives tied values the same rank', () => {
		const result = rankBy(FLEET, 'safetyScore');
		const tied = result.entries.filter((e) => e.value === 90);
		expect(tied).toHaveLength(2);
		expect(tied[0].rank).toBe(1);
		expect(tied[1].rank).toBe(1);
	});

	test('skips the ranks consumed by a tie', () => {
		const result = rankBy(FLEET, 'safetyScore');
		expect(result.entries.map((e) => e.rank)).toEqual([1, 1, 3, 4]);
	});

	test('flags tied entries so the report can say so explicitly', () => {
		const result = rankBy(FLEET, 'safetyScore');
		expect(result.entries[0].tied).toBe(true);
		expect(result.entries[1].tied).toBe(true);
		expect(result.entries[2].tied).toBe(false);
	});

	test('breaks ties deterministically by id so reports are reproducible', () => {
		const result = rankBy(FLEET, 'safetyScore');
		const reversed = rankBy([...FLEET].reverse(), 'safetyScore');
		expect(result.entries.map((e) => e.id)).toEqual(reversed.entries.map((e) => e.id));
		expect(result.entries.slice(0, 2).map((e) => e.id)).toEqual(['V001', 'V003']);

	});

	test('rounds values to the requested precision', () => {
		const entities = [
			{ vehicleId: 'A', safetyScore: 88.456 },
			{ vehicleId: 'B', safetyScore: 72.123 },
		];
		expect(rankBy(entities, 'safetyScore').entries[0].value).toBe(88.46);
		expect(rankBy(entities, 'safetyScore', { precision: 0 }).entries[0].value).toBe(88);
	});

	test('values that round to the same number are treated as a tie', () => {
		const entities = [
			{ vehicleId: 'A', safetyScore: 88.001 },
			{ vehicleId: 'B', safetyScore: 88.004 },
		];
		expect(rankBy(entities, 'safetyScore').entries.map((e) => e.rank)).toEqual([1, 1]);

	});
});

describe('rankBy() - missing and unusable values', () => {
	test('separates entities with no value into an unavailable list', () => {
		const entities = [
			...FLEET,
			{ vehicleId: 'V005', safetyScore: null },
			{ vehicleId: 'V006' },
		];
		const result = rankBy(entities, 'safetyScore');
		expect(result.entries).toHaveLength(4);
		expect(result.unavailable).toEqual([
			{ id: 'V005', value: null },
			{ id: 'V006', value: null },
		]);
	});

	test('a null value never ranks as a zero', () => {
		const entities = [
			{ vehicleId: 'A', safetyScore: 40 },
			{ vehicleId: 'B', safetyScore: null },
		];
		const result = rankBy(entities, 'safetyScore');
		expect(result.entries.map((e) => e.id)).toEqual(['A']);
		expect(result.unavailable.map((e) => e.id)).toEqual(['B']);

	});

	test.each([
		['NaN', Number.NaN],
		['Infinity', Number.POSITIVE_INFINITY],
		['a numeric string', '90'],
		['a boolean', true],
	])('treats %s as unavailable rather than ranking it', (_label, value) => {
		const result = rankBy([{ vehicleId: 'A', safetyScore: value }], 'safetyScore', { minEntities: 0 });
		expect(result.entries).toEqual([]);
		expect(result.unavailable).toEqual([{ id: 'A', value: null }]);
	});

	test('drops entities with no id entirely', () => {
		const entities = [
			{ vehicleId: 'A', safetyScore: 90 },
			{ safetyScore: 80 },
			{ vehicleId: null, safetyScore: 70 },
		];
		const result = rankBy(entities, 'safetyScore', { minEntities: 1 });
		expect(result.entries).toHaveLength(1);
		expect(result.unavailable).toEqual([]);
		expect(result.totalCount).toBe(3);
	});

	test('reports ranked and total counts separately', () => {
		const entities = [...FLEET, { vehicleId: 'V005', safetyScore: null }];
		const result = rankBy(entities, 'safetyScore');
		expect(result.rankedCount).toBe(4);
		expect(result.totalCount).toBe(5);

	});

	test('coerces a numeric id to a string', () => {
		const result = rankBy([{ vehicleId: 1001, safetyScore: 90 }], 'safetyScore', { minEntities: 1 });
		expect(result.entries[0].id).toBe('1001');
	});

	test('honours a custom id field', () => {
		const result = rankBy(
			[{ groupId: 'G1', safetyScore: 90 }, { groupId: 'G2', safetyScore: 60 }],
			'safetyScore',
			{ idField: 'groupId' },
		);
		expect(result.entries.map((e) => e.id)).toEqual(['G1', 'G2']);
	});
});

describe('rankBy() - insufficient data', () => {
	test('reports insufficient data below the minimum entity count', () => {
		const result = rankBy([{ vehicleId: 'A', safetyScore: 90 }], 'safetyScore', { minEntities: 2 });
		expect(result.status).toBe(STATUS.INSUFFICIENT_DATA);
		expect(result.entries).toEqual([]);
		expect(result.rankedCount).toBe(1);
	});

	test('an empty fleet is insufficient rather than an error', () => {
		const result = rankBy([], 'safetyScore');
		expect(result.status).toBe(STATUS.INSUFFICIENT_DATA);
		expect(result.totalCount).toBe(0);
	});

	test('still lists the unavailable entities when data is insufficient', () => {
		const result = rankBy(
			[{ vehicleId: 'A', safetyScore: null }, { vehicleId: 'B', safetyScore: 90 }],
			'safetyScore',
			{ minEntities: 2 },
		);
		expect(result.status).toBe(STATUS.INSUFFICIENT_DATA);
		expect(result.unavailable).toEqual([{ id: 'A', value: null }]);
	});
});

describe('rankBy() - limits', () => {
	test('truncates to the requested limit', () => {
		const result = rankBy(FLEET, 'safetyScore', { limit: 2 });
		expect(result.entries).toHaveLength(2);
	});

	test('the counts describe the full set, not the truncated list', () => {
		const result = rankBy(FLEET, 'safetyScore', { limit: 2 });
		expect(result.rankedCount).toBe(4);
		expect(result.totalCount).toBe(4);
	});

	test('a limit larger than the fleet returns everything', () => {
		expect(rankBy(FLEET, 'safetyScore', { limit: 99 }).entries).toHaveLength(4);
	});

	test('no limit returns every ranked entity', () => {
		expect(rankBy(FLEET, 'safetyScore').entries).toHaveLength(4);
	});
});

describe('topPerformers()', () => {
	test('puts the best vehicle first for a higher-is-better metric', () => {
		const result = topPerformers(FLEET, 'safetyScore');
		expect(result.order).toBe(ORDER.DESC);
		expect(result.entries[0].value).toBe(90);
		expect(result.entries[result.entries.length - 1].value).toBe(55);
	});

	test('puts the best vehicle first for a lower-is-better metric', () => {
		const result = topPerformers(FLEET, 'totalEvents');
		expect(result.order).toBe(ORDER.ASC);
		expect(result.entries[0].value).toBe(4);
	});

	test('defaults to a top five', () => {
		const many = Array.from({ length: 12 }, (_, i) => ({
			vehicleId: `V${i}`,
			safetyScore: 100 - i,
		}));

		expect(topPerformers(many, 'safetyScore').entries).toHaveLength(DEFAULT_LIMIT);
	});

	test('an explicit limit overrides the default', () => {
		expect(topPerformers(FLEET, 'safetyScore', { limit: 2 }).entries).toHaveLength(2);
	});



	test('refuses to name a best vehicle out of one', () => {
		const result = topPerformers([{ vehicleId: 'A', safetyScore: 90 }], 'safetyScore');

		expect(result.status).toBe(STATUS.INSUFFICIENT_DATA);
	});



	test('a directionless metric is reported as not rankable', () => {
		expect(topPerformers(FLEET, 'totalDistanceKm').status).toBe(STATUS.NOT_RANKABLE);

	});
});

describe('requiresAttention()', () => {
	test('puts the worst vehicle first for a higher-is-better metric', () => {
		const result = requiresAttention(FLEET, 'safetyScore');
		expect(result.order).toBe(ORDER.ASC);
		expect(result.entries[0].id).toBe('V004');
		expect(result.entries[0].value).toBe(55);

	});

	test('puts the worst vehicle first for a lower-is-better metric', () => {
		const result = requiresAttention(FLEET, 'totalEvents');
		expect(result.order).toBe(ORDER.DESC);
		expect(result.entries[0].id).toBe('V004');
		expect(result.entries[0].value).toBe(31);
	});

	test('is the exact inverse of topPerformers', () => {
		const best = topPerformers(FLEET, 'safetyScore').entries.map((e) => e.id);
		const worst = requiresAttention(FLEET, 'safetyScore').entries.map((e) => e.id);
		expect(worst[0]).toBe(best[best.length - 1]);
	});

	test('refuses to flag a vehicle out of one', () => {
		const result = requiresAttention([{ vehicleId: 'A', safetyScore: 20 }], 'safetyScore');
		expect(result.status).toBe(STATUS.INSUFFICIENT_DATA);
	});

	test('a directionless metric is reported as not rankable', () => {
		expect(requiresAttention(FLEET, 'totalDistanceKm').status).toBe(STATUS.NOT_RANKABLE);
	});

});

describe('mergeEntities()', () => {
	const DISTANCE = [
		{ vehicleId: 'V002', distanceKm: 120, utilisationPct: 71 },
		{ vehicleId: 'V001', distanceKm: 300, utilisationPct: 95 },
	];
	const FUEL = [
		{ vehicleId: 'V001', avgEfficiencyKmPerL: 9.4 },
		{ vehicleId: 'V003', avgEfficiencyKmPerL: 11.1 },
	];
	const SAFETY = [
		{ vehicleId: 'V001', safetyScore: 88 },
		{ vehicleId: 'V002', safetyScore: 64 },
	];

	test('rejects a non-array of sources', () => {
		expect(() => mergeEntities(null)).toThrow('mergeEntities requires an array of entity arrays');
	});

	test('joins the three analytics services on vehicle id', () => {
		const merged = mergeEntities([DISTANCE, FUEL, SAFETY]);
		expect(merged.map((e) => e.vehicleId)).toEqual(['V001', 'V002', 'V003']);
		expect(merged[0]).toEqual({
			vehicleId: 'V001',
			distanceKm: 300,
			utilisationPct: 95,
			avgEfficiencyKmPerL: 9.4,
			safetyScore: 88,
		});
	});

	test('a vehicle present in only one source still appears', () => {
		const merged = mergeEntities([DISTANCE, FUEL, SAFETY]);
		const v3 = merged.find((e) => e.vehicleId === 'V003');
		expect(v3).toEqual({ vehicleId: 'V003', avgEfficiencyKmPerL: 11.1 });
		expect(v3.safetyScore).toBeUndefined();
	});

	test('returns entities sorted by id for a stable report ordering', () => {
		const merged = mergeEntities([DISTANCE, FUEL, SAFETY]);
		const ids = merged.map((e) => e.vehicleId);
		expect(ids).toEqual([...ids].sort());
	});

	test('later sources win on a field collision', () => {
		const merged = mergeEntities([
			[{ vehicleId: 'V001', safetyScore: 10 }],
			[{ vehicleId: 'V001', safetyScore: 88 }],
		]);
		expect(merged[0].safetyScore).toBe(88);
	});

	test('skips sources that are not arrays', () => {
		const merged = mergeEntities([DISTANCE, null, undefined, 'nope', SAFETY]);
		expect(merged).toHaveLength(2);
	});

	test('skips entities with no id', () => {
		const merged = mergeEntities([[{ distanceKm: 5 }, { vehicleId: null }, { vehicleId: 'V001' }]]);
		expect(merged).toEqual([{ vehicleId: 'V001' }]);
	});

	test('normalises numeric ids to strings so sources join correctly', () => {
		const merged = mergeEntities([
			[{ vehicleId: 1001, distanceKm: 50 }],
			[{ vehicleId: '1001', safetyScore: 70 }],
		]);
		expect(merged).toHaveLength(1);
		expect(merged[0]).toEqual({ vehicleId: '1001', distanceKm: 50, safetyScore: 70 });
	});

	test('an empty source list produces an empty merge', () => {
		expect(mergeEntities([])).toEqual([]);
		expect(mergeEntities([[], []])).toEqual([]);
	});

	test('honours a custom id field', () => {
		const merged = mergeEntities([[{ groupId: 'G1', a: 1 }], [{ groupId: 'G1', b: 2 }]], 'groupId');
		expect(merged).toEqual([{ groupId: 'G1', a: 1, b: 2 }]);
	});

	test('the merged output feeds straight into rankBy', () => {
		const merged = mergeEntities([DISTANCE, FUEL, SAFETY]);
		const result = topPerformers(merged, 'safetyScore');
		expect(result.status).toBe(STATUS.OK);
		expect(result.entries[0].id).toBe('V001');

		expect(result.unavailable.map((e) => e.id)).toEqual(['V003']);

	});

});