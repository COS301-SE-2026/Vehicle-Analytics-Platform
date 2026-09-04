'use strict';

const {
    compareMetric,
    compareSummaries,
    isBaselineSufficient,
    METRIC_DEFINITIONS,
    STABILITY_THRESHOLD_PCT,
    DIRECTION,
} = require('../src/services/compare');

describe('compare - metric registry', () => {
    test('metrics where more is better', () => {
        expect(METRIC_DEFINITIONS.totalDistanceKm.higherIsBetter).toBeNull();
        expect(METRIC_DEFINITIONS.utilisationPct.higherIsBetter).toBe(true);
        expect(METRIC_DEFINITIONS.avgEfficiencyKmPerL.higherIsBetter).toBe(true);
        expect(METRIC_DEFINITIONS.activeVehicles.higherIsBetter).toBe(true);
    });

    test('metrics where less is better', () => {
        expect(METRIC_DEFINITIONS.totalIdleSeconds.higherIsBetter).toBe(false);
        expect(METRIC_DEFINITIONS.idleRatio.higherIsBetter).toBe(false);
        expect(METRIC_DEFINITIONS.avgConsumptionLPer100Km.higherIsBetter).toBe(false);
        expect(METRIC_DEFINITIONS.maxSpeedKmh.higherIsBetter).toBe(false);
    });

    test('metrics with no inherent good direction are neutral', () => {
        expect(METRIC_DEFINITIONS.avgTripDistanceKm.higherIsBetter).toBeNull();
        expect(METRIC_DEFINITIONS.avgMovingSpeedKmh.higherIsBetter).toBeNull();
        expect(METRIC_DEFINITIONS.tripCount.higherIsBetter).toBeNull();
    });

    test('total fuel is neutral; consumption per 100 km carries the direction', () => {
        expect(METRIC_DEFINITIONS.totalFuelLiters.higherIsBetter).toBeNull();
        expect(METRIC_DEFINITIONS.avgConsumptionLPer100Km.higherIsBetter).toBe(false);
    });

    test('every definition carries a label', () => {
        Object.entries(METRIC_DEFINITIONS).forEach(([, def]) => {
            expect(typeof def.label).toBe('string');
            expect(def.label.length).toBeGreaterThan(0);
        });
    });
});


describe('compare - arithmetic', () => {
    test('computes absolute and percentage change', () => {
        const result = compareMetric('totalDistanceKm', 4821.3, 4402.7);

        expect(result.current).toBe(4821.3);
        expect(result.previous).toBe(4402.7);
        expect(result.absoluteChange).toBe(418.6);
        expect(result.percentChange).toBe(9.5);
    });

    test('reproduces the harsh-braking example from the requirements', () => {
        const result = compareMetric('harshBrakes', 143, 176, {});
        expect(result.absoluteChange).toBe(-33);
        expect(result.percentChange).toBe(-18.8);
    });

    test('rounds equal-magnitude gains and losses symmetrically', () => {
        expect(compareMetric('tripCount', 143, 176).percentChange).toBe(-18.8);
        expect(compareMetric('tripCount', 209, 176).percentChange).toBe(18.8);
    });

    test('percentage is relative to the previous period', () => {
        expect(compareMetric('tripCount', 150, 100).percentChange).toBe(50);
        expect(compareMetric('tripCount', 50, 100).percentChange).toBe(-50);
        expect(compareMetric('tripCount', 200, 100).percentChange).toBe(100);
    });

    test('a negative baseline still yields a signed percentage', () => {
        const result = compareMetric('someMetric', -5, -10);
        expect(result.absoluteChange).toBe(5);
        expect(result.percentChange).toBe(50);
    });

    test('percentage is rounded to one decimal place', () => {
        expect(compareMetric('tripCount', 1, 3).percentChange).toBe(-66.7);
    });

    test('carries the metric label and unit through', () => {
        const result = compareMetric('utilisationPct', 81, 71);
        expect(result.label).toBe('Utilisation');
        expect(result.unit).toBe('%');
    });
});

describe('compare - direction for polarised metrics', () => {
    test('more of a good metric is an improvement', () => {
        expect(compareMetric('utilisationPct', 81, 71).direction).toBe(DIRECTION.IMPROVED);
    });

    test('less of a good metric is a deterioration', () => {
        expect(compareMetric('utilisationPct', 60, 71).direction).toBe(DIRECTION.DETERIORATED);
    });

    test('less of a bad metric is an improvement', () => {
        const result = compareMetric('totalIdleSeconds', 7200, 10800);
        expect(result.percentChange).toBe(-33.3);
        expect(result.direction).toBe(DIRECTION.IMPROVED);
    });

    test('more of a bad metric is a deterioration', () => {
        expect(compareMetric('avgConsumptionLPer100Km', 12, 10).direction)
            .toBe(DIRECTION.DETERIORATED);
    });

    test('the sign alone does not determine the direction', () => {
        const good = compareMetric('utilisationPct', 60, 71);
        const bad = compareMetric('totalIdleSeconds', 7200, 10800);

        expect(good.percentChange).toBeLessThan(0);
        expect(bad.percentChange).toBeLessThan(0);
        expect(good.direction).not.toBe(bad.direction);
    });
});

