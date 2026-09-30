import { useState, useEffect, useCallback, useMemo } from 'react'
import {
	FileBarChart, AlertCircle, Loader2, Download, FileDown, Save, Archive, X,
} from 'lucide-react'
import SafetySummaryCards from '../../components/reports/SafetySummaryCards'
import SafetyVehicleTable from '../../components/reports/SafetyVehicleTable'
import ReportToolbar from '../../components/reports/ReportToolbar'
import VehicleComparisonChart from '../../components/reports/VehicleComparisonChart'
import WeatherAreaReport from '../../components/reports/WeatherAreaReport'
import InfoHint from '../../components/reports/InfoHint'
import { getReportScopes, generateReport } from '../../services/reportServices'
import AnomalyReport from '../../components/reports/AnomalyReport'

const AUTO_PLOT_LIMIT = 12

const REPORT_TABS = [
    { key: 'performance', label: 'Fleet performance' },
    { key: 'weather', label: 'Weather and areas' },
    { key: 'anomalies', label: 'Unusual driving' },
]

const TAB_DESCRIPTIONS = {
    performance: 'Analyse fleet performance and driving behaviour over a reporting period.',
    weather: 'See how weather and location relate to driving events, and which vehicles differ from the fleet.',
    anomalies: 'Find vehicles whose driving differs clearly from the rest of the fleet over the same period.',
}

