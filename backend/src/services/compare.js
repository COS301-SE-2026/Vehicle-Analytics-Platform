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