import { useCallback, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { AlertCircle, CloudRain, Info, Loader2 } from 'lucide-react'
import { generateWeatherReport } from '../../services/reportServices'
import {
	AreaScatterChart,
	DailyChart,
	RateComparisonChart,
	TripProbabilityChart,
	VehicleScatterChart,
	WeatherRatioChart,
	WetDryChart,
} from '../ui/weatherCharts'

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7]

const STATUS = {
	above_fleet: { label: 'Above fleet', className: 'bg-red-50 text-red-700 border-red-200' },
	below_fleet: { label: 'Below fleet', className: 'bg-green-50 text-green-700 border-green-200' },
	in_line: { label: 'In line', className: 'bg-gray-50 text-fleet-secondary border-fleet-border' },
	insufficient_data: { label: 'Too little data', className: 'bg-white text-fleet-secondary border-fleet-border border-dashed' },
	not_reported: { label: 'Not reporting', className: 'bg-amber-50 text-amber-700 border-amber-200 border-dashed' },
}

const RELIABILITY = {
	reliable: { label: 'Enough wet days', className: 'bg-green-50 text-green-700 border-green-200' },
	indicative: { label: 'Indicative only', className: 'bg-amber-50 text-amber-700 border-amber-200' },
	insufficient: { label: 'Too few wet days', className: 'bg-gray-50 text-fleet-secondary border-fleet-border' },
}

const STATUS_ORDER = ['above_fleet', 'in_line', 'below_fleet', 'insufficient_data', 'not_reported']

function fmt(value, digits = 1) {
	if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
	return Number(value).toLocaleString('en-US', { maximumFractionDigits: digits })
}

function pct(value, digits = 0) {
	if (value === null || value === undefined) return '—'
	return `${(value * 100).toFixed(digits)}%`
}

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

function Panel({ title, description, action, children }) {
	return (
		<section className="bg-white rounded-2xl border border-fleet-border shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-fleet-border">
				<div>
					<h3 className="text-sm font-semibold text-fleet-text">{title}</h3>
					{description && <p className="text-xs text-fleet-secondary mt-1 max-w-2xl">{description}</p>}
				</div>
				{action}
			</div>
			<div className="p-5">{children}</div>
		</section>
	)
}

Panel.propTypes = {
	title: PropTypes.string.isRequired,
	description: PropTypes.node,
	action: PropTypes.node,
	children: PropTypes.node,
}

function ChartCaption({ title, children }) {
	return (
		<div className="mb-3">
			<p className="text-sm font-medium text-fleet-text">{title}</p>
			{children && <p className="text-xs text-fleet-secondary mt-0.5">{children}</p>}
		</div>
	)
}

ChartCaption.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node }

function TableToggle({ label, children, defaultOpen = false }) {
	return (
		<details className="mt-5 group" open={defaultOpen}>
			<summary className="cursor-pointer select-none text-sm font-medium text-fleet-blue hover:underline">
				{label}
			</summary>
			<div className="mt-3">{children}</div>
		</details>
	)
}

TableToggle.propTypes = { label: PropTypes.string.isRequired, children: PropTypes.node, defaultOpen: PropTypes.bool }

function Badge({ className, children }) {
	return (
		<span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${className}`}>
			{children}
		</span>
	)
}

Badge.propTypes = { className: PropTypes.string, children: PropTypes.node }

function StatusBadge({ status }) {
	const s = STATUS[status] || STATUS.in_line
	return <Badge className={s.className}>{s.label}</Badge>
}

StatusBadge.propTypes = { status: PropTypes.string }

// Ratio of two rates. Red when clearly higher, green when clearly lower,
// grey when the difference could be chance.
function Ratio({ comparison }) {
	if (!comparison || comparison.ratio === null) {
		return <span className="text-fleet-secondary">—</span>
	}
	const { ratio, low, high, significant } = comparison
	let tone = 'text-fleet-secondary'
	if (significant) tone = ratio > 1 ? 'text-red-600' : 'text-fleet-green'
	return (
		<span className={`font-medium ${tone}`} title={`Likely range ${fmt(low, 2)}–${fmt(high, 2)}×`}>
			{fmt(ratio, 2)}×
		</span>
	)
}

Ratio.propTypes = { comparison: PropTypes.object }

function Th({ children, align = 'left' }) {
	return (
		<th className={`px-3 py-2 text-xs font-semibold text-fleet-secondary whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}>
			{children}
		</th>
	)
}