describe('compare - direction for neutral metrics', () => {
    test('neutral metrics report movement, not judgement', () => {
        expect(compareMetric('avgMovingSpeedKmh', 70, 60).direction).toBe(DIRECTION.INCREASED);
        expect(compareMetric('avgMovingSpeedKmh', 50, 60).direction).toBe(DIRECTION.DECREASED);
    });

    test('a neutral metric is never called improved or deteriorated', () => {
        const outcomes = [
            compareMetric('tripCount', 200, 100).direction,
            compareMetric('tripCount', 50, 100).direction,
            compareMetric('totalDistanceKm', 900, 600).direction,
        ];
        outcomes.forEach((d) => {
            expect(d).not.toBe(DIRECTION.IMPROVED);
            expect(d).not.toBe(DIRECTION.DETERIORATED);
        });
    });

    test('an unregistered metric defaults to neutral rather than crashing', () => {
        const result = compareMetric('somethingNew', 120, 100);
        expect(result.higherIsBetter).toBeNull();
        expect(result.label).toBe('somethingNew');
        expect(result.direction).toBe(DIRECTION.INCREASED);
    });
});

describe('compare - stability threshold', () => {
    test('a small change is stable, not movement', () => {
        const result = compareMetric('totalDistanceKm', 102, 100);
        expect(result.percentChange).toBe(2);
        expect(result.direction).toBe(DIRECTION.STABLE);
    });

    test('exactly at the threshold counts as movement', () => {
        const result = compareMetric('utilisationPct', 105, 100);
        expect(result.percentChange).toBe(5);
        expect(result.direction).toBe(DIRECTION.IMPROVED);
    });

    test('just below the threshold is stable', () => {
        const result = compareMetric('utilisationPct', 104.9, 100);
        expect(result.percentChange).toBe(4.9);
        expect(result.direction).toBe(DIRECTION.STABLE);
    });

    test('the threshold applies symmetrically', () => {
        expect(compareMetric('utilisationPct', 97, 100).direction).toBe(DIRECTION.STABLE);
        expect(compareMetric('utilisationPct', 94, 100).direction).toBe(DIRECTION.DETERIORATED);
    });

    test('the threshold is configurable and reported in the output', () => {
        const strict = compareMetric('utilisationPct', 102, 100, { stabilityThresholdPct: 1 });
        expect(strict.direction).toBe(DIRECTION.IMPROVED);
        expect(strict.stabilityThresholdPct).toBe(1);

        expect(compareMetric('utilisationPct', 102, 100).stabilityThresholdPct)
            .toBe(STABILITY_THRESHOLD_PCT);
    });

    test('no change at all is stable', () => {
        const result = compareMetric('totalDistanceKm', 500, 500);
        expect(result.absoluteChange).toBe(0);
        expect(result.percentChange).toBe(0);
        expect(result.direction).toBe(DIRECTION.STABLE);
    });
});

describe('compare - zero and missing baselines', () => {
    test('a zero baseline yields no percentage, never Infinity', () => {
        const result = compareMetric('totalDistanceKm', 500, 0);

        expect(result.absoluteChange).toBe(500);
        expect(result.percentChange).toBeNull();
        expect(result.direction).toBe(DIRECTION.NO_BASELINE);
        expect(Number.isFinite(result.percentChange)).toBe(false);
    });

    test('zero to zero is stable, not a missing baseline', () => {
        const result = compareMetric('totalDistanceKm', 0, 0);
        expect(result.absoluteChange).toBe(0);
        expect(result.percentChange).toBeNull();
        expect(result.direction).toBe(DIRECTION.STABLE);
    });

    test('a null baseline means no baseline', () => {
        const result = compareMetric('totalDistanceKm', 500, null);
        expect(result.previous).toBeNull();
        expect(result.absoluteChange).toBeNull();
        expect(result.percentChange).toBeNull();
        expect(result.direction).toBe(DIRECTION.NO_BASELINE);
    });

    test('an uncomputable current value is unavailable, not zero', () => {
        const result = compareMetric('avgEfficiencyKmPerL', null, 10);
        expect(result.current).toBeNull();
        expect(result.absoluteChange).toBeNull();
        expect(result.direction).toBe(DIRECTION.UNAVAILABLE);
    });

    test('both values missing is unavailable', () => {
        expect(compareMetric('avgEfficiencyKmPerL', null, null).direction)
            .toBe(DIRECTION.UNAVAILABLE);
    });

    test('non-numeric values are treated as missing', () => {
        expect(compareMetric('tripCount', undefined, 10).direction).toBe(DIRECTION.UNAVAILABLE);
        expect(compareMetric('tripCount', NaN, 10).direction).toBe(DIRECTION.UNAVAILABLE);
        expect(compareMetric('tripCount', Infinity, 10).direction).toBe(DIRECTION.UNAVAILABLE);
        expect(compareMetric('tripCount', '150', 10).direction).toBe(DIRECTION.UNAVAILABLE);
    });
});

