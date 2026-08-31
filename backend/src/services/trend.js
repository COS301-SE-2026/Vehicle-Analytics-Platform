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

