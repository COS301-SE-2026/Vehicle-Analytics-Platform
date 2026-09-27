'use strict';

const MIN_PEER_VEHICLES = 5;
const MIN_EXPOSURE_KM = 10;
const MIN_SUPPORTING_EVENTS = 3;
const Z_THRESHOLD = 3.5;
const MAD_SCALE = 0.6745;
const MEAN_AD_SCALE = 1.253314;



const METHOD = {
    MODIFIED_Z: 'modified_z',
    MEAN_AD: 'mean_absolute_deviation',
    PEERS_UNIFORM: 'peers_uniform',
};

const STATUS = {
    SCORED: 'scored',
    INSUFFICIENT_PEERS: 'insufficient_peers',
    INSUFFICIENT_EXPOSURE: 'insufficient_exposure',
    NOT_MEASURABLE: 'not_measurable',
};


const SEVERITY = { HIGH: 'high', MODERATE: 'moderate', LOW: 'low' };

const FEATURE_DEFINITIONS = {
    harshBrakingPer100Km: {
        label: 'Harsh braking rate', unit: 'events/100km', supportingCountKey: 'harshBrakes',
    },
    harshAccelerationPer100Km: {
        label: 'Harsh acceleration rate', unit: 'events/100km', supportingCountKey: 'harshAccelerations',
    },
    harshCorneringPer100Km: {
        label: 'Harsh cornering rate', unit: 'events/100km', supportingCountKey: 'harshCornering',
    },
    overspeedPer100Km: {
        label: 'Overspeed rate', unit: 'events/100km', supportingCountKey: 'overspeedEvents',
    },
    idlingPerActiveDay: {
        label: 'Idling incidents per active day', unit: 'events/day', supportingCountKey: 'idlingEvents',
    },
    p95SpeedKmh: {
        label: 'Sustained speed (95th percentile)', unit: 'km/h', supportingCountKey: null,
    },

};


const FEATURE_KEYS = Object.keys(FEATURE_DEFINITIONS);

function isNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function round(value, dp = 2){
    if (!isNumber(value)) return null;
    const factor = 10 ** dp;
    const sign = value < 0 ? -1 : 1;
    return (sign * Math.round(Math.abs(value) * factor)) / factor;
}

function median(values){
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function medianAbsoluteDeviation(values, centre){
    if (!values.length) return null;
    return median(values.map((v) => Math.abs(v - centre)));
}

function meanAbsoluteDeviation(values, centre){
    if (!values.length) return null;
    return values.reduce((sum, v) => sum + Math.abs(v - centre), 0) / values.length;
}

function scoreAgainstPeers(value, peerValues){
    const centre = median(peerValues);
    if (centre === null) return null;

    const mad = medianAbsoluteDeviation(peerValues, centre);
    if (mad > 0) {
        return {
            method: METHOD.MODIFIED_Z,
            peerMedian: centre,
            peerMad: mad,
            score: (MAD_SCALE * (value - centre)) / mad,
        };
    }

    const meanAd = meanAbsoluteDeviation(peerValues, centre);
    if (meanAd > 0) {
        return {
            method: METHOD.MEAN_AD,
            peerMedian: centre,
            peerMad: 0,
            score: (value - centre) / (MEAN_AD_SCALE * meanAd),
        };
    }

    return {
        method: METHOD.PEERS_UNIFORM,
        peerMedian: centre,
        peerMad: 0,
        score: null,
    };
}