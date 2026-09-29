import { useCallback, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { Activity, AlertCircle, AlertTriangle, Info, Loader2, ShieldCheck } from 'lucide-react'
import { getAnomalies } from '../../services/anomalyService'
import AnomalyDistribution from './AnomalyDistribution'
import AnomalyFindings from './AnomalyFindings'
import { formatNumber } from './anomalyFormat'

export const PERIOD_OPTIONS = [
    { id: 'current', label: 'Rolling 7 days (to latest data)' },
    { id: 'weekly', label: 'Last complete week (Mon-Sun)' },
    { id: 'monthly', label: 'Last complete month' },
]

const SOURCE_TEXT = {
    telemetry: "distance from the vehicles' odometer readings",
    trips: 'distance from completed trips',
}

const FOCUSED_SCOPES = ['vehicle', 'vehicles']

function scopeOptions(scopes) {
    const groups = (scopes.groups || []).map((g) => {
        const id = g.groupId ?? g.id
        return { value: `group:${id}`, label: g.name ?? g.label ?? `Group ${id}` }
    })
    const vehicles = (scopes.vehicles || []).map((v) => ({
        value: `vehicle:${v.vehicleId}`,
        label: `Vehicle ${v.vehicleId}`,
    }))
    return { groups, vehicles }
}

function Panel({ title, description, children }) {
    return (
        <section className="bg-white rounded-2xl border border-fleet-border shadow-sm">
            <div className="px-5 py-4 border-b border-fleet-border">
                <h3 className="text-sm font-semibold text-fleet-text">{title}</h3>
                {description && <p className="text-xs text-fleet-secondary mt-1 max-w-2xl">{description}</p>}
            </div>
            <div className="p-5">{children}</div>
        </section>
    )
}

Panel.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.node,
    children: PropTypes.node,
}

function oneIn(alpha) {
    return `1 in ${Math.round(1 / alpha).toLocaleString('en-US')}`
}


function MethodSteps({ anomalies, peerLabel }) {
    const { parameters: p, exposure } = anomalies
    const measured = exposure.basis
        ? `Incidents are counted ${exposure.label}${exposure.distanceSource ? `, using ${SOURCE_TEXT[exposure.distanceSource]}` : ''}, so a vehicle is never flagged just for driving more. With odometer distance, incidents on days without any recorded distance are left out.`
        : 'Too few vehicles had distance, trips or active days, so vehicles are compared on the mix of their incident types instead.'

    const steps = [
        ['Merge bursts', 'Events of the same type from one vehicle less than 60 seconds apart count as one incident.'],
        ['Measure against exposure', measured],
        ['Compare with the other vehicles', `Each vehicle is compared with the median of the other vehicles in ${peerLabel}, never with its own history, because the telemetry is replayed on a loop.`],
        ['Measure distance from normal', `Modified z-score (Iglewicz and Hoaglin, 1993), based on the median absolute deviation, which one extreme vehicle cannot distort. A vehicle is unusual above ${p.zThreshold}.`],
        ['Rule out chance', `Poisson exact test on the incident count. A finding needs a chance explanation below ${oneIn(p.alpha)} and at least ${p.minSupportingEvents} incidents.`],
        ['Require enough vehicles', `At least ${p.minPeerVehicles} vehicles with enough data are needed before any vehicle can be called unusual.`],
    ]

    return (
        <ol className="space-y-3 list-decimal pl-5 marker:text-fleet-secondary">
            {steps.map(([title, text]) => (
                <li key={title} className="text-sm text-fleet-text pl-1">
                    <span className="font-medium">{title}.</span>{' '}
                    <span className="text-fleet-secondary">{text}</span>
                </li>
            ))}
        </ol>
    )
}

MethodSteps.propTypes = {
    anomalies: PropTypes.object.isRequired,
    peerLabel: PropTypes.string.isRequired,
}

function coverageLine(result) {
    const { peers, exposure } = result.anomalies
    const parts = [`${peers.vehiclesEvaluated} of ${peers.vehicles} vehicles compared (${result.peerGroup.label})`]
    if (exposure.label) parts.push(`rates ${exposure.label}`)
    return parts.join(', ')
}

function scrollToFinding(vehicleId) {
    const el = typeof document !== 'undefined' ? document.getElementById(`finding-${vehicleId}`) : null
    if (!el || typeof el.scrollIntoView !== 'function') return
    const reduce = typeof window !== 'undefined' && window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' })
}

