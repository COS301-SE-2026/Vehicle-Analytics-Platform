'use strict';


const { _internal: { poissonUpperTail } } = require('./weatherAreaAnalytics');

const MIN_PEER_VEHICLES = 5;
const MIN_SUPPORTING_EVENTS = 3;
const MIN_EVENTS_FOR_MIX = 20;
const Z_THRESHOLD = 3.5;
const MAD_SCALE = 0.6745;
const MEAN_AD_SCALE = 1.253314;

const ALPHA = 0.001;

const MIN_EXPOSURE_KM = 10;
const MIN_EXPOSURE_TRIPS = 3;
const MIN_EXPOSURE_DAYS = 1;

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
    NO_EVENTS: 'no_events',
    NOT_REPORTED: 'not_reported',
};

const DISTANCE_SOURCE = {
    TELEMETRY: 'telemetry',
    TRIPS: 'trips',
};

const POINT_STATUS = {
    FLAGGED: 'flagged',
    UNCONFIRMED: 'unconfirmed',
    NORMAL: 'normal',
};

const UNCONFIRMED_REASON = {
    TOO_FEW_INCIDENTS: 'too_few_incidents',
    NOT_SIGNIFICANT: 'not_significant',
};

const BASELINE = {
    MEDIAN: 'median',
    POOLED: 'pooled',
    NONE: 'none',
};

const SEVERITY = { HIGH: 'high', MODERATE: 'moderate', LOW: 'low' };

const EXPOSURE_BASES = [
    {
        id: 'distance',
        unit: 'events/100km',
        label: 'per 100 km driven',
        rateLabel: 'per 100 km',
        ratePer: 100,
        columnLabel: 'Km driven',
        axisLabel: 'Kilometres driven in period',
        requirement: `at least ${MIN_EXPOSURE_KM} km of recorded distance`,
        minimum: MIN_EXPOSURE_KM,
        amount: (v) => v.distanceKm,
        denominator: (v) => v.distanceKm / 100,
        describe: (v) => `${Math.round(v.distanceKm).toLocaleString('en-US')} km`,
    },
    {
        id: 'trips',
        unit: 'events/10 trips',
        label: 'per 10 completed trips',
        rateLabel: 'per 10 trips',
        ratePer: 10,
        columnLabel: 'Trips',
        axisLabel: 'Completed trips in period',
        requirement: `at least ${MIN_EXPOSURE_TRIPS} completed trips`,
        minimum: MIN_EXPOSURE_TRIPS,
        amount: (v) => v.tripCount,
        denominator: (v) => v.tripCount / 10,
        describe: (v) => `${v.tripCount} trip${v.tripCount === 1 ? '' : 's'}`,
    },
    {
        id: 'activeDays',
        unit: 'events/day',
        label: 'per active day',
        rateLabel: 'per active day',
        ratePer: 1,
        columnLabel: 'Active days',
        axisLabel: 'Active days in period',
        requirement: `at least ${MIN_EXPOSURE_DAYS} active day`,
        minimum: MIN_EXPOSURE_DAYS,
        amount: (v) => v.activeDays,
        denominator: (v) => v.activeDays,
        describe: (v) => `${v.activeDays} active day${v.activeDays === 1 ? '' : 's'}`,
    },
];

const INCIDENT_TYPES = [
    { countKey: 'harshBrakes', name: 'Harsh braking', noun: 'harsh braking' },
    { countKey: 'harshAccelerations', name: 'Harsh acceleration', noun: 'harsh acceleration' },
    { countKey: 'harshCornering', name: 'Harsh cornering', noun: 'harsh cornering' },
    { countKey: 'overspeedEvents', name: 'Overspeed', noun: 'overspeed' },
    { countKey: 'idlingEvents', name: 'Idling', noun: 'idling' },
];

const SEVERITY_ORDER = [SEVERITY.HIGH, SEVERITY.MODERATE, SEVERITY.LOW];

function isNumber(value){
    return typeof value === 'number' && Number.isFinite(value);
}

function round(value, dp = 2){
    if (!isNumber(value)) return null;
    const factor = 10 ** dp;
    const sign = value < 0 ? -1 : 1;
    return (sign * Math.round(Math.abs(value) * factor)) / factor;
}


function formatNumber(value){
    if (!isNumber(value)) return '-';
    return String(round(value, Math.abs(value) < 1 ? 2 : 1));
}

