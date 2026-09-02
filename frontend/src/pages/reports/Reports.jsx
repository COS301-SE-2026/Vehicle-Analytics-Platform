import { useState, useEffect, useCallback } from 'react'
import { FileBarChart, AlertCircle, Loader2 } from 'lucide-react'
import SafetySummaryCards from '../../components/reports/SafetySummaryCards'
import SafetyVehicleTable from '../../components/reports/SafetyVehicleTable'
import { getReportScopes, generateReport } from '../../services/reportServices'

const PERIOD_OPTIONS = [
    {
		id: 'latest',
		label: 'Last complete week',
		periodType: 'weekly',
		anchor: undefined,
	},
	{
		id: 'week-2026-08-17',
		label: 'Week of 17-23 Aug 2026',
		periodType: 'weekly',
		anchor: '2026-08-26T12:00:00+02:00',
	},
	{
		id: 'week-2026-08-24',
		label: 'Week of 24-30 Aug 2026',
		periodType: 'weekly',
		anchor: '2026-09-02T12:00:00+02:00',
	},
	{
		id: 'month',
		label: 'Last complete month',
		periodType: 'monthly',
		anchor: undefined,
	},
]

export default function Reports() {
	const [scopes, setScopes] = useState({ groups: [], vehicles: [], unassignedVehicleCount: 0 })
	const [scopeValue, setScopeValue] = useState('fleet')
	const [periodId, setPeriodId] = useState('week-2026-08-17')

	const [report, setReport] = useState(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)

	useEffect(() => {
		let cancelled = false
		getReportScopes()
			.then((res) => { if (!cancelled) setScopes(res) })
			.catch(() => { if (!cancelled) setScopes({ groups: [], vehicles: [], unassignedVehicleCount: 0 }) })
		return () => { cancelled = true }
	}, [])

	const handleGenerate = useCallback(async () => {
		setLoading(true)
		setError(null)

		const period = PERIOD_OPTIONS.find((p) => p.id === periodId)
		const [scopeType, scopeId] = scopeValue.split(':')

		try {
			const result = await generateReport({
				scopeType,
				scopeId: scopeId || undefined,
				periodType: period.periodType,
				anchor: period.anchor,
			})
			setReport(result)
		} catch (err) {
			setError(err.message || 'Failed to generate report')
			setReport(null)
		} finally {
			setLoading(false)
		}
	}, [periodId, scopeValue])

	const summary = report?.safety?.summary
	const noTelemetry = report && report.coverage && !report.coverage.hasTelemetry

	return (
		<div className="space-y-6">
			<div className="flex items-start gap-3">
				<FileBarChart className="w-7 h-7 text-fleet-blue shrink-0 mt-0.5" />
				<div>
					<p className="text-sm text-fleet-secondary mt-1">
						Analyse fleet performance and driver behaviour over a selected reporting period.
					</p>
				</div>
			</div>
{/* still to be changed as this is temporary */}
			<div className="bg-white rounded-2xl border border-fleet-border p-5 shadow-sm">
				<div className="flex flex-wrap items-end gap-4">
					<div className="flex flex-col gap-1.5">
						<label htmlFor="report-scope" className="text-xs font-semibold uppercase tracking-wider text-fleet-secondary">
							Fleet group
						</label>
						<select
							id="report-scope"
							value={scopeValue}
							onChange={(e) => setScopeValue(e.target.value)}
							className="border border-fleet-border rounded-lg px-3 py-2 text-sm text-fleet-text bg-white min-w-[220px]"
						>
							<option value="fleet">Entire fleet</option>
							{scopes.groups.length > 0 && (
								<optgroup label="Vehicle groups">
									{scopes.groups.map((g) => (
										<option key={g.id} value={`group:${g.id}`}>{g.name}</option>
									))}
								</optgroup>
							)}
							{scopes.vehicles.length > 0 && (
								<optgroup label="Vehicles">
									{scopes.vehicles.map((v) => (
										<option key={v.vehicleId} value={`vehicle:${v.vehicleId}`}>{v.vehicleId}</option>
									))}
								</optgroup>
							)}
						</select>
					</div>

					<div className="flex flex-col gap-1.5">
						<label htmlFor="report-period" className="text-xs font-semibold uppercase tracking-wider text-fleet-secondary">
							Reporting period
						</label>
						<select
							id="report-period"
							value={periodId}
							onChange={(e) => setPeriodId(e.target.value)}
							className="border border-fleet-border rounded-lg px-3 py-2 text-sm text-fleet-text bg-white min-w-[220px]"
						>
							{PERIOD_OPTIONS.map((p) => (
								<option key={p.id} value={p.id}>{p.label}</option>
							))}
						</select>
					</div>

					<button
						type="button"
						onClick={handleGenerate}
						disabled={loading}
						className="bg-fleet-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-fleet-blue/90 disabled:opacity-60 flex items-center gap-2"
					>
						{loading && <Loader2 className="w-4 h-4 animate-spin" />}
						{loading ? 'Generating\u2026' : 'Generate Report'}
					</button>
				</div>

				{scopes.unassignedVehicleCount > 0 && (
					<p className="mt-3 text-xs text-fleet-secondary">
						{scopes.unassignedVehicleCount} vehicle(s) are not assigned to any group and fall
						outside every manager-scoped report.
					</p>
				)}
			</div>

			{error && (
				<div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
					<AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
					<div>
						<p className="text-sm font-medium text-red-700">{error}</p>
						<p className="text-xs text-red-600 mt-1">
							Possible routing issue if it does not pop up.
						</p>
					</div>
				</div>
			)}

			{loading && !report && (
				<div className="flex items-center gap-3 text-fleet-secondary text-sm py-10 justify-center">
					<Loader2 className="w-5 h-5 animate-spin" />
					Calculating analytics from telemetry&hellip;
				</div>
			)}

			{!report && !loading && !error && (
				<p className="text-sm text-fleet-secondary py-10 text-center">
					Select a scope and reporting period, then generate a report.
				</p>
			)}

			{report && (
				<div className="space-y-6">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<div>
							<h2 className="text-lg font-semibold text-fleet-text">
								{report.report.scope.label}
							</h2>
							<p className="text-sm text-fleet-secondary">
								{report.period.label}
								{report.previousPeriod && ` \u00b7 compared with ${report.previousPeriod.label}`}
							</p>
						</div>
						<p className="text-xs text-fleet-secondary">
							{report.coverage.vehiclesWithEvents} of {report.coverage.vehiclesInScope} vehicles
							reported events
						</p>
					</div>

					{noTelemetry ? (
						<div className="border border-fleet-border rounded-2xl bg-white p-10 text-center">
							<AlertCircle className="w-8 h-8 text-fleet-secondary mx-auto mb-3" />
							<p className="text-base font-semibold text-fleet-text">
								No telemetry available for this reporting period.
							</p>
							<p className="text-sm text-fleet-secondary mt-2 max-w-lg mx-auto">
								No vehicle data was recorded between {report.period.fromDate} and{' '}
								{report.period.toDate}, so no safety score can be calculated for this period.
							</p>
						</div>
					) : (
						<>
							<section className="space-y-4">
								<h3 className="text-sm font-semibold text-fleet-text">Safety Analytics</h3>
								<SafetySummaryCards
									summary={summary}
									comparison={report.safety.comparison}
								/>
							</section>

							<section className="space-y-3">
								<h3 className="text-sm font-semibold text-fleet-text">Vehicle Safety Ranking</h3>
								<SafetyVehicleTable vehicles={report.safety.vehicles} />
							</section>
						</>
					)}

					{report.notes?.length > 0 && (
						<ul className="text-xs text-fleet-secondary space-y-1 border-t border-fleet-border pt-4">
							{report.notes.map((note) => (
								<li key={note}>{note}</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	)
}