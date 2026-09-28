import PropTypes from 'prop-types'
import { AlertTriangle, ShieldCheck, Info, Loader2 } from 'lucide-react'

const SEVERITY_STYLES = {
	high: 'bg-red-50 text-red-700 border-red-200',
	moderate: 'bg-amber-50 text-amber-700 border-amber-200',
	low: 'bg-slate-50 text-slate-700 border-fleet-border',
}

function formatValue(value, unit){
	if (value === null || value === undefined) return '-'
	const rounded = Math.round(value * 100) / 100
	return `${rounded} ${unit}`
}

/*
 * Turns one flag into the sentence a fleet manager can act on, for example:
 * "8.7x the fleet median (17.96 events/100km vs 2.07), 97 incidents".
 */
function flagExplanation(flag){
	const comparison = flag.ratio
		? `${flag.ratio}x the group median`
		: 'above every other vehicle in the group'

	const values = `${formatValue(flag.value, flag.unit)} vs ${formatValue(flag.peerMedian, flag.unit)}`
	const incidents = flag.supportingCount !== null && flag.supportingCount !== undefined
		? `, ${flag.supportingCount} incidents`
		: ''

	return `${comparison} (${values})${incidents}`
}

function SeverityBadge({ severity }){
	const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.low
	return (
		<span className={`text-xs font-semibold uppercase tracking-wider border rounded-full px-2.5 py-1 ${style}`}>
			{severity}
		</span>
	)
}

SeverityBadge.propTypes = { severity: PropTypes.string.isRequired }

function Message({ icon: Icon, title, detail }){
	return (
		<div className="flex items-start gap-3 px-5 py-6">
			<Icon className="w-5 h-5 text-fleet-secondary shrink-0 mt-0.5" />
			<div>
				<p className="text-sm font-medium text-fleet-text">{title}</p>
				{detail && <p className="text-sm text-fleet-secondary mt-1">{detail}</p>}
			</div>
		</div>
	)
}

Message.propTypes = {
	icon: PropTypes.elementType.isRequired,
	title: PropTypes.string.isRequired,
	detail: PropTypes.string,
}

export default function AnomalyPanel({
	anomalies = null,
	loading = false,
	error = null,
	scopeLabel = 'the fleet',
}){
	const summary = anomalies?.summary
	const parameters = anomalies?.parameters
	const exposure = anomalies?.exposure

	return (
		<div className="bg-white rounded-2xl border border-fleet-border shadow-sm">
			<div className="flex items-center justify-between px-5 py-4 border-b border-fleet-border">
				<div>
					<p className="text-xs font-semibold uppercase tracking-widest text-fleet-secondary">
						Unusual driving patterns
					</p>
					<p className="text-xs text-fleet-secondary mt-1">
						Each vehicle is compared against the other vehicles in {scopeLabel} over the
						same period{exposure?.label ? `, ${exposure.label}` : ''}.
					</p>
				</div>
				{summary && (
					<span className="text-xs text-fleet-secondary">
						{summary.vehiclesFlagged} of {summary.vehiclesEvaluated} vehicles flagged
					</span>
				)}
			</div>

			{!loading && !error && anomalies?.headline && (
				<p className="px-5 pt-4 text-sm text-fleet-text">{anomalies.headline}</p>
			)}

			{loading && (
				<div className="flex items-center gap-3 text-fleet-secondary text-sm py-8 justify-center">
					<Loader2 className="w-5 h-5 animate-spin" />
					Comparing vehicles against the fleet&hellip;
				</div>
			)}

			{!loading && error && (
				<Message icon={AlertTriangle} title="Anomaly detection unavailable" detail={error} />
			)}

			{!loading && !error && !anomalies && (
				<Message
					icon={Info}
					title="Generate a report to run detection."
					detail="Detection uses the same scope and period as the report above."
				/>
			)}

			{!loading && !error && anomalies && exposure?.note && summary.vehiclesEvaluated > 0 && (
				<p className="px-5 pt-4 text-xs text-fleet-secondary">{exposure.note}</p>
			)}

			{!loading && !error && anomalies && summary.vehiclesEvaluated < (parameters?.minPeerVehicles || 5) && (
				<Message
					icon={Info}
					title="Not enough vehicles to compare."
					detail={`At least ${parameters?.minPeerVehicles || 5} vehicles need driving or at least ${parameters?.minEventsForMix || 20} recorded incidents in this period before any vehicle can be called unusual.`}
				/>
			)}

			{!loading && !error && anomalies
				&& summary.vehiclesEvaluated >= (parameters?.minPeerVehicles || 5)
				&& anomalies.flagged.length === 0 && (
				<Message
					icon={ShieldCheck}
					title="No vehicle deviated from the fleet this period."
					detail={`${summary.vehiclesEvaluated} vehicles compared across ${summary.featuresScored} behaviour measures.`}
				/>
			)}

			{!loading && !error && anomalies && summary.vehiclesFlagged > summary.vehiclesReported && (
				<p className="px-5 pt-3 text-xs text-fleet-secondary">
					Showing the {summary.vehiclesReported} vehicles with the strongest deviation,
					of {summary.vehiclesFlagged} flagged.
				</p>
			)}

			{!loading && !error && anomalies && anomalies.flagged.length > 0 && (
				<ul className="divide-y divide-fleet-border">
					{anomalies.flagged.map((vehicle) => (
						<li key={vehicle.vehicleId} className="px-5 py-4">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div className="flex items-center gap-3">
									<AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
									<p className="text-sm font-semibold text-fleet-text">{vehicle.vehicleId}</p>
									<SeverityBadge severity={vehicle.severity} />
								</div>
								<p className="text-xs text-fleet-secondary">
									{vehicle.flagCount} measure{vehicle.flagCount === 1 ? '' : 's'}
									{' - '}
									{vehicle.totalIncidents} incidents
									{vehicle.distanceKm > 0 ? ` over ${vehicle.distanceKm} km` : ''}
								</p>
							</div>

							<ul className="mt-3 space-y-2">
								{vehicle.flags.map((flag) => (
									<li key={flag.feature} className="text-sm">
										<span className="font-medium text-fleet-text">{flag.label}: </span>
										<span className="text-fleet-secondary">{flagExplanation(flag)}</span>
									</li>
								))}
							</ul>
						</li>
					))}
				</ul>
			)}

			{!loading && !error && anomalies && (
				<p className="px-5 py-3 border-t border-fleet-border text-xs text-fleet-secondary">
					{exposure?.basis
						? `Rates are measured ${exposure.label}, so a vehicle is never flagged for simply driving more. `
						: 'Vehicles are compared on the mix of incident types, which does not depend on distance. '}
					A vehicle is flagged when it sits more than {parameters?.zThreshold || 3.5} robust
					deviations above the group median.
				</p>
			)}
		</div>
	)
}

AnomalyPanel.propTypes = {
	anomalies: PropTypes.shape({
		summary: PropTypes.object,
		parameters: PropTypes.object,
		flagged: PropTypes.array,
	}),
	loading: PropTypes.bool,
	error: PropTypes.string,
	scopeLabel: PropTypes.string,
}