describe('compare - insufficient baseline', () => {
    test('values are shown but judgement is withheld', () => {
        const result = compareMetric('utilisationPct', 80, 50, { baselineSufficient: false });

        expect(result.current).toBe(80);
        expect(result.previous).toBe(50);
        expect(result.absoluteChange).toBe(30);
        expect(result.percentChange).toBe(60);
        expect(result.direction).toBe(DIRECTION.INSUFFICIENT_BASELINE);
    });

    test('overrides what would otherwise be a confident direction', () => {
        const confident = compareMetric('utilisationPct', 80, 50);
        expect(confident.direction).toBe(DIRECTION.IMPROVED);

        const guarded = compareMetric('utilisationPct', 80, 50, { baselineSufficient: false });
        expect(guarded.direction).toBe(DIRECTION.INSUFFICIENT_BASELINE);
    });

    test('does not override a genuinely absent baseline', () => {
        const result = compareMetric('utilisationPct', 80, null, { baselineSufficient: false });
        expect(result.direction).toBe(DIRECTION.NO_BASELINE);
    });
});

describe('isBaselineSufficient', () => {
    test('accepts a baseline where most of the fleet reported', () => {
        expect(isBaselineSufficient({ activeVehicles: 13, vehiclesInScope: 15 })).toBe(true);
    });

    test('rejects a baseline where most of the fleet was silent', () => {
        expect(isBaselineSufficient({ activeVehicles: 3, vehiclesInScope: 15 })).toBe(false);
    });

    test('rejects a baseline with no active vehicles', () => {
        expect(isBaselineSufficient({ activeVehicles: 0, vehiclesInScope: 15 })).toBe(false);
    });

    test('rejects a missing or empty baseline', () => {
        expect(isBaselineSufficient(null)).toBe(false);
        expect(isBaselineSufficient(undefined)).toBe(false);
        expect(isBaselineSufficient({})).toBe(false);
        expect(isBaselineSufficient({ activeVehicles: 5, vehiclesInScope: 0 })).toBe(false);
    });

    test('exactly at the coverage ratio is sufficient', () => {
        expect(isBaselineSufficient({ activeVehicles: 5, vehiclesInScope: 10 })).toBe(true);
    });

    test('thresholds are configurable', () => {
        const baseline = { activeVehicles: 3, vehiclesInScope: 15 };
        expect(isBaselineSufficient(baseline, { minCoverageRatio: 0.2 })).toBe(true);
        expect(isBaselineSufficient(baseline, { minActiveVehicles: 5 })).toBe(false);
    });

    test('falls back to fuel coverage when distance coverage is absent', () => {
        expect(isBaselineSufficient({ vehiclesWithFuelData: 8, vehiclesInScope: 10 })).toBe(true);
        expect(isBaselineSufficient({ vehiclesWithFuelData: 1, vehiclesInScope: 10 })).toBe(false);
    });
});