export default function AnomalyReport({ scopes, scopeValue, onScopeChange }) {
    const [periodType, setPeriodType] = useState('current')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [selectedVehicleId, setSelectedVehicleId] = useState(null)

    const options = useMemo(() => scopeOptions(scopes), [scopes])

    const handleDetect = useCallback(async () => {
        setLoading(true)
        setError(null)

        const [scopeType, scopeId] = scopeValue.split(':')

        try {
            const data = await getAnomalies({ scopeType, scopeId: scopeId || undefined, periodType })
            setResult(data)
            setSelectedVehicleId(null)
        } catch (err) {
            setError(err.message || 'Detection failed. Try again.')
            setResult(null)
        } finally {
            setLoading(false)
        }
    }, [scopeValue, periodType])

    const handleSelectVehicle = useCallback((vehicleId) => {
        setSelectedVehicleId((prev) => (prev === vehicleId ? null : vehicleId))
        scrollToFinding(vehicleId)
    }, [])

    const anomalies = result?.anomalies
    const focused = result ? FOCUSED_SCOPES.includes(result.scope.type) : false
    const noVehicles = result ? result.scope.vehicleCount === 0 : false
    const notes = anomalies?.dataQuality?.notes || []
    const flaggedCount = anomalies?.summary?.vehiclesFlagged || 0
    const peerNoun = anomalies?.peers?.noun || 'fleet'

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-fleet-border shadow-sm p-4 flex flex-wrap items-end gap-4">
                <label className="flex flex-col gap-1 text-xs font-medium text-fleet-secondary">
                    Vehicles
                    <select
                        value={scopeValue}
                        onChange={(e) => onScopeChange(e.target.value)}
                        data-testid="anomaly-scope"
                        className="border border-fleet-border rounded-lg px-3 py-2 text-sm text-fleet-text bg-white min-w-[12rem]"
                    >
                        <option value="fleet">Whole fleet</option>
                        {options.groups.length > 0 && (
                            <optgroup label="Fleet groups">
                                {options.groups.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </optgroup>
                        )}
                        {options.vehicles.length > 0 && (
                            <optgroup label="Single vehicle (compared with the whole fleet)">
                                {options.vehicles.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </optgroup>
                        )}
                    </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-medium text-fleet-secondary">
                    Timeframe
                    <select
                        value={periodType}
                        onChange={(e) => setPeriodType(e.target.value)}
                        data-testid="anomaly-period"
                        className="border border-fleet-border rounded-lg px-3 py-2 text-sm text-fleet-text bg-white"
                    >
                        {PERIOD_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                </label>

                <button
                    type="button"
                    onClick={handleDetect}
                    disabled={loading}
                    data-testid="anomaly-detect"
                    className="ml-auto flex items-center gap-2 rounded-lg bg-fleet-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fleet-blue"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                    {loading ? 'Comparing vehicles…' : 'Detect unusual driving'}
                </button>
            </div>

            {error && (
                <div role="alert" className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-700">{error}</p>
                </div>
            )}

            {!result && !loading && !error && (
                <p className="text-sm text-fleet-secondary py-10 text-center">
                    Choose the vehicles and a timeframe, then select Detect unusual driving.
                </p>
            )}

            {loading && !result && (
                <div className="flex items-center gap-3 text-fleet-secondary text-sm py-10 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Comparing every vehicle with the rest of the fleet…
                </div>
            )}

            {result && (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                            <h2 className="text-lg font-semibold text-fleet-text">{result.scope.label}</h2>
                            <p className="text-sm text-fleet-secondary">{result.period.label}</p>
                        </div>
                        {!noVehicles && <p className="text-xs text-fleet-secondary">{coverageLine(result)}</p>}
                    </div>

                    {noVehicles ? (
                        <div className="border border-fleet-border rounded-2xl bg-white p-10 text-center">
                            <Info className="w-8 h-8 text-fleet-secondary mx-auto mb-3" />
                            <p className="text-base font-semibold text-fleet-text">
                                {result.scope.type === 'fleet'
                                    ? 'No vehicles are assigned to your account yet.'
                                    : 'There are no vehicles in this selection.'}
                            </p>
                            {result.scope.type === 'fleet' && (
                                <p className="text-sm text-fleet-secondary mt-2">
                                    Ask an administrator to assign a fleet group to you, then run the detection again.
                                </p>
                            )}
                        </div>
                    ) : (
                        <>
                            <section className="bg-white rounded-2xl border border-fleet-border shadow-sm p-5" aria-live="polite">
                                <div className="flex items-start gap-3">
                                    {flaggedCount > 0
                                        ? <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                                        : <ShieldCheck className="w-6 h-6 text-fleet-green shrink-0 mt-0.5" aria-hidden="true" />}
                                    <p className="text-lg leading-snug text-fleet-text max-w-3xl" data-testid="anomaly-headline">
                                        {anomalies.headline}
                                    </p>
                                </div>
                                {notes.length > 0 && (
                                    <ul className="mt-4 space-y-2">
                                        {notes.map((note) => (
                                            <li key={note} className="flex items-start gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                                <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                                                {note}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            {anomalies.summary.featuresScored > 0 && (
                                <Panel
                                    title="Where each vehicle sits"
                                    description={`Each dot is a vehicle. The shaded band is the normal range for these ${formatNumber(anomalies.peers.vehiclesEvaluated, 0)} vehicles, and the dashed line is where a vehicle becomes unusual. Select a dot to find that vehicle.`}
                                >
                                    <AnomalyDistribution
                                        features={anomalies.features}
                                        selectedVehicleId={selectedVehicleId}
                                        onSelectVehicle={handleSelectVehicle}
                                        highlightFocus={focused}
                                    />
                                </Panel>
                            )}

                            {anomalies.summary.vehiclesEvaluated > 0 && (
                                <Panel
                                    title={focused ? 'Findings for the selected vehicle' : 'Vehicles that stand out'}
                                    description="Each finding shows the behaviour, how far it is from the other vehicles, and how unlikely it is to be chance."
                                >
                                    <AnomalyFindings
                                        flagged={anomalies.flagged}
                                        selectedVehicleId={selectedVehicleId}
                                        onSelectVehicle={handleSelectVehicle}
                                        peerNoun={peerNoun}
                                    />
                                </Panel>
                            )}

                            <details className="bg-white rounded-2xl border border-fleet-border shadow-sm group">
                                <summary className="cursor-pointer select-none px-5 py-4 text-sm font-semibold text-fleet-text rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-fleet-blue">
                                    How the detection works
                                </summary>
                                <div className="px-5 pb-5">
                                    <MethodSteps anomalies={anomalies} peerLabel={result.peerGroup.label} />
                                </div>
                            </details>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

AnomalyReport.propTypes = {
    scopes: PropTypes.shape({
        groups: PropTypes.array,
        vehicles: PropTypes.array,
    }).isRequired,
    scopeValue: PropTypes.string.isRequired,
    onScopeChange: PropTypes.func.isRequired,
}