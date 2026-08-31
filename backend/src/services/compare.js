'use strict';

const STABILITY_THRESHOLD_PCT = 5;

const DIRECTION = {
    IMPROVED: 'improved',
    DETERIORATED: 'deteriorated',
    INCREASED: 'increased',
    DECREASED: 'decreased',
    STABLE: 'stable',
    NO_BASELINE: 'no_baseline',
    INSUFFICIENT_BASELINE: 'insufficient_baseline',
    UNAVAILABLE: 'unavailable',
};

const METRIC_DEFINITIONS = {
    totalDistanceKm: { label: 'Total distance', unit: 'km', higherIsBetter: null },
    totalDurationSeconds: { label: 'Total driving time', unit: 's', higherIsBetter: null },
    totalMovingSeconds: { label: 'Time moving', unit: 's', higherIsBetter: null },
    totalIdleSeconds: { label: 'Time idling', unit: 's', higherIsBetter: false },
    idleRatio: { label: 'Idle ratio', unit: 'ratio', higherIsBetter: false },
    tripCount: { label: 'Trips', unit: 'trips', higherIsBetter: null },
    avgTripDistanceKm: { label: 'Average trip distance', unit: 'km', higherIsBetter: null },
    avgMovingSpeedKmh: { label: 'Average moving speed', unit: 'km/h', higherIsBetter: null },
    avgJourneySpeedKmh: { label: 'Average journey speed', unit: 'km/h', higherIsBetter: null },
    maxSpeedKmh: { label: 'Peak speed', unit: 'km/h', higherIsBetter: false },
    activeVehicles: { label: 'Active vehicles', unit: 'vehicles', higherIsBetter: true },
    inactiveVehicles: { label: 'Inactive vehicles', unit: 'vehicles', higherIsBetter: false },
    utilisationPct: { label: 'Utilisation', unit: '%', higherIsBetter: true },



    totalFuelLiters: { label: 'Estimated fuel used', unit: 'L', higherIsBetter: null },
    avgEfficiencyKmPerL: { label: 'Fuel efficiency', unit: 'km/L', higherIsBetter: true },
    avgConsumptionLPer100Km: { label: 'Fuel consumption', unit: 'L/100km', higherIsBetter: false },
    tripsWithFuelData: { label: 'Trips with fuel data', unit: 'trips', higherIsBetter: null },
};

function definitionFor(metric){
    return METRIC_DEFINITIONS[metric] || { label: metric, unit: null, higherIsBetter: null };
}

function isNumber(value){
    return typeof value === 'number' && Number.isFinite(value);
}

function round(value, dp) {
    if (!isNumber(value)) return null;
    const factor = 10 ** dp;
    const sign = value < 0 ? -1 : 1;
    return (sign * Math.round(Math.abs(value) * factor)) / factor;

}

function directionFor(percentChange, higherIsBetter, threshold){
    if (percentChange === null) return null;

    if (Math.abs(percentChange) < threshold) return DIRECTION.STABLE;



    const rising = percentChange > 0;
    if (higherIsBetter === null) {
        return rising ? DIRECTION.INCREASED : DIRECTION.DECREASED;
    }


    const better = higherIsBetter ? rising : !rising;

    return better ? DIRECTION.IMPROVED : DIRECTION.DETERIORATED;

}

function compareMetric(metric, current, previous, options = {}){
    const {
        baselineSufficient = true,
        stabilityThresholdPct = STABILITY_THRESHOLD_PCT,
        precision = 2,
    } = options;

    const { label, unit, higherIsBetter } = definitionFor(metric);

    const base = {
        metric,
        label,
        unit,
        higherIsBetter,
        current: isNumber(current) ? round(current, precision) : null,
        previous: isNumber(previous) ? round(previous, precision) : null,
        absoluteChange: null,
        percentChange: null,
        direction: DIRECTION.UNAVAILABLE,
        stabilityThresholdPct,
    };

    if (!isNumber(current)) return base;

    if (!isNumber(previous)) {
        return { ...base, direction: DIRECTION.NO_BASELINE };
    }

    const absoluteChange = round(current - previous, precision);

    if (previous === 0) {
        return {
            ...base,
            absoluteChange,
            direction: current === 0 ? DIRECTION.STABLE : DIRECTION.NO_BASELINE,
        };
    }

    const percentChange = round(((current - previous) / Math.abs(previous)) * 100, 1);

    if (!baselineSufficient) {
        return {
            ...base,
            absoluteChange,
            percentChange,
            direction: DIRECTION.INSUFFICIENT_BASELINE,

        };

    }

    return {
        ...base,
        absoluteChange,
        percentChange,
        direction: directionFor(percentChange, higherIsBetter, stabilityThresholdPct),
    };
    
}