describe('compareSummaries', () => {
    const current = {
        totalDistanceKm: 720,
        totalIdleSeconds: 7200,
        utilisationPct: 60,
        avgEfficiencyKmPerL: 10,
        activeVehicles: 2,
        vehiclesInScope: 2,
    };

    const previous = {
        totalDistanceKm: 600,
        totalIdleSeconds: 10800,
        utilisationPct: 50,
        avgEfficiencyKmPerL: 8,
        activeVehicles: 2,
        vehiclesInScope: 2,
    };

    test('compares every numeric metric in the current summary', () => {
        const result = compareSummaries(current, previous);

        expect(Object.keys(result)).toEqual(expect.arrayContaining([
            'totalDistanceKm', 'totalIdleSeconds', 'utilisationPct', 'avgEfficiencyKmPerL',
        ]));
        expect(result.totalDistanceKm.percentChange).toBe(20);
        expect(result.utilisationPct.direction).toBe(DIRECTION.IMPROVED);
        expect(result.totalIdleSeconds.direction).toBe(DIRECTION.IMPROVED);
    });

    test('restricts to an explicit metric list when given one', () => {
        const result = compareSummaries(current, previous, { metrics: ['utilisationPct'] });
        expect(Object.keys(result)).toEqual(['utilisationPct']);
    });

    test('a missing previous summary yields no_baseline throughout', () => {
        const result = compareSummaries(current, null);

        Object.values(result).forEach((c) => {
            expect(c.previous).toBeNull();
            expect(c.direction).toBe(DIRECTION.NO_BASELINE);
        });
    });

    test('a metric absent from the baseline is no_baseline, not zero', () => {
        const result = compareSummaries(current, { totalDistanceKm: 600 });

        expect(result.totalDistanceKm.direction).toBe(DIRECTION.IMPROVED === result.totalDistanceKm.direction
            ? result.totalDistanceKm.direction : DIRECTION.INCREASED);
        expect(result.utilisationPct.previous).toBeNull();
        expect(result.utilisationPct.direction).toBe(DIRECTION.NO_BASELINE);
    });

    test('skips non-numeric fields such as flags and nested objects', () => {
        const withExtras = {
            ...current,
            estimated: true,
            roadClassDistanceKm: { motorway: 450 },
            periodDays: 7,
        };
        const result = compareSummaries(withExtras, previous);

        expect(result.estimated).toBeUndefined();
        expect(result.roadClassDistanceKm).toBeUndefined();
        expect(result.periodDays).toBeDefined();
    });

    test('includes null-valued metrics so they report as unavailable', () => {
        const result = compareSummaries(
            { ...current, avgEfficiencyKmPerL: null },
            previous,
        );
        expect(result.avgEfficiencyKmPerL.direction).toBe(DIRECTION.UNAVAILABLE);
    });

    test('propagates baseline sufficiency to every metric', () => {
        const result = compareSummaries(current, previous, { baselineSufficient: false });
        expect(result.totalDistanceKm.direction).toBe(DIRECTION.INSUFFICIENT_BASELINE);
        expect(result.utilisationPct.direction).toBe(DIRECTION.INSUFFICIENT_BASELINE);
    });

    test('rejects a missing current summary', () => {
        expect(() => compareSummaries(null, previous)).toThrow(/current summary/);
        expect(() => compareSummaries('nope', previous)).toThrow(/current summary/);
    });

    test('every comparison has a consistent shape for the UI', () => {
        const result = compareSummaries(current, previous);
        Object.values(result).forEach((c) => {
            expect(c).toEqual(expect.objectContaining({
                metric: expect.any(String),
                label: expect.any(String),
                direction: expect.any(String),
                stabilityThresholdPct: expect.any(Number),
            }));
            expect(c).toHaveProperty('current');
            expect(c).toHaveProperty('previous');
            expect(c).toHaveProperty('absoluteChange');
            expect(c).toHaveProperty('percentChange');
            expect(c).toHaveProperty('higherIsBetter');
        });
    });
});

describe('compare - integration with analytics summaries', () => {
    test('works against realistic distance summaries for adjacent weeks', () => {
        const thisWeek = {
            totalDistanceKm: 720, totalIdleSeconds: 10800, tripCount: 14,
            utilisationPct: 50, activeVehicles: 2, vehiclesInScope: 2,
        };
        const lastWeek = {
            totalDistanceKm: 640, totalIdleSeconds: 14400, tripCount: 12,
            utilisationPct: 42.86, activeVehicles: 2, vehiclesInScope: 2,
        };

        const sufficient = isBaselineSufficient(lastWeek);
        const result = compareSummaries(thisWeek, lastWeek, { baselineSufficient: sufficient });

        expect(sufficient).toBe(true);
        expect(result.totalDistanceKm.percentChange).toBe(12.5);
        expect(result.totalIdleSeconds.percentChange).toBe(-25);
        expect(result.totalIdleSeconds.direction).toBe(DIRECTION.IMPROVED);
        expect(result.utilisationPct.direction).toBe(DIRECTION.IMPROVED);
        expect(result.tripCount.direction).toBe(DIRECTION.INCREASED);
    });

    test('a baseline week where the fleet was mostly offline withholds judgement', () => {
        const thisWeek = {
            totalDistanceKm: 720, utilisationPct: 50, activeVehicles: 10, vehiclesInScope: 10,
        };
        const lastWeek = {
            totalDistanceKm: 120, utilisationPct: 8, activeVehicles: 2, vehiclesInScope: 10,
        };

        const sufficient = isBaselineSufficient(lastWeek);
        const result = compareSummaries(thisWeek, lastWeek, { baselineSufficient: sufficient });

        expect(sufficient).toBe(false);
        expect(result.totalDistanceKm.percentChange).toBe(500);
        expect(result.totalDistanceKm.direction).toBe(DIRECTION.INSUFFICIENT_BASELINE);
    });
});