Th.propTypes = { children: PropTypes.node, align: PropTypes.string }

function Td({ children, align = 'left', className = '' }) {
	return (
		<td className={`px-3 py-2 text-sm text-fleet-text whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}>
			{children}
		</td>
	)
}

Td.propTypes = { children: PropTypes.node, align: PropTypes.string, className: PropTypes.string }

// ---------------------------------------------------------------------------

function FleetCards({ fleet, reference }) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
			{fleet.map((ev) => (
				<div key={ev.key} className="bg-white rounded-2xl border border-fleet-border shadow-sm p-5 flex flex-col">
					<p className="text-sm font-medium text-fleet-text">{ev.label}</p>
					{ev.note && <p className="text-xs text-fleet-secondary">{ev.note}</p>}

					<p className="mt-3 text-3xl font-bold text-fleet-text leading-none">
						{fmt(ev.ratePer100Km, 1)}
						<span className="ml-1 text-sm font-normal text-fleet-secondary">per 100 km</span>
					</p>

					<dl className="mt-4 space-y-1.5 text-xs">
						<div className="flex justify-between gap-2">
							<dt className="text-fleet-secondary">Chance in any 10 km</dt>
							<dd className="font-medium text-fleet-text">{pct(ev.pPer10Km)}</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt className="text-fleet-secondary">Days a vehicle logs at least one</dt>
							<dd className="font-medium text-fleet-text">{pct(ev.pPerVehicleDay)}</dd>
						</div>
						<div className="flex justify-between gap-2">
							<dt className="text-fleet-secondary" title={`${reference.fromDate} to ${reference.toDate}`}>
								Vs previous {reference.days} days
							</dt>
							<dd><Ratio comparison={ev.vsReference} /></dd>
						</div>
					</dl>

					{(ev.benchmark || ev.vehiclesNotReporting > 0) && (
						<div className="mt-auto pt-3 space-y-1 text-xs text-fleet-secondary">
							{ev.benchmark && (
								<p title={ev.benchmark.source}>Industry reference ≈{fmt(ev.benchmark.ratePer100Km, 0)} per 100 km</p>
							)}
							{ev.vehiclesNotReporting > 0 && (
								<p className="text-amber-700">
									{ev.vehiclesNotReporting} {ev.vehiclesNotReporting === 1 ? 'vehicle' : 'vehicles'} not reporting
								</p>
							)}
						</div>
					)}
				</div>
			))}
		</div>
	)
}

FleetCards.propTypes = { fleet: PropTypes.array.isRequired, reference: PropTypes.object.isRequired }

function FleetChartsPanel({ fleet, reference }) {
	return (
		<Panel title="Event rates and trip risk">
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
				<div>
					<ChartCaption title="This period compared with the previous weeks">
						Events per 100 km. Taller dark bars mean more events than usual.
					</ChartCaption>
					<RateComparisonChart fleet={fleet} referenceDays={reference.days} />
				</div>
				<div>
					<ChartCaption title="Chance of at least one event on a trip">
						For a vehicle driving at the fleet&apos;s current rate. Read across from a trip length to see the chance.
					</ChartCaption>
					<TripProbabilityChart fleet={fleet} />
				</div>
			</div>
		</Panel>
	)
}

FleetChartsPanel.propTypes = { fleet: PropTypes.array.isRequired, reference: PropTypes.object.isRequired }

function WeatherImpact({ impact, method }) {
	const reliability = RELIABILITY[impact.reliability] || RELIABILITY.insufficient
	return (
		<Panel
			title="Does rain change event rates?"
			description={
				<>
					{impact.window.fromDate} to {impact.window.toDate}. A wet day has at least {method.wetThresholdMm} mm
					of rain in that area. {fmt(impact.wetKm, 0)} km were driven wet, on {impact.wetCalendarDays} rainy days.
				</>
			}
			action={<Badge className={reliability.className}>{reliability.label}</Badge>}
		>
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
				<div>
					<ChartCaption title="Events per 100 km, dry and wet" />
					<WetDryChart impact={impact} />
				</div>
				<div>
					<ChartCaption title="How much higher on wet days">
						Dots right of the dashed line mean more events in the wet. The line through each dot is the likely
						range; if it crosses the dashed line, the difference could be chance. The blue dots compare wet and
						dry driving within the same area, so rain that happens to fall on riskier areas is not mistaken for
						a weather effect.
					</ChartCaption>
					<WeatherRatioChart impact={impact} />
				</div>
			</div>

			<TableToggle label="Show the numbers">
				<div className="overflow-x-auto">
					<table className="min-w-full">
						<thead className="border-b border-fleet-border">
							<tr>
								<Th>Event</Th>
								<Th align="right">Dry, per 100 km</Th>
								<Th align="right">Wet, per 100 km</Th>
								<Th align="right">Wet vs dry, all driving</Th>
								<Th align="right">Wet vs dry, same area</Th>
							</tr>
						</thead>
						<tbody className="divide-y divide-fleet-border">
							{impact.events.map((ev) => (
								<tr key={ev.key}>
									<Td>{ev.label}</Td>
									<Td align="right">{fmt(ev.dryRatePer100Km, 2)}</Td>
									<Td align="right">{fmt(ev.wetRatePer100Km, 2)}</Td>
									<Td align="right"><Ratio comparison={ev.crude} /></Td>
									<Td align="right"><Ratio comparison={ev.areaAdjusted} /></Td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</TableToggle>
		</Panel>
	)
}

WeatherImpact.propTypes = { impact: PropTypes.object.isRequired, method: PropTypes.object.isRequired }

function AreasPanel({ areas, eventKey, eventLabel, fleetRate, lowExposure, truncated, method }) {
	const [sortBy, setSortBy] = useState('km')

	// Areas where this event was barely recorded (for example, only
	// non-reporting vehicles drove there) have no meaningful rate, so they
	// are left out rather than shown as zero.
	const visibleAreas = useMemo(() => areas.filter((a) => {
		const m = a.metrics[eventKey]
		return m.ratePer100Km !== null && (m.recordedKm ?? a.km) >= method.minAreaKm
	}), [areas, eventKey, method.minAreaKm])
	const hiddenAreas = areas.length - visibleAreas.length

	const sorted = useMemo(() => {
		const list = [...visibleAreas]
		if (sortBy === 'rate') {
			list.sort((a, b) => (b.metrics[eventKey].ratePer100Km ?? -1) - (a.metrics[eventKey].ratePer100Km ?? -1))
		} else if (sortBy === 'ratio') {
			list.sort((a, b) => (b.metrics[eventKey].ratio ?? -1) - (a.metrics[eventKey].ratio ?? -1))
		} else {
			list.sort((a, b) => b.km - a.km)
		}
		return list
	}, [visibleAreas, eventKey, sortBy])

	return (
		<Panel
			title={`Areas: ${eventLabel.toLowerCase()}`}
			description={`Each dot is an area. Red areas log clearly more than the fleet would over the same km in the same weather; green ones clearly fewer. Areas with under ${method.minAreaKm} km of driving are left out${lowExposure.areas ? ` (${lowExposure.areas} areas, ${fmt(lowExposure.km, 0)} km)` : ''}.`}
		>
			<AreaScatterChart areas={visibleAreas} eventKey={eventKey} fleetRate={fleetRate} />
			{hiddenAreas > 0 && (
				<p className="mt-2 text-xs text-fleet-secondary">
					{hiddenAreas} {hiddenAreas === 1 ? 'area is' : 'areas are'} not shown because too little of the driving there recorded {eventLabel.toLowerCase()} events.
				</p>
			)}

			<TableToggle label={`Show all ${visibleAreas.length} areas as a table`}>
				<div className="flex justify-end mb-2">
					<label className="flex items-center gap-2 text-xs text-fleet-secondary">
						Sort by
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value)}
							className="border border-fleet-border rounded-md px-2 py-1 text-xs text-fleet-text bg-white"
						>
							<option value="km">Distance driven</option>
							<option value="rate">Rate per 100 km</option>
							<option value="ratio">Compared with fleet</option>
						</select>
					</label>
				</div>
				<div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
					<table className="min-w-full">
						<thead className="border-b border-fleet-border sticky top-0 bg-white">
							<tr>
								<Th>Area</Th>
								<Th align="right">Km</Th>
								<Th align="right">Vehicles</Th>
								<Th align="right">Wet days</Th>
								<Th align="right">Events</Th>
								<Th align="right">Fleet expects</Th>
								<Th align="right">Per 100 km</Th>
								<Th>Compared with fleet</Th>
								<Th align="right">Vs previous weeks</Th>
							</tr>
						</thead>
						<tbody className="divide-y divide-fleet-border">
							{sorted.map((area) => {
								const m = area.metrics[eventKey]
								return (
									<tr key={area.areaId}>
										<Td>
											<span className="font-medium">{area.name}</span>
											{area.city && area.kind === 'suburb' && (
												<span className="block text-xs text-fleet-secondary">{area.city}</span>
											)}
										</Td>
										<Td align="right">{fmt(area.km, 0)}</Td>
										<Td align="right">{area.vehicles}</Td>
										<Td align="right">
											{area.weather ? `${area.weather.wetDays} of ${area.weather.daysWithData}` : '—'}
										</Td>
										<Td align="right">{fmt(m.observed, 0)}</Td>
										<Td align="right">{fmt(m.expected, 0)}</Td>
										<Td align="right">{fmt(m.ratePer100Km, 2)}</Td>
										<Td>
											<span className="flex items-center gap-2">
												<StatusBadge status={m.status} />
												{m.ratio !== null && <span className="text-xs text-fleet-secondary">{fmt(m.ratio, 2)}×</span>}
											</span>
										</Td>
										<Td align="right"><Ratio comparison={m.vsReference} /></Td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
				{truncated && (
					<p className="mt-3 text-xs text-fleet-secondary">Showing the areas with the most driving.</p>
				)}
			</TableToggle>
		</Panel>
	)
}

AreasPanel.propTypes = {
	areas: PropTypes.array.isRequired,
	eventKey: PropTypes.string.isRequired,
	eventLabel: PropTypes.string.isRequired,
	fleetRate: PropTypes.number,
	lowExposure: PropTypes.object.isRequired,
	truncated: PropTypes.bool,
	method: PropTypes.object.isRequired,
}

function VehiclesPanel({ vehicles, eventKey, eventLabel, method }) {
	const [flaggedOnly, setFlaggedOnly] = useState(true)

	const rows = useMemo(() => {
		const list = vehicles.filter((v) => {
			const status = v.metrics[eventKey].status
			if (status === 'not_reported') return false
			return !flaggedOnly || status === 'above_fleet' || status === 'below_fleet'
		})
		list.sort((a, b) => {
			const ma = a.metrics[eventKey]
			const mb = b.metrics[eventKey]
			return STATUS_ORDER.indexOf(ma.status) - STATUS_ORDER.indexOf(mb.status)
				|| (mb.ratio ?? -1) - (ma.ratio ?? -1)
		})
		return list
	}, [vehicles, eventKey, flaggedOnly])

	const notReporting = vehicles.filter((v) => v.metrics[eventKey].status === 'not_reported').length

	return (
		<Panel
			title={`Vehicles compared with the fleet: ${eventLabel.toLowerCase()}`}
			description={`Each dot is a vehicle. Dots above the dashed line logged more events than the rest of the fleet would have, driving the same km in the same areas and weather. A vehicle is only marked above or below when it differs by more than ${Math.round((method.highRatio - 1) * 100)}% and the difference is very unlikely to be chance.`}
		>
			<VehicleScatterChart vehicles={vehicles} eventKey={eventKey} />
			{notReporting > 0 && (
				<p className="mt-2 text-xs text-amber-700">
					{notReporting} {notReporting === 1 ? 'vehicle is' : 'vehicles are'} not shown because {notReporting === 1 ? 'its device reports' : 'their devices report'} no {eventLabel.toLowerCase()} events at all.
				</p>
			)}

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
				<table className="min-w-full">
					<thead className="border-b border-fleet-border sticky top-0 bg-white">
						<tr>
							<Th>Vehicle</Th>
							<Th>Mostly drove in</Th>
							<Th align="right">Km</Th>
							<Th align="right">Driven wet</Th>
							<Th align="right">Events</Th>
							<Th align="right">Fleet expects</Th>
							<Th align="right">Per 100 km</Th>
							<Th>Compared with fleet</Th>
						</tr>
					</thead>
					<tbody className="divide-y divide-fleet-border">
						{rows.map((v) => {
							const m = v.metrics[eventKey]
							return (
								<tr key={v.vehicleId}>
									<Td className="font-medium">{v.vehicleId}</Td>
									<Td>
										{v.mainArea || '—'}
										{v.areasVisited > 1 && (
											<span className="text-xs text-fleet-secondary"> +{v.areasVisited - 1} more</span>
										)}
									</Td>
									<Td align="right">{fmt(v.km, 0)}</Td>
									<Td align="right">{pct(v.wetKmShare)}</Td>
									<Td align="right">{fmt(m.observed, 0)}</Td>
									<Td align="right">{fmt(m.expected, 0)}</Td>
									<Td align="right">{fmt(m.ratePer100Km, 2)}</Td>
									<Td>
										<span className="flex items-center gap-2">
											<StatusBadge status={m.status} />
											{m.ratio !== null && <span className="text-xs text-fleet-secondary">{fmt(m.ratio, 2)}×</span>}
										</span>
									</Td>
								</tr>
							)
						})}
						{rows.length === 0 && (
							<tr>
								<td colSpan={8} className="px-3 py-6 text-center text-sm text-fleet-secondary">
									No vehicle differs clearly from the fleet for this event.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Panel>
	)
}

VehiclesPanel.propTypes = {
	vehicles: PropTypes.array.isRequired,
	eventKey: PropTypes.string.isRequired,
	eventLabel: PropTypes.string.isRequired,
	method: PropTypes.object.isRequired,
}

function DailyPanel({ daily, eventKey, eventLabel }) {
	return (
		<Panel
			title="Day by day"
			description="The line is the event rate; the light bars show how much of the day's driving was in the rain. Days marked 'No event data' recorded far fewer events than the driving would produce, so they are left out."
		>
			<DailyChart daily={daily} eventKey={eventKey} eventLabel={eventLabel} />

			<TableToggle label="Show the numbers">
				<div className="overflow-x-auto">
					<table className="min-w-full">
						<thead className="border-b border-fleet-border">
							<tr>
								<Th>Day</Th>
								<Th align="right">Km</Th>
								<Th align="right">Driven wet</Th>
								<Th align="right">{eventLabel}</Th>
								<Th align="right">Per 100 km</Th>
							</tr>
						</thead>
						<tbody className="divide-y divide-fleet-border">
							{daily.map((d) => {
								const gap = d.gaps.includes(eventKey)
								return (
									<tr key={d.day} className={gap ? 'text-fleet-secondary' : ''}>
										<Td>{d.day}</Td>
										<Td align="right">{fmt(d.km, 0)}</Td>
										<Td align="right">{pct(d.wetKmShare)}</Td>
										<Td align="right">{fmt(d.events[eventKey], 0)}</Td>
										<Td align="right">{gap ? 'No event data' : fmt(d.ratesPer100Km[eventKey], 2)}</Td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			</TableToggle>
		</Panel>
	)
}

DailyPanel.propTypes = {
	daily: PropTypes.array.isRequired,
	eventKey: PropTypes.string.isRequired,
	eventLabel: PropTypes.string.isRequired,
}

// ---------------------------------------------------------------------------

export default function WeatherAreaReport({ scopes, scopeValue, onScopeChange }) {
	const [days, setDays] = useState(7)
	const [eventKey, setEventKey] = useState('harsh_braking')
	const [report, setReport] = useState(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)

	const options = useMemo(() => scopeOptions(scopes), [scopes])

	const handleGenerate = useCallback(async () => {
		setLoading(true)
		setError(null)
		const [scopeType, scopeId] = scopeValue.split(':')
		try {
			const result = await generateWeatherReport({
				scopeType: scopeType === 'vehicles' ? 'fleet' : scopeType,
				scopeId: scopeId || undefined,
				days,
			})
			setReport(result)
		} catch (err) {
			setError(err.message || 'Failed to generate weather report')
			setReport(null)
		} finally {
			setLoading(false)
		}
	}, [scopeValue, days])

	const events = report?.events || []
	const eventLabel = events.find((e) => e.key === eventKey)?.label || 'Events'
	const fleetRate = report?.fleet.find((f) => f.key === eventKey)?.ratePer100Km ?? null
	const hasData = report && report.fleet.length > 0

	return (
		<div className="space-y-6">
			<div className="bg-white rounded-2xl border border-fleet-border shadow-sm p-4 flex flex-wrap items-end gap-4">
				<label className="flex flex-col gap-1 text-xs font-medium text-fleet-secondary">
					Vehicles
					<select
						value={scopeValue}
						onChange={(e) => onScopeChange(e.target.value)}
						className="border border-fleet-border rounded-lg px-3 py-2 text-sm text-fleet-text bg-white min-w-[12rem]"
					>
						<option value="fleet">Whole fleet</option>
						{options.groups.length > 0 && (
							<optgroup label="Fleet groups">
								{options.groups.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
							</optgroup>
						)}
						{options.vehicles.length > 0 && (
							<optgroup label="Single vehicle">
								{options.vehicles.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
							</optgroup>
						)}
					</select>
				</label>

				<fieldset className="flex flex-col gap-1">
					<legend className="text-xs font-medium text-fleet-secondary mb-1">Days to report</legend>
					<div className="inline-flex rounded-lg border border-fleet-border overflow-hidden">
						{DAY_OPTIONS.map((d) => (
							<button
								key={d}
								type="button"
								onClick={() => setDays(d)}
								aria-pressed={days === d}
								className={`w-9 py-2 text-sm font-medium border-r border-fleet-border last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-fleet-blue ${
									days === d ? 'bg-fleet-blue text-white' : 'bg-white text-fleet-text hover:bg-fleet-blue/5'
								}`}
							>
								{d}
							</button>
						))}
					</div>
				</fieldset>

				{events.length > 0 && (
					<label className="flex flex-col gap-1 text-xs font-medium text-fleet-secondary">
						Event for areas, vehicles and days
						<select
							value={eventKey}
							onChange={(e) => setEventKey(e.target.value)}
							className="border border-fleet-border rounded-lg px-3 py-2 text-sm text-fleet-text bg-white"
						>
							{events.map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
						</select>
					</label>
				)}

				<button
					type="button"
					onClick={handleGenerate}
					disabled={loading}
					className="ml-auto flex items-center gap-2 rounded-lg bg-fleet-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
				>
					{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudRain className="w-4 h-4" />}
					{loading ? 'Generating…' : 'Generate report'}
				</button>
			</div>

			{error && (
				<div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
					<AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
					<p className="text-sm font-medium text-red-700">{error}</p>
				</div>
			)}

			{!report && !loading && !error && (
				<p className="text-sm text-fleet-secondary py-10 text-center">
					Choose the vehicles and how many days to cover, then generate the report.
				</p>
			)}

			{report && (
				<div className="space-y-5">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<div>
							<h2 className="text-lg font-semibold text-fleet-text">{report.report.scope.label}</h2>
							<p className="text-sm text-fleet-secondary">
								{report.period.fromDate} to {report.period.toDate} ({report.period.days} {report.period.days === 1 ? 'day' : 'days'})
							</p>
						</div>
						{report.coverage && (
							<p className="text-xs text-fleet-secondary">
								{report.coverage.vehiclesWithDriving} of {report.coverage.vehiclesInScope} vehicles drove{' '}
								{fmt(report.coverage.periodKm, 0)} km in {report.coverage.areasVisited} areas,{' '}
								{pct(report.coverage.wetKmShare)} of it in the wet
							</p>
						)}
					</div>

					{/* {report.warnings.length > 0 && (
						<div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
							<AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
							<ul className="text-sm text-amber-800 space-y-1">
								{report.warnings.map((w) => <li key={w}>{w}</li>)}
							</ul>
						</div>
					)} */}

					{hasData && (
						<>
							<FleetCards fleet={report.fleet} reference={report.reference} />
							<FleetChartsPanel fleet={report.fleet} reference={report.reference} />
							<WeatherImpact impact={report.weatherImpact} method={report.method} />
							<AreasPanel
								areas={report.areas}
								eventKey={eventKey}
								eventLabel={eventLabel}
								fleetRate={fleetRate}
								lowExposure={report.lowExposureAreas}
								truncated={report.areasTruncated}
								method={report.method}
							/>
							<VehiclesPanel
								vehicles={report.vehicles}
								eventKey={eventKey}
								eventLabel={eventLabel}
								method={report.method}
							/>
							<DailyPanel daily={report.daily} eventKey={eventKey} eventLabel={eventLabel} />

						</>
					)}
				</div>
			)}
		</div>
	)
}

WeatherAreaReport.propTypes = {
	scopes: PropTypes.shape({
		groups: PropTypes.array,
		vehicles: PropTypes.array,
	}).isRequired,
	scopeValue: PropTypes.string.isRequired,
	onScopeChange: PropTypes.func.isRequired,
}