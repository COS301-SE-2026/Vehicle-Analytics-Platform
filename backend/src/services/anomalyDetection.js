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


function severityFromScore(score){
    if (score >= 8) return SEVERITY.HIGH;
    if (score >= 5.5) return SEVERITY.MODERATE;
    return SEVERITY.LOW;
}
 
function severityFromCount(count){
    if (count >= 10) return SEVERITY.HIGH;
    if (count >= 5) return SEVERITY.MODERATE;
    return SEVERITY.LOW;
}


 
function supportingCount(vehicle, definition){
    if (!definition.supportingCountKey) return null;
    const counts = vehicle.counts || {};
    const raw = counts[definition.supportingCountKey];
    return isNumber(raw) ? raw : 0;
}

 
function isEligible(vehicle){
    return isNumber(vehicle.distanceKm) && vehicle.distanceKm >= MIN_EXPOSURE_KM;
}


 
function featureValue(vehicle, featureKey){
    const features = vehicle.features || {};
    const value = features[featureKey];
    return isNumber(value) ? value : null;
}
 
function buildFlag(featureKey, definition, vehicle, value, scored){
    const count = supportingCount(vehicle, definition);

    const uniformPeers = scored.method === METHOD.PEERS_UNIFORM;



    if (count !== null && count < MIN_SUPPORTING_EVENTS) return null;
 
    if (uniformPeers) {
        if (!(value > scored.peerMedian)) return null;
    } else if (!(scored.score > Z_THRESHOLD)) {
        return null;
    }

 
    const severity = uniformPeers
        ? (count === null ? SEVERITY.LOW : severityFromCount(count))
        : severityFromScore(scored.score);
 
    return {
        feature: featureKey,
        label: definition.label,
        unit: definition.unit,
        value: round(value, 3),
        peerMedian: round(scored.peerMedian, 3),
        peerMad: round(scored.peerMad, 3),
        ratio: scored.peerMedian > 0 ? round(value / scored.peerMedian, 2) : null,
        score: round(scored.score, 2),
        method: scored.method,
        severity,
        supportingCount: count,
    };

}
 
function worstSeverity(flags){
    if (flags.some((f) => f.severity === SEVERITY.HIGH)) return SEVERITY.HIGH;
    if (flags.some((f) => f.severity === SEVERITY.MODERATE)) return SEVERITY.MODERATE;
    return flags.length ? SEVERITY.LOW : null;

}
 
const SEVERITY_ORDER = [SEVERITY.HIGH, SEVERITY.MODERATE, SEVERITY.LOW];
 
function byImportance(a, b){
    const severity = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (severity !== 0) return severity;
    if (b.flagCount !== a.flagCount) return b.flagCount - a.flagCount;
    return a.vehicleId.localeCompare(b.vehicleId);
}

 

function detectFleetAnomalies(vehicles = []){

    const eligible = vehicles.filter(isEligible);
 
    const featureSummary = {};
    const flagsByVehicle = new Map();
    vehicles.forEach((v) => flagsByVehicle.set(v.vehicleId, []));
 
    FEATURE_KEYS.forEach((featureKey) => {
        const definition = FEATURE_DEFINITIONS[featureKey];
 
        const measured = eligible
            .map((vehicle) => ({ vehicle, value: featureValue(vehicle, featureKey) }))
            .filter((entry) => entry.value !== null);
 
        if (measured.length < MIN_PEER_VEHICLES) {
            featureSummary[featureKey] = {
                feature: featureKey,
                label: definition.label,
                unit: definition.unit,
                status: measured.length === 0 ? STATUS.NOT_MEASURABLE : STATUS.INSUFFICIENT_PEERS,
                vehiclesMeasured: measured.length,
                fleetMedian: round(median(measured.map((m) => m.value)), 3),
            };
            return;
        }
 
        featureSummary[featureKey] = {
            feature: featureKey,
            label: definition.label,
            unit: definition.unit,
            status: STATUS.SCORED,
            vehiclesMeasured: measured.length,
            fleetMedian: round(median(measured.map((m) => m.value)), 3),
        };

 
        measured.forEach((entry, index) => {
            const peerValues = measured
                .filter((_, i) => i !== index)
                .map((m) => m.value);
 
            const scored = scoreAgainstPeers(entry.value, peerValues);
            if (!scored) return;
 
            const flag = buildFlag(featureKey, definition, entry.vehicle, entry.value, scored);
            if (flag) flagsByVehicle.get(entry.vehicle.vehicleId).push(flag);
        });
        
    });

 
    const results = vehicles.map((vehicle) => {
        const flags = (flagsByVehicle.get(vehicle.vehicleId) || [])
            .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
 
        return {
            vehicleId: vehicle.vehicleId,
            distanceKm: round(vehicle.distanceKm, 2),
            activeDays: vehicle.activeDays ?? 0,
            status: isEligible(vehicle) ? STATUS.SCORED : STATUS.INSUFFICIENT_EXPOSURE,
            severity: worstSeverity(flags),
            flagCount: flags.length,
            flags,
        };
    });
 
    const flagged = results.filter((r) => r.flagCount > 0).sort(byImportance);
 
    return {
        method: 'fleet_relative',
        parameters: {
            minPeerVehicles: MIN_PEER_VEHICLES,
            minExposureKm: MIN_EXPOSURE_KM,
            minSupportingEvents: MIN_SUPPORTING_EVENTS,
            zThreshold: Z_THRESHOLD,
        },
        summary: {
            vehiclesInScope: vehicles.length,
            vehiclesEvaluated: eligible.length,
            vehiclesExcludedForExposure: vehicles.length - eligible.length,
            vehiclesFlagged: flagged.length,
            featuresScored: Object.values(featureSummary)
                .filter((f) => f.status === STATUS.SCORED).length,
        },
        features: featureSummary,
        vehicles: results,
        flagged,
    };

}
 
module.exports = {
    detectFleetAnomalies,
    FEATURE_DEFINITIONS,
    FEATURE_KEYS,
    METHOD,
    STATUS,
    SEVERITY,
    MIN_PEER_VEHICLES,
    MIN_EXPOSURE_KM,
    MIN_SUPPORTING_EVENTS,
    Z_THRESHOLD,
    _median: median,
    _medianAbsoluteDeviation: medianAbsoluteDeviation,
    _scoreAgainstPeers: scoreAgainstPeers,
    _round: round,
};