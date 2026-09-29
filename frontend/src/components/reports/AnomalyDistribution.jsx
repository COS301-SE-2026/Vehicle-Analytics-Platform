import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { AnomalyFunnelChart, STATUS_LABELS } from '../ui/anomalyCharts';
import { behaviourName, formatNumber } from './anomalyFormat';

const STATUS_BADGES = {
    flagged: 'bg-red-50 text-red-700 border-red-200',
    normal: 'bg-gray-50 text-fleet-secondary border-fleet-border',
    unconfirmed: 'bg-white text-fleet-secondary border-fleet-border border-dashed',
};

const STATUS_ORDER = ['flagged', 'normal', 'unconfirmed'];

function Th({ children, align = 'left' }){
    return (
        <th className={`px-3 py-2 text-xs font-semibold text-fleet-secondary whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}>
            {children}
        </th>
    );
}

Th.propTypes = { children: PropTypes.node, align: PropTypes.string };


function Td({ children, align = 'left', className = '' }){
    return (
        <td className={`px-3 py-2 text-sm text-fleet-text whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
            {children}
        </td>
    );
}

Td.propTypes = { children: PropTypes.node, align: PropTypes.string, className: PropTypes.string };


function StatusBadge({ status }){
    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[status] || STATUS_BADGES.normal}`}>
            {STATUS_LABELS[status] || status}
        </span>
    );
}

StatusBadge.propTypes = { status: PropTypes.string.isRequired };


function capitalise(text){
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}


function nameList(features){
    return features.map((f) => behaviourName(f).toLowerCase()).join(', ');
}


export default function AnomalyDistribution({
    features = {},
    behaviourKey = null,
    alpha,
    selectedVehicleId = null,
    onSelectVehicle = () => {},
    highlightFocus = false,
}){
    const [flaggedOnly, setFlaggedOnly] = useState(true);
    const feature = behaviourKey ? features[behaviourKey] : null;
    const plottable = Boolean(feature && feature.status === 'scored' && feature.distribution);

    const rows = useMemo(() => {
        if (!plottable) return [];
        return feature.distribution.points
            .filter((p) => !flaggedOnly
                || p.status === 'flagged'
                || p.vehicleId === selectedVehicleId
                || (highlightFocus && p.inFocus))
            .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || b.value - a.value);
    }, [plottable, feature, flaggedOnly, selectedVehicleId, highlightFocus]);

    const entries = Object.values(features);
    const noEvents = entries.filter((f) => f.status === 'no_events');
    const tooFew = entries.filter((f) => f.status === 'insufficient_peers');

    const notes = (
        <>
            {noEvents.length > 0 && (
                <p className="mt-2 text-xs text-fleet-secondary">
                    No vehicle recorded any {nameList(noEvents)} incidents in this period.
                </p>
            )}
            {tooFew.length > 0 && (
                <p className="mt-2 text-xs text-fleet-secondary">
                    Too few vehicles had data to compare {nameList(tooFew)}.
                </p>
            )}
        </>
    );

    if (!plottable) {
        return (
            <div>
                <p className="text-sm text-fleet-secondary py-10 text-center">No behaviour had enough vehicles with data to plot.</p>
                {notes}
            </div>
        );
    }

    const { distribution } = feature;
    const counted = feature.kind !== 'speed';
    const hasExpected = feature.kind === 'rate';
    const columns = 4 + (counted ? 1 : 0) + (hasExpected ? 1 : 0);

    return (
        <div>
            <AnomalyFunnelChart
                feature={feature}
                alpha={alpha}
                selectedVehicleId={selectedVehicleId}
                onSelectVehicle={onSelectVehicle}
                highlightFocus={highlightFocus}
            />
            {notes}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 mb-2">
                <p className="text-sm font-medium text-fleet-text">Vehicles to look at</p>
                <label className="flex items-center gap-2 text-xs text-fleet-secondary">
                    <input
                        type="checkbox"
                        checked={flaggedOnly}
                        onChange={(e) => setFlaggedOnly(e.target.checked)}
                        className="rounded border-fleet-border"
                    />
                    Only vehicles that stand out
                </label>
            </div>

            <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
                <table className="min-w-full" data-testid="anomaly-vehicle-table">
                    <thead className="border-b border-fleet-border sticky top-0 bg-white">
                        <tr>
                            <Th>Vehicle</Th>
                            <Th align="right">{distribution.exposureLabel}</Th>
                            {counted && <Th align="right">Incidents</Th>}
                            {hasExpected && <Th align="right">Fleet expects</Th>}
                            <Th align="right">{capitalise(feature.unitLabel)}</Th>
                            <Th>Compared with fleet</Th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-fleet-border">
                        {rows.map((p) => (
                            <tr key={p.vehicleId} className={p.vehicleId === selectedVehicleId ? 'bg-fleet-blue/5' : undefined}>
                                <Td className="font-medium">
                                    <button
                                        type="button"
                                        onClick={() => onSelectVehicle(p.vehicleId)}
                                        aria-pressed={p.vehicleId === selectedVehicleId}
                                        className="hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-fleet-blue"
                                    >
                                        {p.vehicleId}
                                    </button>
                                </Td>
                                <Td align="right">{formatNumber(p.exposure, 0)}</Td>
                                {counted && <Td align="right">{formatNumber(p.observed, 0)}</Td>}
                                {hasExpected && <Td align="right">{formatNumber(p.expected)}</Td>}
                                <Td align="right">{formatNumber(p.value)}</Td>
                                <Td>
                                    <span className="flex items-center gap-2">
                                        <StatusBadge status={p.status} />
                                        {distribution.median > 0 && (
                                            <span className="text-xs text-fleet-secondary">{formatNumber(p.value / distribution.median, 2)}×</span>
                                        )}
                                    </span>
                                </Td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={columns} className="px-3 py-6 text-center text-sm text-fleet-secondary">
                                    No vehicle differs clearly from the fleet for this behaviour.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

AnomalyDistribution.propTypes = {
    features: PropTypes.object,
    behaviourKey: PropTypes.string,
    alpha: PropTypes.number.isRequired,
    selectedVehicleId: PropTypes.string,
    onSelectVehicle: PropTypes.func,
    highlightFocus: PropTypes.bool,
};