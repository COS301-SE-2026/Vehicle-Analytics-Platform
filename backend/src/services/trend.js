'use strict';

const {
    compareMetric,
    definitionFor,
    round,
    STABILITY_THRESHOLD_PCT,
} = require('./compare');

const MIN_WEEKS_FOR_TREND = 3;
const VOLATILITY_THRESHOLD = 0.5;

const TREND = {
    IMPROVING: 'improving',
    DETERIORATING: 'deteriorating',
    INCREASING: 'increasing',
    DECREASING: 'decreasing',
    STABLE: 'stable',
    VOLATILE: 'volatile',
    INSUFFICIENT_DATA: 'insufficient_data',
};

function isNumber(value){
    return typeof value === 'number' && Number.isFinite(value);
}

function leastSquaresSlope(pairs) {
    if (pairs.length < 2) return null;

    const meanX = pairs.reduce((s, p) => s + p.x, 0) / pairs.length;
    const meanY = pairs.reduce((s, p) => s + p.y, 0) / pairs.length;

    let numerator = 0;
    let denominator = 0;
    pairs.forEach(({ x, y }) => {
        numerator += (x - meanX) * (y - meanY);
        denominator += (x - meanX) ** 2;
    });

    if (denominator === 0) return null;
    return numerator / denominator;
}

function coefficientOfVariation(values) {
    if (values.length < 2) return null;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    if (mean === 0) return null;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance) / Math.abs(mean);
}

function classify(modelledChangePct, cv, higherIsBetter, threshold) {
    if (modelledChangePct === null) return TREND.INSUFFICIENT_DATA;

    if (Math.abs(modelledChangePct) < threshold) {
        return cv !== null && cv > VOLATILITY_THRESHOLD ? TREND.VOLATILE : TREND.STABLE;
    }

    const rising = modelledChangePct > 0;
    if (higherIsBetter === null) return rising ? TREND.INCREASING : TREND.DECREASING;
    return (higherIsBetter ? rising : !rising) ? TREND.IMPROVING : TREND.DETERIORATING;
}


function buildTrend(metric, points, options = {}){
    if (!Array.isArray(points)) {
        throw new Error('buildTrend requires an array of weekly points');
    }

    const {
        stabilityThresholdPct = STABILITY_THRESHOLD_PCT,
        minWeeks = MIN_WEEKS_FOR_TREND,
        precision = 2,
    } = options;

    const { label, unit, higherIsBetter } = definitionFor(metric);

    const series = points.map((point, position) => {
        const week = point.week || {};
        return {
            index: isNumber(week.index) ? week.index : position + 1,
            label: week.label || `Week ${position + 1}`,
            dateLabel: week.dateLabel || null,
            fromDate: week.fromDate || null,
            toDate: week.toDate || null,
            value: isNumber(point.value) ? round(point.value, precision) : null,
        };
    });

    const present = series
        .map((p, position) => ({ x: position, y: p.value })).filter((p) => p.y !== null);

    const values = present.map((p) => p.y);

    const base = {
        metric,
        label,
        unit,
        higherIsBetter,
        points: series,
        weeksTotal: series.length,
        weeksWithData: values.length,
        first: values.length ? values[0] : null,
        last: values.length ? values[values.length - 1] : null,
        min: values.length ? Math.min(...values) : null,
        max: values.length ? Math.max(...values) : null,
        mean: values.length
            ? round(values.reduce((s, v) => s + v, 0) / values.length, precision)
            : null,
        slopePerWeek: null,
        slopePctPerWeek: null,
        modelledChangePct: null,
        coefficientOfVariation: null,
        classification: TREND.INSUFFICIENT_DATA,
        stabilityThresholdPct,
        minWeeks,
        change: compareMetric(
            metric,
            values.length ? values[values.length - 1] : null,
            values.length ? values[0] : null,
            { stabilityThresholdPct, precision },
        ),
    };


    if (values.length < minWeeks) return base;

    const slope = leastSquaresSlope(present);

    const mean = values.reduce((s, v) => s + v, 0) / values.length;

    const cv = coefficientOfVariation(values);

    const slopePct = slope !== null && mean !== 0
        ? (slope / Math.abs(mean)) * 100
        : null;

    const span = present.length ? present[present.length - 1].x - present[0].x : 0;

    const modelledChangePct = slopePct === null ? null : slopePct * span;


    return {
        ...base,
        slopePerWeek: round(slope, precision),
        slopePctPerWeek: round(slopePct, 1),
        modelledChangePct: round(modelledChangePct, 1),
        coefficientOfVariation: round(cv, 3),
        classification: classify(modelledChangePct, cv, higherIsBetter, stabilityThresholdPct),
    };


}
