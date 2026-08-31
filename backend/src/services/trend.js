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



