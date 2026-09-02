import { useState, useEffect, useCallback, useMemo } from 'react'
import { FileBarChart, AlertCircle, Loader2, Download } from 'lucide-react'
import SafetySummaryCards from '../../components/reports/SafetySummaryCards'
import SafetyVehicleTable from '../../components/reports/SafetyVehicleTable'
import ReportToolbar from '../../components/reports/ReportToolbar'
import VehicleComparisonChart from '../../components/reports/VehicleComparisonChart'
import { getReportScopes, generateReport } from '../../services/reportServices'


function toISODate(date){
	if (!date) return undefined
	const d = new Date(date)
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${d.getFullYear()}-${month}-${day}`
}

const CSV_COLUMNS = [
	'vehicleId', 'safetyScore', 'classification', 'totalEvents', 'harshBrakes',
	'harshAccelerations', 'harshCornering', 'crashes', 'overspeedEvents', 'idlingEvents',
	'distanceKm', 'tripCount', 'utilisationPct', 'fuelLiters', 'avgEfficiencyKmPerL',
]

function downloadCsv(report, entities){
	const header = CSV_COLUMNS.join(',')
	const rows = entities.map((entity) => CSV_COLUMNS
		.map((col) => {
			const value = entity[col]
			return value === null || value === undefined ? '' : value
		})
		.join(','))

	const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = `vapor-report-${report.period.fromDate}-to-${report.period.toDate}.csv`
	link.click()
	URL.revokeObjectURL(url)
}

function Panel({ label, action, children }){
	return (
		<div className="bg-white rounded-2xl border border-fleet-border shadow-sm">
			<div className="flex items-center justify-between px-5 py-4 border-b border-fleet-border">
				<p className="text-xs font-semibold uppercase tracking-widest text-fleet-secondary">
					{label}
				</p>
				{action}
			</div>
			<div className="p-5">{children}</div>
		</div>
	)
}

export default function Reports(){
	const [scopes, setScopes] = useState({ groups: [], vehicles: [], unassignedVehicleCount: 0 })
	const [scopeValue, setScopeValue] = useState('fleet')
	const [periodType, setPeriodType] = useState('weekly')
	const [dateRange, setDateRange] = useState({ from: undefined, to: undefined })

	const [compareMode, setCompareMode] = useState(false)
	const [selectedVehicleIds, setSelectedVehicleIds] = useState([])

	const [report, setReport] = useState(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)

	useEffect(() => {
		let cancelled = false
		getReportScopes()
			.then((res) => { if (!cancelled) setScopes(res) })
			.catch(() => {
				if (!cancelled) setScopes({ groups: [], vehicles: [], unassignedVehicleCount: 0 })
			})
		return () => { cancelled = true }
	}, [])

	const handleGenerate = useCallback(async () => {
		setLoading(true)
		setError(null)
		setSelectedVehicleIds([])

		const [scopeType, scopeId] = scopeValue.split(':')

		try {
			const result = await generateReport({
				scopeType,
				scopeId: scopeId || undefined,
				periodType,
				from: periodType === 'custom' ? toISODate(dateRange?.from) : undefined,
				to: periodType === 'custom' ? toISODate(dateRange?.to) : undefined,
			})
			setReport(result)
		} catch (err) {
			setError(err.message || 'Failed to generate report')
			setReport(null)
		} finally {
			setLoading(false)
		}
	}, [scopeValue, periodType, dateRange])

	const entities = useMemo(
		() => report?.rankings?.entities || report?.safety?.vehicles || [],
		[report],
	)

	const chartVehicles = useMemo(() => {
		if (!report) return []

		if (report.report.scope.type === 'vehicle') {
			return entities.filter((e) => e.vehicleId === report.report.scope.id)
		}

		if (!compareMode) return []
		return entities.filter((e) => selectedVehicleIds.includes(e.vehicleId))
	}, [report, entities, compareMode, selectedVehicleIds])

	function toggleVehicle(vehicleId) {
		setSelectedVehicleIds((prev) => (prev.includes(vehicleId)
			? prev.filter((id) => id !== vehicleId)
			: [...prev, vehicleId]))
	}

	const summary = report?.safety?.summary
	const noTelemetry = report && report.coverage && !report.coverage.hasTelemetry
	const scopedToVehicle = report?.report?.scope?.type === 'vehicle'

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex items-start gap-3">
					<FileBarChart className="w-7 h-7 text-fleet-blue shrink-0 mt-0.5" />
					<div>
						<h1 className="text-2xl font-bold text-fleet-text">Fleet Reports</h1>
						<p className="text-sm text-fleet-secondary mt-1">
							Analyse fleet performance and driving behaviour over a reporting period.
						</p>
					</div>
				</div>

				{report && (
					<button
						type="button"
						onClick={() => downloadCsv(report, entities)}
						className="flex items-center gap-2 border border-fleet-border rounded-lg px-3 py-2
							text-sm text-fleet-text bg-white hover:border-fleet-blue"
					>
						<Download className="w-4 h-4 text-fleet-secondary" />
						Export CSV
					</button>
				)}
			</div>

			<ReportToolbar
				scopes={scopes}
				scopeValue={scopeValue}
				onScopeChange={setScopeValue}
				periodType={periodType}
				onPeriodTypeChange={setPeriodType}
				dateRange={dateRange}
				onDateRangeChange={setDateRange}
				compareMode={compareMode}
				onCompareModeChange={setCompareMode}
				onGenerate={handleGenerate}
				loading={loading}
			/>

			{error && (
				<div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
					<AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
					<p className="text-sm font-medium text-red-700">{error}</p>
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
					Choose a timeframe and a scope, then generate a report.
				</p>
			)}

			{report && (
				<div className="space-y-5">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<div>
							<h2 className="text-lg font-semibold text-fleet-text">
								{report.report.scope.label}
							</h2>
							<p className="text-sm text-fleet-secondary">
								{report.period.label}
								{report.previousPeriod && ` - compared with ${report.previousPeriod.label}`}
							</p>
						</div>
						<p className="text-xs text-fleet-secondary">
							{report.coverage.vehiclesWithEvents} of {report.coverage.vehiclesInScope} vehicles
							reported events
							{'- '}
							{report.coverage.activeVehicles} active
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
								{report.period.toDate}, so no safety score can be calculated.
							</p>
						</div>
					) : (
						<>
							<SafetySummaryCards summary={summary} comparison={report.safety.comparison} />

							<Panel
								label={scopedToVehicle ? 'Vehicle analytics' : 'Vehicle comparison'}
								action={compareMode && !scopedToVehicle && (
									<span className="text-xs text-fleet-secondary">
										{selectedVehicleIds.length} selected
									</span>
								)}
							>
								{compareMode && !scopedToVehicle && (
									<div className="flex flex-wrap gap-2 mb-5">
										{entities.map((entity) => {
											const active = selectedVehicleIds.includes(entity.vehicleId)
											return (
												<button
													key={entity.vehicleId}
													type="button"
													onClick={() => toggleVehicle(entity.vehicleId)}
													aria-pressed={active}
													className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
														active
															? 'border-fleet-blue text-fleet-blue bg-fleet-blue/5'
															: 'border-fleet-border text-fleet-secondary hover:text-fleet-text'
													}`}
												>
													{entity.vehicleId}
												</button>
											)
										})}
									</div>
								)}

								<VehicleComparisonChart vehicles={chartVehicles} />
							</Panel>

							<Panel label="Critical safety metrics">
								<SafetyVehicleTable vehicles={report.safety.vehicles} />
							</Panel>
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
