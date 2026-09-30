import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { AnomalyFunnelChart, statusLabel } from '../ui/anomalyCharts';
import { formatNumber, valueLabel } from './anomalyFormat';
import InfoHint from './InfoHint';

const STATUS_BADGES = {
    flagged: 'bg-red-50 text-red-700 border-red-200',
    normal: 'bg-gray-50 text-fleet-secondary border-fleet-border',
    unconfirmed: 'bg-white text-fleet-secondary border-fleet-border border-dashed',
};

const STATUS_ORDER = ['flagged', 'unconfirmed', 'normal'];

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


function StatusBadge({ status, peerNoun }){
    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[status] || STATUS_BADGES.normal}`}>
            {statusLabel(status, peerNoun)}
        </span>
    );
}

StatusBadge.propTypes = { status: PropTypes.string.isRequired, peerNoun: PropTypes.string.isRequired };


export default function AnomalyDistribution({
    features = {},
    behaviourKey = null,
    alpha,
    peerNoun = 'fleet',
    selectedVehicleId = null,
    onSelectVehicle = () => {},
    highlightFocus = false,
}){
    const [flaggedOnly, setFlaggedOnly] = useState(true);
    const feature = behaviourKey ? features[behaviourKey] : null;
    const plottable = Boolean(feature && feature.status === 'scored' && feature.distribution);

    const rows = useMemo(() => {
        if (!plottable) return [];
        return feature?.distribution?.points
            .filter((p) => !flaggedOnly
                || p.status === 'flagged'
                || p.vehicleId === selectedVehicleId
                || (highlightFocus && p.inFocus))
            .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || b.value - a.value);
    }, [plottable, feature, flaggedOnly, selectedVehicleId, highlightFocus]);

    if (!plottable) {
        return (
            <p className="text-sm text-fleet-secondary py-10 text-center">No behaviour had enough vehicles with data to plot.</p>
        );
    }

    const { distribution } = feature;
    const counted = feature?.kind !== 'speed';
    const hasExpected = feature?.kind === 'rate';
    const columns = 4 + (counted ? 1 : 0) + (hasExpected ? 1 : 0);

    return (
        <div>
            <AnomalyFunnelChart
                feature={feature}
                alpha={alpha}
                peerNoun={peerNoun}
                selectedVehicleId={selectedVehicleId}
                onSelectVehicle={onSelectVehicle}
                highlightFocus={highlightFocus}
            />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-fleet-text">Vehicles to look at</p>
                    <InfoHint label="Vehicles to look at">
                        <p>
                            <strong>{distribution?.exposureLabel || 'Exposure'}</strong> is how much each vehicle drove
                            in the period, which the rate is measured against.
                        </p>
                        {counted && <p><strong>Incidents</strong> is how many the vehicle recorded.</p>}
                        {hasExpected && (
                            <p>
                                <strong>Expected</strong> is how many incidents it would have recorded at the other
                                vehicles&apos; rate over the same driving.
                            </p>
                        )}
                        <p>
                            <strong>Compared with {peerNoun}</strong> is the result: stands out, unconfirmed (above the
                            line, but too few incidents or possibly chance), or normal.
                        </p>
                        <p>
                            By default only vehicles that stand out are listed. Untick the box to see every vehicle.
                            Vehicles whose devices never report this behaviour are left out.
                        </p>
                    </InfoHint>
                </div>
                <label className="flex items-center gap-2 text-xs text-fleet-secondary">
                    <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="rounded border-fleet-border"/>
                    Only vehicles that stand out
                </label>
            </div>

            <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
                <table className="min-w-full" data-testid="anomaly-vehicle-table">
                    <thead className="border-b border-fleet-border sticky top-0 bg-white">
                        <tr>
                            <Th>Vehicle</Th>
                            <Th align="right">{distribution?.exposureLabel || 'Exposure'}</Th>
                            {counted && <Th align="right">Incidents</Th>}
                            {hasExpected && <Th align="right">Expected</Th>}
                            <Th align="right">{valueLabel(feature)}</Th>
                            <Th>Compared with {peerNoun}</Th>
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
                                <Td><StatusBadge status={p.status} peerNoun={peerNoun} /></Td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={columns} className="px-3 py-6 text-center text-sm text-fleet-secondary">
                                    No vehicle differs clearly from the {peerNoun} for this behaviour.
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
    peerNoun: PropTypes.string,
    selectedVehicleId: PropTypes.string,
    onSelectVehicle: PropTypes.func,
    highlightFocus: PropTypes.bool,
};