function formatExpected(value){
    if (!isNumber(value)) return '-';
    return String(round(value, value < 10 ? 1 : 0));
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

function tripDistance(vehicle){
    if (isNumber(vehicle.tripDistanceKm)) return vehicle.tripDistanceKm;
    return isNumber(vehicle.distanceKm) ? vehicle.distanceKm : 0;
}


function selectDistanceSource(vehicles){
    const qualifies = (km) => isNumber(km) && km >= MIN_EXPOSURE_KM;
    const telemetryAvailable = vehicles.some((v) => isNumber(v.telemetryDistanceKm));

    const byTrips = vehicles.filter((v) => qualifies(tripDistance(v))).length;
    const byTelemetry = telemetryAvailable
        ? vehicles.filter((v) => qualifies(v.telemetryDistanceKm)).length
        : null;

    return {
        source: telemetryAvailable && byTelemetry >= byTrips ? DISTANCE_SOURCE.TELEMETRY : DISTANCE_SOURCE.TRIPS,
        telemetryAvailable,
        vehiclesWithDistance: { trips: byTrips, telemetry: byTelemetry },
    };
}


function prepareVehicles(vehicles, distance){
    const withDistance = vehicles.map((v) => ({
        ...v,
        distanceKm: distance.source === DISTANCE_SOURCE.TELEMETRY
            ? (isNumber(v.telemetryDistanceKm) ? v.telemetryDistanceKm : 0)
            : tripDistance(v),
    }));

    const basis = chooseExposureBasis(withDistance);
    const aligned = Boolean(basis && basis.id === 'distance' && distance.source === DISTANCE_SOURCE.TELEMETRY);

    const prepared = withDistance.map((v) => {
        const total = v.counts || {};
        if (!aligned || !v.alignedCounts) return { ...v, counts: total, unmatchedIncidents: 0 };
        return {
            ...v,
            counts: v.alignedCounts,
            unmatchedIncidents: Math.max(0, (total.totalEvents || 0) - (v.alignedCounts.totalEvents || 0)),
        };
    });

    return { vehicles: prepared, basis, aligned };
}


function chooseExposureBasis(vehicles){
    for (let i = 0; i < EXPOSURE_BASES.length; i += 1) {
        const basis = EXPOSURE_BASES[i];
        const qualifying = vehicles.filter((v) => {
            const amount = basis.amount(v);
            return isNumber(amount) && amount >= basis.minimum;
        });

        if (qualifying.length >= MIN_PEER_VEHICLES) {
            return { ...basis, vehiclesWithExposure: qualifying.length };
        }
    }
    return null;
}


function buildFeatureDefinitions(basis) {
    const definitions = {};

    if (basis) {
        INCIDENT_TYPES.forEach((type) => {
            definitions[`${type.countKey}Rate`] = {
                kind: 'rate',
                behaviour: type.countKey,
                name: type.name,
                noun: type.noun,
                label: `${type.name} rate`,
                unit: basis.unit,
                unitLabel: basis.rateLabel,
                supportingCountKey: type.countKey,
                ratePer: basis.ratePer,
                columnLabel: basis.columnLabel,
                axis: { x: basis.axisLabel, y: `${type.name} incidents ${basis.rateLabel}` },
                exposureAmount: (v) => basis.amount(v),
                exposure: (v) => basis.denominator(v),
                describeExposure: (v) => basis.describe(v),
                value: (v) => {
                    const denominator = basis.denominator(v);
                    if (!denominator) return null;
                    return ((v.counts || {})[type.countKey] || 0) / denominator;
                },
                eligible: (v) => {
                    const amount = basis.amount(v);
                    return isNumber(amount) && amount >= basis.minimum;
                },
            };
        });

        definitions.tripMaxSpeed = {
            kind: 'speed',
            behaviour: 'tripMaxSpeed',
            name: 'Top trip speed',
            noun: 'top trip speed',
            label: 'Top trip speed (90th percentile)',
            unit: 'km/h',
            unitLabel: 'km/h',
            supportingCountKey: null,
            ratePer: null,
            columnLabel: 'Trips',
            axis: { x: 'Completed trips in period', y: 'Top trip speed, 90th percentile (km/h)' },
            exposureAmount: (v) => v.tripCount,
            value: (v) => (isNumber(v.p90TripMaxSpeedKmh) ? v.p90TripMaxSpeedKmh : null),
            eligible: (v) => isNumber(v.tripCount) && v.tripCount >= MIN_EXPOSURE_TRIPS,
        };

        return definitions;
    }

    INCIDENT_TYPES.forEach((type) => {
        definitions[`${type.countKey}Share`] = {
            kind: 'mix',
            behaviour: type.countKey,
            name: type.name,
            noun: type.noun,
            label: `${type.name} share of incidents`,
            unit: '% of incidents',
            unitLabel: '% of incidents',
            supportingCountKey: type.countKey,
            ratePer: null,
            columnLabel: 'Incidents',
            axis: { x: 'Incidents recorded in period', y: `${type.name} share of incidents (%)` },
            exposureAmount: (v) => (v.counts || {}).totalEvents || 0,
            value: (v) => {
                const total = (v.counts || {}).totalEvents || 0;
                if (!total) return null;
                return (((v.counts || {})[type.countKey] || 0) * 100) / total;
            },
            eligible: (v) => ((v.counts || {}).totalEvents || 0) >= MIN_EVENTS_FOR_MIX,
        };
    });

    return definitions;
}


// A device "reports" an incident type when it logged that type at least once in
// the lookback window read by anomalyAnalytics. When the history could not be
// read, or the caller did not supply it, every type is assumed to be reported,
// which is how the detection behaved before the check existed.
function isReportingVerified(vehicle){
    const reporting = vehicle.reporting;
    return Boolean(reporting && reporting.checked === true && reporting.types);
}

function reportsType(vehicle, countKey){
    if (!countKey || !isReportingVerified(vehicle)) return true;
    return vehicle.reporting.types[countKey] === true;
}

function reportingCheckFailed(vehicles){
    return vehicles.some((v) => v.reporting && v.reporting.checked === false);
}

function reportingLookbackDays(vehicles){
    const checked = vehicles.find((v) => isReportingVerified(v) && isNumber(v.reporting.lookbackDays));
    return checked ? checked.reporting.lookbackDays : null;
}

function joinOr(items){
    if (items.length <= 1) return items.join('');
    return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
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


function groupThreshold(values){
    const centre = median(values);
    if (centre === null) return { median: null, threshold: null, method: null };

    const mad = medianAbsoluteDeviation(values, centre);
    if (mad > 0) {
        return { median: centre, threshold: centre + (Z_THRESHOLD * mad) / MAD_SCALE, method: METHOD.MODIFIED_Z };
    }

    const meanAd = meanAbsoluteDeviation(values, centre);
    if (meanAd > 0) {
        return { median: centre, threshold: centre + Z_THRESHOLD * MEAN_AD_SCALE * meanAd, method: METHOD.MEAN_AD };
    }

    return { median: centre, threshold: null, method: METHOD.PEERS_UNIFORM };
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
    const raw = (vehicle.counts || {})[definition.supportingCountKey];
    return isNumber(raw) ? raw : 0;
}


function assessEvidence(definition, entry, scored, peerEntries){
    if (definition.kind !== 'rate') return null;

    const observed = supportingCount(entry.vehicle, definition);
    const exposure = definition.exposure(entry.vehicle);

    let rate = scored.peerMedian;
    let baseline = BASELINE.MEDIAN;

    if (!(rate > 0)) {
        const totals = peerEntries.reduce((acc, peer) => ({
            count: acc.count + supportingCount(peer.vehicle, definition),
            exposure: acc.exposure + definition.exposure(peer.vehicle),
        }), { count: 0, exposure: 0 });

        rate = totals.exposure > 0 ? totals.count / totals.exposure : 0;
        baseline = BASELINE.POOLED;
    }

    if (!(rate > 0)) {
        return {
            baseline: BASELINE.NONE,
            observed,
            expected: 0,
            pValue: null,
            significant: observed >= MIN_SUPPORTING_EVENTS,
        };
    }

    const expected = rate * exposure;
    const pValue = poissonUpperTail(observed, expected);

    return {
        baseline,
        observed,
        expected,
        pValue,
        significant: pValue < ALPHA,
    };
}


function evaluate(definition, entry, scored, evidence){
    const count = supportingCount(entry.vehicle, definition);
    const uniformPeers = scored.method === METHOD.PEERS_UNIFORM;

    const unusual = uniformPeers
        ? entry.value > scored.peerMedian
        : scored.score > Z_THRESHOLD;

    if (!unusual) return { status: POINT_STATUS.NORMAL, evidence: null };

    if (count !== null && count < MIN_SUPPORTING_EVENTS) {
        return { status: POINT_STATUS.UNCONFIRMED, reason: UNCONFIRMED_REASON.TOO_FEW_INCIDENTS, evidence: null };
    }

    if (evidence && !evidence.significant) {
        return { status: POINT_STATUS.UNCONFIRMED, reason: UNCONFIRMED_REASON.NOT_SIGNIFICANT, evidence };
    }

    return { status: POINT_STATUS.FLAGGED, evidence };
}

const CAUTION = {
    COUNT_ONLY: 'count_only',
    SPARSE_TYPE: 'sparse_type',
};

// One wording for a single behaviour and for several merged on one vehicle.
function cautionMessage(variant, nouns){
    const several = nouns.length > 1;
    const list = joinOr(nouns);

    if (variant === 'count_only') {
        return `No other vehicle recorded ${list} incidents in this period, so there is no rate to test `
            + `${several ? 'these' : 'this'} against. ${several ? 'They rest' : 'It rests'} on the incident `
            + `${several ? 'counts' : 'count'} alone.`;
    }

    const check = `Check that their devices report ${several ? 'these event types' : 'this event type'} before acting on this.`;
    return variant === 'unverified_none'
        ? `No other vehicle in the comparison recorded ${list} incidents. ${check}`
        : `Most other vehicles recorded no ${list} incidents. ${check}`;
}

function cautionVariant(code, evidence){
    if (code === CAUTION.COUNT_ONLY) return 'count_only';
    return evidence && evidence.baseline === BASELINE.NONE ? 'unverified_none' : 'unverified_most';
}

function buildCaution(definition, scored, evidence, reportingVerified = false){
    if (definition.kind !== 'rate' || scored.peerMedian !== 0) return null;
    const noPeerIncidents = Boolean(evidence && evidence.baseline === BASELINE.NONE);

    if (reportingVerified) {
        // Every peer's device is known to report this type, so a zero median is
        // real. The Poisson test covers the pooled case; only a finding with no
        // rate to test against needs a caution.
        if (!noPeerIncidents) return null;
        return { code: CAUTION.COUNT_ONLY, message: cautionMessage('count_only', [definition.noun]) };
    }

    return {
        code: CAUTION.SPARSE_TYPE,
        message: cautionMessage(cautionVariant(CAUTION.SPARSE_TYPE, evidence), [definition.noun]),
    };
}

function mergeCautions(flags){
    const groups = new Map();

    flags.forEach((flag) => {
        if (!flag.caution) return;
        const variant = cautionVariant(flag.caution.code, flag.evidence);
        if (!groups.has(variant)) groups.set(variant, { code: flag.caution.code, nouns: [] });
        const group = groups.get(variant);
        if (!group.nouns.includes(flag.noun)) group.nouns.push(flag.noun);
    });

    return [...groups.entries()].map(([variant, group]) => ({
        code: group.code,
        behaviours: group.nouns,
        message: cautionMessage(variant, group.nouns),
    }));
}

function explainFlag(definition, vehicle, value, scored, evidence, peerNoun){
    // Each vehicle is judged against the other vehicles without itself, so the
    // wording names that median rather than the whole-group median on the chart.
    const median = formatNumber(scored.peerMedian);
    const others = `for the other vehicles in the ${peerNoun}`;

    if (definition.kind === 'speed') {
        return `Top trip speeds (90th percentile) of ${formatNumber(value)} km/h, `
            + `against a median of ${median} km/h ${others}, across ${vehicle.tripCount} trips.`;
    }

    if (definition.kind === 'mix') {
        return `${definition.name} makes up ${formatNumber(value)}% of this vehicle's incidents, `
            + `against a median of ${median}% ${others}, from ${(vehicle.counts || {}).totalEvents || 0} incidents.`;
    }

    const exposureText = definition.describeExposure(vehicle);
    const lead = `${definition.name} at ${formatNumber(value)} ${definition.unitLabel}, against a median of ${median} ${others}.`;

    if (!evidence || evidence.baseline === BASELINE.NONE) {
        return `${lead} ${evidence ? evidence.observed : supportingCount(vehicle, definition)} incidents over ${exposureText}.`;
    }

    const rateName = evidence.baseline === BASELINE.MEDIAN
        ? 'their median rate'
        : 'their combined rate';

    return `${lead} At ${rateName}, about ${formatExpected(evidence.expected)} would be expected `
        + `over ${exposureText}. ${evidence.observed} were recorded.`;
}


function shortFinding(flag){
    if (flag.kind === 'speed') {
        return `top trip speeds of ${formatNumber(flag.value)} km/h against a median of ${formatNumber(flag.peerMedian)} km/h for the other vehicles`;
    }
    if (flag.kind === 'mix') {
        return `${flag.noun} makes up ${formatNumber(flag.value)}% of its incidents, against a median of ${formatNumber(flag.peerMedian)}% for the other vehicles`;
    }
    if (flag.ratio !== null) {
        return `${flag.noun} at ${flag.ratio}x the other vehicles' median`;
    }
    return `${flag.supportingCount} ${flag.noun} incidents where the other vehicles' median is zero`;
}

function buildFlag(featureKey, definition, vehicle, value, scored, evidence, peerNoun, reportingVerified = false) {
    const count = supportingCount(vehicle, definition);
    const uniformPeers = scored.method === METHOD.PEERS_UNIFORM;

    const severity = uniformPeers
        ? (count === null ? SEVERITY.LOW : severityFromCount(count))
        : severityFromScore(scored.score);

    return {
        feature: featureKey,
        behaviour: definition.behaviour,
        kind: definition.kind,
        label: definition.label,
        noun: definition.noun,
        unit: definition.unit,
        unitLabel: definition.unitLabel,
        value: round(value, 2),
        peerMedian: round(scored.peerMedian, 2),
        peerMad: round(scored.peerMad, 2),
        ratio: scored.peerMedian > 0 ? round(value / scored.peerMedian, 1) : null,
        score: round(scored.score, 2),
        method: scored.method,
        severity,
        supportingCount: count,
        evidence: evidence
            ? {
                baseline: evidence.baseline,
                observed: evidence.observed,
                expected: round(evidence.expected, 1),
                pValue: evidence.pValue === null ? null : Number(evidence.pValue.toPrecision(3)),
                alpha: ALPHA,
            }
            : null,
        caution: buildCaution(definition, scored, evidence, reportingVerified),
        explanation: explainFlag(definition, vehicle, value, scored, evidence, peerNoun),
    };
}

function worstSeverity(flags){
    if (flags.some((f) => f.severity === SEVERITY.HIGH)) return SEVERITY.HIGH;
    if (flags.some((f) => f.severity === SEVERITY.MODERATE)) return SEVERITY.MODERATE;
    return flags.length ? SEVERITY.LOW : null;
}


function bySeverityThenScore(a, b) {
    const severity = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (severity !== 0) return severity;
    return (b.score ?? -Infinity) - (a.score ?? -Infinity);
}


// Worst severity first, then the strongest single finding, so the headline's
// "strongest" is the vehicle furthest from the others. Ties go to the vehicle
// with more flagged behaviours.
function byImportance(a, b) {
    const severity = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (severity !== 0) return severity;
    const topA = a.flags[0] ? a.flags[0].score ?? -Infinity : -Infinity;
    const topB = b.flags[0] ? b.flags[0].score ?? -Infinity : -Infinity;
    if (topB !== topA) return topB > topA ? 1 : -1;
    if (b.flagCount !== a.flagCount) return b.flagCount - a.flagCount;
    return a.vehicleId.localeCompare(b.vehicleId);
}

function describeExposure(basis){
    if (basis) {
        return {
            basis: basis.id,
            unit: basis.unit,
            label: basis.label,
            vehiclesWithExposure: basis.vehiclesWithExposure,
            note: null,
        };
    }

    return {
        basis: null,
        unit: null,
        label: null,
        vehiclesWithExposure: 0,
        note: 'No usable distance, trips or active days were recorded for enough vehicles, '
            + 'so vehicles were compared on the mix of incident types instead of on rates.',
    };
}


function notReportingNote(notReporting, lookbackDays){
    if (!notReporting.length) return null;

    const parts = notReporting.map((r) => `${r.noun} ${r.vehicles} of ${r.outOf}`);
    return `Some devices have not reported an incident type in the ${lookbackDays} days to the end of this period, `
        + 'so those vehicles are left out of that comparison rather than counted as having none. '
        + `Not reporting: ${parts.join(', ')} vehicles.`;
}


function buildDataQuality({
    vehicles, evaluatedCount, basis, distance, notReporting = [], lookbackDays = null,
}) {
    const notes = [];
    const total = vehicles.length;
    const incidentsWithoutDistance = vehicles.reduce((sum, v) => sum + (v.unmatchedIncidents || 0), 0);

    if (total > 0 && evaluatedCount < total / 2) {
        const requirement = basis ? basis.requirement : `at least ${MIN_EVENTS_FOR_MIX} incidents`;
        notes.push(`Only ${evaluatedCount} of ${total} vehicles had enough data in this period to be compared `
            + `(${requirement}). The other ${total - evaluatedCount} were not assessed.`);
    }

    const reportingNote = notReporting.length && lookbackDays ? notReportingNote(notReporting, lookbackDays) : null;
    if (reportingNote) notes.push(reportingNote);

    if (incidentsWithoutDistance > 0) {
        notes.push(`${incidentsWithoutDistance} incident${incidentsWithoutDistance === 1 ? '' : 's'} happened on days `
            + 'with no recorded distance, so they are left out of the rates.');
    }

    if (basis && basis.id === 'distance' && !distance.telemetryAvailable) {
        notes.push('Telemetry distance could not be read, so distance comes from completed trips only.');
    }

    if (reportingCheckFailed(vehicles)) {
        notes.push('Could not check which incident types each device reports, so a vehicle with none of a type '
            + 'is counted as having none. Treat findings where most vehicles recorded zero with care.');
    }

    return {
        distanceSource: basis && basis.id === 'distance' ? distance.source : null,
        vehiclesWithDistance: distance.vehiclesWithDistance,
        incidentsWithoutDistance,
        vehiclesNotReporting: notReporting.map((r) => ({
            behaviour: r.behaviour, vehicles: r.vehicles, outOf: r.outOf,
        })),
        notes,
    };
}

function plural(n, word){
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function buildHeadline({
    results, flagged, featuresScored, peerEvaluated, peerNoun, focused, featuresWithoutEvents = 0, peerCount = 0,
    notReportedNouns = [],
}){
    if (peerCount === 0) {
        return 'There are no vehicles in this selection.';
    }

    if (featuresScored === 0 && notReportedNouns.length > 0 && peerEvaluated >= MIN_PEER_VEHICLES) {
        return `No behaviour could be compared this period. Fewer than ${MIN_PEER_VEHICLES} devices in this `
            + `selection report ${joinOr(notReportedNouns)}, and nothing else had enough data or incidents.`;
    }

    if (featuresScored === 0 && featuresWithoutEvents > 0 && peerEvaluated >= MIN_PEER_VEHICLES) {
        return 'The vehicles that drove in this period recorded no incidents, so no driving stands out.';
    }

    if (featuresScored === 0) {
        return `Not enough vehicles drove enough in this period to compare them. At least ${MIN_PEER_VEHICLES} `
            + `need to qualify, and ${peerEvaluated} did.`;
    }

    const evaluated = results.filter((r) => r.status === STATUS.SCORED);
    const single = focused && results.length === 1 ? results[0] : null;

    if (!evaluated.length) {
        return single
            ? `${single.vehicleId} did not drive enough in this period to be compared with the ${peerNoun}.`
            : 'None of the selected vehicles drove enough in this period to be compared.';
    }

    if (!flagged.length) {
        if (single) {
            return `${single.vehicleId} is within the ${peerNoun}'s normal range on all `
                + `${plural(single.measuresCompared, 'measure')} it was compared on.`;
        }
        return `No vehicle stands out from the ${peerNoun} this period, across `
            + `${plural(evaluated.length, 'vehicle')} and ${plural(featuresScored, 'measure')}.`;
    }

    const top = flagged[0];
    const finding = shortFinding(top.flags[0]);

    if (single) {
        return `${top.vehicleId} stands out from the ${peerNoun} this period: ${finding}.`;
    }
    if (flagged.length === 1) {
        return `1 vehicle stands out this period. ${top.vehicleId}: ${finding}.`;
    }
    return `${flagged.length} vehicles stand out this period. The strongest is ${top.vehicleId}: ${finding}.`;
}


function detectFleetAnomalies(input = [], options = {}){
    const { focusIds = null, peerNoun = 'fleet' } = options;
    const focusSet = Array.isArray(focusIds) ? new Set(focusIds) : null;
    const inFocus = (id) => !focusSet || focusSet.has(id);

    const distance = selectDistanceSource(input);
    const { vehicles, basis } = prepareVehicles(input, distance);
    const definitions = buildFeatureDefinitions(basis);
    const definitionList = Object.values(definitions);

    const featureSummary = {};
    const notReportingByFeature = [];
    const flagsByVehicle = new Map();
    const measuresByVehicle = new Map();
    vehicles.forEach((v) => {
        flagsByVehicle.set(v.vehicleId, []);
        measuresByVehicle.set(v.vehicleId, 0);
    });

    Object.keys(definitions).forEach((featureKey) => {
        const definition = definitions[featureKey];

        const eligible = vehicles.filter((vehicle) => definition.eligible(vehicle));
        const notReporting = eligible.filter((vehicle) => !reportsType(vehicle, definition.supportingCountKey));

        const measured = eligible
            .filter((vehicle) => reportsType(vehicle, definition.supportingCountKey))
            .map((vehicle) => ({ vehicle, value: definition.value(vehicle) }))
            .filter((entry) => isNumber(entry.value));

        const base = {
            feature: featureKey,
            behaviour: definition.behaviour,
            kind: definition.kind,
            label: definition.label,
            noun: definition.noun,
            unit: definition.unit,
            unitLabel: definition.unitLabel,
            vehiclesMeasured: measured.length,
            vehiclesNotReporting: notReporting.length,
            fleetMedian: round(median(measured.map((m) => m.value)), 2),
        };

        if (notReporting.length > 0) {
            notReportingByFeature.push({
                behaviour: definition.behaviour,
                noun: definition.noun,
                vehicles: notReporting.length,
                outOf: notReporting.length + measured.length,
            });
        }

        if (measured.length < MIN_PEER_VEHICLES){
            const blockedByReporting = notReporting.length > 0
                && measured.length + notReporting.length >= MIN_PEER_VEHICLES;

            let status = measured.length === 0 ? STATUS.NOT_MEASURABLE : STATUS.INSUFFICIENT_PEERS;
            if (blockedByReporting) status = STATUS.NOT_REPORTED;

            featureSummary[featureKey] = { ...base, status, distribution: null };
            return;
        }

        if (definition.supportingCountKey
            && measured.every((entry) => supportingCount(entry.vehicle, definition) === 0)) {
            featureSummary[featureKey] = { ...base, status: STATUS.NO_EVENTS, distribution: null };
            return;
        }

        const points = [];
        const reportingVerified = measured.every((entry) => isReportingVerified(entry.vehicle));

        measured.forEach((entry, index) => {
            const peerEntries = measured.filter((_, i) => i !== index);
            const scored = scoreAgainstPeers(entry.value, peerEntries.map((m) => m.value));
            if (!scored) return;

            const id = entry.vehicle.vehicleId;
            measuresByVehicle.set(id, measuresByVehicle.get(id) + 1);

            // Computed for every rate point so the table can show what each vehicle
            // would have recorded at the other vehicles' rate, the same baseline
            // the chance test uses.
            const evidence = assessEvidence(definition, entry, scored, peerEntries);
            const outcome = evaluate(definition, entry, scored, evidence);
            let severity = null;

            if (outcome.status === POINT_STATUS.FLAGGED) {
                const flag = buildFlag(
                    featureKey, definition, entry.vehicle, entry.value, scored, outcome.evidence, peerNoun, reportingVerified,
                );
                severity = flag.severity;
                flagsByVehicle.get(id).push(flag);
            }

            points.push({
                vehicleId: id,
                value: round(entry.value, 2),
                exposure: round(definition.exposureAmount(entry.vehicle), 2),
                observed: supportingCount(entry.vehicle, definition),
                expected: evidence ? round(evidence.expected, 1) : null,
                status: outcome.status,
                reason: outcome.reason || null,
                severity,
                inFocus: inFocus(id),
            });
        });

        const line = groupThreshold(measured.map((m) => m.value));

        featureSummary[featureKey] = {
            ...base,
            status: STATUS.SCORED,
            distribution: {
                median: round(line.median, 2),
                threshold: round(line.threshold, 2),
                thresholdMethod: line.method,
                // Reference lines for the chart. Both are drawn from the whole group,
                // so they are only sent when they describe the per-vehicle decision:
                // the flag line when the MAD is non-zero (robust to one vehicle), and
                // the chance limit when the median rate is above zero.
                flagLine: line.method === METHOD.MODIFIED_Z ? round(line.threshold, 2) : null,
                chanceRate: definition.kind === 'rate' && line.median > 0 ? round(line.median, 2) : null,
                ratePer: definition.ratePer,
                exposureLabel: definition.columnLabel,
                axis: { ...definition.axis },
                points: points.sort((a, b) => a.value - b.value || a.vehicleId.localeCompare(b.vehicleId)),
            },
        };
    });

    const evaluatedIds = new Set(vehicles
        .filter((vehicle) => definitionList.some((definition) => definition.eligible(vehicle)))
        .map((vehicle) => vehicle.vehicleId));

    const results = vehicles
        .filter((vehicle) => inFocus(vehicle.vehicleId))
        .map((vehicle) => {
            const flags = (flagsByVehicle.get(vehicle.vehicleId) || []).sort(bySeverityThenScore);

            return {
                vehicleId: vehicle.vehicleId,
                distanceKm: round(vehicle.distanceKm, 2),
                tripCount: vehicle.tripCount ?? 0,
                activeDays: vehicle.activeDays ?? 0,
                totalIncidents: (vehicle.counts || {}).totalEvents ?? 0,
                unmatchedIncidents: vehicle.unmatchedIncidents || 0,
                status: evaluatedIds.has(vehicle.vehicleId)
                    ? STATUS.SCORED
                    : STATUS.INSUFFICIENT_EXPOSURE,
                measuresCompared: measuresByVehicle.get(vehicle.vehicleId) || 0,
                severity: worstSeverity(flags),
                flagCount: flags.length,
                flags,
                cautions: mergeCautions(flags),
            };
        });

    const flagged = results.filter((r) => r.flagCount > 0).sort(byImportance);

    const featuresScored = Object.keys(featureSummary)
        .filter((key) => featureSummary[key].status === STATUS.SCORED).length;

    const vehiclesEvaluated = results.filter((r) => r.status === STATUS.SCORED).length;

    const featuresWithoutEvents = Object.keys(featureSummary)
        .filter((key) => featureSummary[key].status === STATUS.NO_EVENTS).length;

    const notReportedNouns = Object.keys(featureSummary)
        .filter((key) => featureSummary[key].status === STATUS.NOT_REPORTED)
        .map((key) => featureSummary[key].noun);

    const lookbackDays = reportingLookbackDays(vehicles);

    return {
        method: 'fleet_relative',
        headline: buildHeadline({
            results,
            flagged,
            featuresScored,
            peerEvaluated: evaluatedIds.size,
            peerNoun,
            focused: Boolean(focusSet),
            featuresWithoutEvents,
            peerCount: vehicles.length,
            notReportedNouns,
        }),
        parameters: {
            minPeerVehicles: MIN_PEER_VEHICLES,
            minSupportingEvents: MIN_SUPPORTING_EVENTS,
            minEventsForMix: MIN_EVENTS_FOR_MIX,
            zThreshold: Z_THRESHOLD,
            alpha: ALPHA,
            reportingLookbackDays: lookbackDays,
        },
        exposure: {
            ...describeExposure(basis),
            distanceSource: basis && basis.id === 'distance' ? distance.source : null,
        },
        dataQuality: buildDataQuality({
            vehicles,
            evaluatedCount: evaluatedIds.size,
            basis,
            distance,
            notReporting: notReportingByFeature,
            lookbackDays,
        }),
        peers: {
            noun: peerNoun,
            vehicles: vehicles.length,
            vehiclesEvaluated: evaluatedIds.size,
        },
        summary: {
            vehiclesInScope: results.length,
            vehiclesEvaluated,
            vehiclesExcluded: results.length - vehiclesEvaluated,
            vehiclesFlagged: flagged.length,
            featuresScored,
        },
        features: featureSummary,
        vehicles: results,
        flagged,
    };
}

module.exports = {
    detectFleetAnomalies,
    EXPOSURE_BASES,
    INCIDENT_TYPES,
    METHOD,
    STATUS,
    DISTANCE_SOURCE,
    POINT_STATUS,
    UNCONFIRMED_REASON,
    BASELINE,
    SEVERITY,
    MIN_PEER_VEHICLES,
    MIN_EXPOSURE_KM,
    MIN_EXPOSURE_TRIPS,
    MIN_SUPPORTING_EVENTS,
    MIN_EVENTS_FOR_MIX,
    Z_THRESHOLD,
    ALPHA,
    _median: median,
    _medianAbsoluteDeviation: medianAbsoluteDeviation,
    _scoreAgainstPeers: scoreAgainstPeers,
    _chooseExposureBasis: chooseExposureBasis,
    _buildFeatureDefinitions: buildFeatureDefinitions,
    _buildCaution: buildCaution,
    _mergeCautions: mergeCautions,
    _reportsType: reportsType,
    _assessEvidence: assessEvidence,
    _selectDistanceSource: selectDistanceSource,
    _prepareVehicles: prepareVehicles,
    _groupThreshold: groupThreshold,
    _round: round,
    _byImportance: byImportance,
};