import { useState } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';
import { formatNumber, plural } from './anomalyFormat';

const SEVERITY_STYLES = {
    high: 'bg-red-50 text-red-700 border-red-200',
    moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-gray-50 text-fleet-secondary border-fleet-border',
};

const SEVERITY_LABELS = { high: 'High', moderate: 'Moderate', low: 'Low' };
const ICON_TONE = { high: 'text-red-600', moderate: 'text-amber-600', low: 'text-slate-500' };
const INITIALLY_VISIBLE = 6;

// Plain-language evidence only. The z-score and the chance probability are
// explained once in "How the detection works" rather than on every card.
function evidenceChips(flag){
    const chips = [];

    if (flag.ratio !== null && flag.ratio !== undefined) {
        chips.push(`${flag.ratio}× the other vehicles' median`);
    }

    const evidence = flag.evidence;
    if (evidence && evidence.expected > 0) {
        chips.push(`${formatNumber(evidence.observed, 0)} recorded, about ${formatNumber(evidence.expected)} expected`);
    }

    if (flag.method === 'peers_uniform') {
        chips.push('Above every other vehicle');
    }

    return chips;
}


// One caution per vehicle. Older responses carried the caution on each flag.
function vehicleCautions(vehicle){
    if (Array.isArray(vehicle.cautions)) return vehicle.cautions;

    const seen = new Set();
    return (vehicle.flags || [])
        .map((flag) => flag.caution)
        .filter((caution) => caution && !seen.has(caution.message) && seen.add(caution.message));
}


function SeverityBadge({ severity }){
    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.low}`}>
            {SEVERITY_LABELS[severity] || severity}
        </span>
    );
}

SeverityBadge.propTypes = { severity: PropTypes.string.isRequired };


function FindingCard({ vehicle, selected, onSelectVehicle, onShowOnChart }){
    const cautions = vehicleCautions(vehicle);
    const meta = [
        plural(vehicle.flagCount, 'behaviour'),
        `${formatNumber(vehicle.totalIncidents, 0)} incidents`,
        vehicle.distanceKm > 0 ? `${formatNumber(vehicle.distanceKm, 0)} km` : null,
    ].filter(Boolean).join(', ');

    return (
        <article
            id={`finding-${vehicle.vehicleId}`}
            data-testid={`finding-${vehicle.vehicleId}`}
            className={`rounded-xl border bg-white p-4 ${selected ? 'border-fleet-blue ring-1 ring-fleet-blue' : 'border-fleet-border'}`}
        >
            <div className="flex flex-wrap items-center gap-3">
                <AlertTriangle className={`w-5 h-5 shrink-0 ${ICON_TONE[vehicle.severity] || ICON_TONE.low}`} aria-hidden="true" />
                <button
                    type="button"
                    onClick={() => onSelectVehicle(vehicle.vehicleId)}
                    aria-pressed={selected}
                    className="text-sm font-semibold text-fleet-text hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-fleet-blue"
                >
                    {vehicle.vehicleId}
                </button>
                <SeverityBadge severity={vehicle.severity} />
                <p className="ml-auto text-xs text-fleet-secondary">{meta}</p>
            </div>

            <ul className="mt-3 space-y-4">
                {vehicle.flags.map((flag) => (
                    <li key={flag.feature}>
                        <p className="text-sm text-fleet-text leading-relaxed max-w-3xl">{flag.explanation}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {evidenceChips(flag).map((chip) => (
                                <span key={chip} className="text-xs text-fleet-secondary bg-fleet-border/30 rounded-md px-2 py-1">
                                    {chip}
                                </span>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => onShowOnChart(vehicle.vehicleId, flag.feature)}
                            className="mt-2 text-xs font-medium text-fleet-blue hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-fleet-blue"
                        >
                            Show on chart
                        </button>
                    </li>
                ))}
            </ul>

            {cautions.map((caution) => (
                <p
                    key={caution.message}
                    className="mt-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2"
                >
                    {caution.message}
                </p>
            ))}
        </article>
    );
}

FindingCard.propTypes = {
    vehicle: PropTypes.object.isRequired,
    selected: PropTypes.bool.isRequired,
    onSelectVehicle: PropTypes.func.isRequired,
    onShowOnChart: PropTypes.func.isRequired,
};


export default function AnomalyFindings({
    flagged = [],
    selectedVehicleId = null,
    onSelectVehicle = () => {},
    onShowOnChart = () => {},
    peerNoun = 'fleet',
}){
    const [showAll, setShowAll] = useState(false);

    if (!flagged.length) {
        return <p className="text-sm text-fleet-secondary">No vehicle stood out clearly from the {peerNoun} in this period.</p>;
    }

    const visible = showAll
        ? flagged
        : flagged.filter((v, i) => i < INITIALLY_VISIBLE || v.vehicleId === selectedVehicleId);

    return (
        <div className="space-y-3">
            {visible.map((vehicle) => (
                <FindingCard
                    key={vehicle.vehicleId}
                    vehicle={vehicle}
                    selected={vehicle.vehicleId === selectedVehicleId}
                    onSelectVehicle={onSelectVehicle}
                    onShowOnChart={onShowOnChart}
                />
            ))}

            {flagged.length > INITIALLY_VISIBLE && (
                <button
                    type="button"
                    onClick={() => setShowAll((prev) => !prev)}
                    className="text-sm font-medium text-fleet-blue hover:underline"
                >
                    {showAll ? 'Show fewer' : `Show all ${flagged.length} vehicles`}
                </button>
            )}
        </div>
    );
}

AnomalyFindings.propTypes = {
    flagged: PropTypes.array,
    selectedVehicleId: PropTypes.string,
    onSelectVehicle: PropTypes.func,
    onShowOnChart: PropTypes.func,
    peerNoun: PropTypes.string,
};

export { evidenceChips, vehicleCautions };