function toISODate(date){
    if (!date) return undefined
    const d = new Date(date)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${month}-${day}`
}

// The PDF and the saved copy must describe exactly the window on screen, so
// the request echoes the report's own anchor (or dates, for a custom range)
// instead of letting the server resolve "now" again.
function requestFromReport(r){
	const custom = r.period.type === 'custom'
	return {
		scopeType: r.report.scope.type,
		scopeId: r.report.scope.id ?? undefined,
		periodType: r.period.type,
		anchor: custom ? undefined : (r.period.anchor || undefined),
		from: custom ? r.period.fromDate : undefined,
		to: custom ? r.period.toDate : undefined,
	}
}

function withoutStoredId(result){
	const dataset = { ...result }
	delete dataset.storedReportId
	return dataset
}

function formatGeneratedAt(iso){
	if (!iso) return ''
	return new Date(iso).toLocaleString('en-ZA', {
		day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
	})
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

function Panel({ label, info, action, children }){
    return (
        <div className="bg-white rounded-2xl border border-fleet-border shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-fleet-border">
                <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-fleet-secondary">
                        {label}
                    </p>
                    {info && <InfoHint label={label}>{info}</InfoHint>}
                </div>
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
    const [reportType, setReportType] = useState('performance')

    const [scopes, setScopes] = useState({ groups: [], vehicles: [], unassignedVehicleCount: 0 })
    const [scopeValue, setScopeValue] = useState('fleet')
    const [periodType, setPeriodType] = useState('weekly')

    const [dateRange, setDateRange] = useState({ from: undefined, to: undefined })

	const [compareMode, setCompareMode] = useState(false)
	const [scopeVehicleIds, setScopeVehicleIds] = useState([])
	const [plottedVehicleIds, setPlottedVehicleIds] = useState([])
    const [compareMode, setCompareMode] = useState(false)

    const [scopeVehicleIds, setScopeVehicleIds] = useState([])

    const [plottedVehicleIds, setPlottedVehicleIds] = useState([])

	const [report, setReport] = useState(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
    const [report, setReport] = useState(null)

    const [loading, setLoading] = useState(false)

    const [error, setError] = useState(null)



	const [busy, setBusy] = useState(null) // 'pdf' | 'save' | null
	const [historyKey, setHistoryKey] = useState(0)


	const [storedReport, setStoredReport] = useState(null)

    useEffect(() => {
        let cancelled = false
        getReportScopes()
            .then((res) => { if (!cancelled) setScopes(res) })
            .catch(() => {
                if (!cancelled) setScopes({ groups: [], vehicles: [], unassignedVehicleCount: 0 })
            })
        return () => { cancelled = true }
    }, [])

    const candidateVehicles = useMemo(() => {
        const [scopeType, scopeId] = scopeValue.split(':')

        if (scopeType === 'group') {
            return scopes.vehicles.filter((v) => String(v.groupId) === scopeId)
        }
        if (scopeType === 'vehicle') {
            return scopes.vehicles.filter((v) => v.vehicleId === scopeId)
        }
        return scopes.vehicles
    }, [scopes.vehicles, scopeValue])

    function toggleScopeVehicle(vehicleId){
        setScopeVehicleIds((prev) => (prev.includes(vehicleId)
            ? prev.filter((id) => id !== vehicleId)
            : [...prev, vehicleId]))
    }


    function togglePlottedVehicle(vehicleId){
        setPlottedVehicleIds((prev) => (prev.includes(vehicleId)
            ? prev.filter((id) => id !== vehicleId)
            : [...prev, vehicleId]))
    }


    const handleGenerate = useCallback(async () => {
        setLoading(true)
        setError(null)

        const comparing = compareMode && scopeVehicleIds.length > 0

        const [dropdownType, dropdownId] = scopeValue.split(':')
        
        const scopeType = comparing ? 'vehicles' : dropdownType

        const scopeId = comparing ? scopeVehicleIds : (dropdownId || undefined)

        try {
            const result = await generateReport({
                scopeType,
                scopeId,
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
    }, [scopeValue, periodType, dateRange, compareMode, scopeVehicleIds])

    const entities = useMemo(
        () => report?.rankings?.entities || report?.safety?.vehicles || [],
        [report],
    )

    useEffect(() => {
        if (!report) {
            setPlottedVehicleIds([])
            return
        }
        const ids = entities.map((e) => e.vehicleId)
        setPlottedVehicleIds(ids.length <= AUTO_PLOT_LIMIT ? ids : [])
    }, [report, entities])

    const chartVehicles = useMemo(
        () => entities.filter((e) => plottedVehicleIds.includes(e.vehicleId)),
        [entities, plottedVehicleIds],
    )

    const cardSummary = useMemo(() => (report ? {
        ...report.distance.summary,
        ...report.fuel.summary,
        ...report.safety.summary,
    } : null), [report])

    const cardComparison = useMemo(() => (report ? {
        ...(report.distance.comparison || {}),
        ...(report.fuel.comparison || {}),
        ...(report.safety.comparison || {}),
    } : null), [report])

    const noTelemetry = report && report.coverage && !report.coverage.hasTelemetry

    const isPerformance = reportType === 'performance'

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div>
                        <p className="text-sm text-fleet-secondary mt-1">
                            {TAB_DESCRIPTIONS[reportType]}
                        </p>
                    </div>
                </div>

				{report && (
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							onClick={() => downloadCsv(report, entities)}
							className="flex items-center gap-2 border border-fleet-border rounded-lg px-3 py-2
								text-sm text-fleet-text bg-white hover:border-fleet-blue"
						>
							<Download className="w-4 h-4 text-fleet-secondary" />
							Export CSV
						</button>

						{!storedReport && (
							<button
								type="button"
								onClick={handleSave}
								disabled={busy !== null}
								className="flex items-center gap-2 border border-fleet-border rounded-lg px-3 py-2
									text-sm text-fleet-text bg-white hover:border-fleet-blue disabled:opacity-60"
							>
								{busy === 'save'
									? <Loader2 className="w-4 h-4 animate-spin" />
									: <Save className="w-4 h-4 text-fleet-secondary" />}
								{busy === 'save' ? 'Saving...' : 'Save to history'}
							</button>
						)}

						<button
							type="button"
							onClick={handleDownloadPdf}
							disabled={busy !== null}
							className="flex items-center gap-2 bg-fleet-blue text-white rounded-lg px-3 py-2
								text-sm hover:bg-fleet-blue/90 disabled:opacity-60"
						>
							{busy === 'pdf'
								? <Loader2 className="w-4 h-4 animate-spin" />
								: <FileDown className="w-4 h-4" />}
							{busy === 'pdf' ? 'Preparing...' : 'Download PDF'}
						</button>
					</div>
				)}
			</div>
                {isPerformance && report && (
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

            <div role="tablist" aria-label="Report type" className="flex gap-1 border-b border-fleet-border">
                {REPORT_TABS.map((tab) => {
                    const active = reportType === tab.key
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setReportType(tab.key)}
                            className={`-mb-px px-4 py-2 text-sm font-medium border-b-2 ${
                                active
                                    ? 'border-fleet-blue text-fleet-blue'
                                    : 'border-transparent text-fleet-secondary hover:text-fleet-text'
                            }`}
                        >
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {reportType === 'weather' && (
                <WeatherAreaReport
                    scopes={scopes}
                    scopeValue={scopeValue}
                    onScopeChange={setScopeValue}
                />
            )}

            {reportType === 'anomalies' && (
                <AnomalyReport
                    scopes={scopes}
                    scopeValue={scopeValue}
                    onScopeChange={setScopeValue}
                />
            )}

            {isPerformance && (
                <>
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
                        candidateVehicles={candidateVehicles}
                        selectedVehicleIds={scopeVehicleIds}
                        onToggleVehicle={toggleScopeVehicle}
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
					{storedReport && (
						<div
							data-testid="stored-report-banner"
							className="flex flex-wrap items-center justify-between gap-3 bg-fleet-blue/5 border border-fleet-blue/20 rounded-2xl px-4 py-3"
						>
							<p className="flex items-center gap-2 text-sm text-fleet-text">
								<Archive className="w-4 h-4 text-fleet-blue shrink-0" />
								Stored {storedReport.trigger === 'scheduled' ? 'automated' : 'manual'} report,
								generated {formatGeneratedAt(storedReport.generatedAt)}. Figures are as calculated at that time.
							</p>
							<button
								type="button"
								onClick={closeStored}
								className="inline-flex items-center gap-1 text-xs font-medium text-fleet-secondary hover:text-fleet-text"
							>
								<X className="w-3.5 h-3.5" />
								Close
							</button>
						</div>
					)}

					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<div>
							<h2 className="text-lg font-semibold text-fleet-text">
								{report.report.scope.label}
							</h2>
							<p className="text-sm text-fleet-secondary">
								{report.period.label}
							</p>
						</div>
						<p className="text-xs text-fleet-secondary">
							{report.coverage.vehiclesWithEvents} of {report.coverage.vehiclesInScope} vehicles
							reported events{' - '} {report.coverage.activeVehicles} active
						</p>
					</div>
                    {report && (
                        <div className="space-y-5">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <div>
                                    <h2 className="text-lg font-semibold text-fleet-text">
                                        {report.report.scope.label}
                                    </h2>
                                    <p className="text-sm text-fleet-secondary">
                                        {report.period.label}
                                    </p>
                                </div>
                                <p className="text-xs text-fleet-secondary">
                                    {report.coverage.vehiclesWithEvents} of {report.coverage.vehiclesInScope} vehicles
                                    reported events{' - '} {report.coverage.activeVehicles} active
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
							<SafetySummaryCards summary={cardSummary} comparison={cardComparison} />

							<Panel label={report.previousPeriod ? `Analysis against ${report.previousPeriod.label}` : 'Analysis'}>
								<ReportAnalysis report={report} />
							</Panel>
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
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-medium text-fleet-text">Period summary</p>
                                            <InfoHint label="Period summary">
                                                <p>
                                                    Each card is a total or average for the vehicles and period you chose.
                                                </p>
                                                <p>
                                                    The change shown on a card compares with the previous period of the same
                                                    length. If the previous period had too little driving to compare fairly, no
                                                    change is shown.
                                                </p>
                                                <p>
                                                    Safety score is out of 100: a clean record scores 100, and harsh driving
                                                    events and crashes take points off.
                                                </p>
                                                <p>
                                                    Fuel figures are estimates from distance, speed and road type, not readings
                                                    from a fuel sensor.
                                                </p>
                                            </InfoHint>
                                        </div>
                                        <SafetySummaryCards summary={cardSummary} comparison={cardComparison} />
                                    </div>

                                    <Panel
                                        label="Vehicle comparison"
                                        info={
                                            <>
                                                <p>
                                                    Use the buttons above the chart to choose which vehicles to plot. Up to{' '}
                                                    {AUTO_PLOT_LIMIT} are plotted automatically; with more, pick the ones
                                                    you want to compare.
                                                </p>
                                                <p>
                                                    Look for the vehicles that stand apart from the rest, then find them in
                                                    &quot;Critical safety metrics&quot; below to see which events are behind it.
                                                </p>
                                            </>
                                        }
                                        action={entities.length > 0 && (
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-fleet-secondary">
                                                    {plottedVehicleIds.length} of {entities.length} plotted
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setPlottedVehicleIds(
                                                        plottedVehicleIds.length === entities.length
                                                            ? []
                                                            : entities.map((e) => e.vehicleId),
                                                    )}
                                                    className="text-xs font-medium text-fleet-blue hover:underline"
                                                >
                                                    {plottedVehicleIds.length === entities.length ? 'Clear' : 'Select all'}
                                                </button>
                                            </div>
                                        )}
                                    >
                                        {entities.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-5 max-h-32 overflow-y-auto">
                                                {entities.map((entity) => {
                                                    const active = plottedVehicleIds.includes(entity.vehicleId)
                                                    return (
                                                        <button
                                                            key={entity.vehicleId}
                                                            type="button"
                                                            onClick={() => togglePlottedVehicle(entity.vehicleId)}
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

                                    <Panel
                                        label="Critical safety metrics"
                                        info={
                                            <>
                                                <p>
                                                    One row per vehicle, with its safety score and the events that lowered it
                                                    during the period.
                                                </p>
                                                <p>
                                                    Start with the lowest scores. A few crashes weigh far more than many
                                                    harsh-driving events, so check which column is driving a low score before
                                                    acting on it.
                                                </p>
                                            </>
                                        }
                                    >
                                        <SafetyVehicleTable vehicles={report.safety.vehicles} />
                                    </Panel>
                                </>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
