import { useCallback, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { AlertCircle, CloudRain, Loader2 } from 'lucide-react'
import { generateWeatherReport } from '../../services/reportServices'
import InfoHint, { Formula, HowCalculated } from './InfoHint'
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

const RETRY_DELAY_MS = 5000

function isRetryable(err) {
	return err.status === undefined || [502, 503, 504].includes(err.status)
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

function Panel({ title, description, info, action, children }) {
	return (
		<section className="bg-white rounded-2xl border border-fleet-border shadow-sm">
			<div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-fleet-border">
				<div>
					<div className="flex items-center gap-1.5">
						<h3 className="text-sm font-semibold text-fleet-text">{title}</h3>
						{info && <InfoHint label={title}>{info}</InfoHint>}
					</div>
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
	info: PropTypes.node,
	action: PropTypes.node,
	children: PropTypes.node,
}

function ChartCaption({ title, info, children }) {
	return (
		<div className="mb-3">
			<div className="flex items-center gap-1.5">
				<p className="text-sm font-medium text-fleet-text">{title}</p>
				{info && <InfoHint label={title}>{info}</InfoHint>}
			</div>
			{children && <p className="text-xs text-fleet-secondary mt-0.5">{children}</p>}
		</div>
	)
}

ChartCaption.propTypes = { title: PropTypes.string.isRequired, info: PropTypes.node, children: PropTypes.node }

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

// Heading for a table or card row, with its reading guide next to it.
function SubHeading({ title, info, className = '' }) {
	return (
		<div className={`flex items-center gap-1.5 ${className}`}>
			<p className="text-sm font-medium text-fleet-text">{title}</p>
			{info && <InfoHint label={title}>{info}</InfoHint>}
		</div>
	)
}

SubHeading.propTypes = { title: PropTypes.string.isRequired, info: PropTypes.node, className: PropTypes.string }

// Formulas shared by several hints. Constants come from report.method where
// the backend sends them, so the text follows any change to the service.

function RateFormula() {
	return (
		<Formula
			label="Rate per 100 km"
			note="Each vehicle's daily km is split across areas by where its GPS showed it moving. Days with an event-data gap, and vehicles whose devices don't report that event, are left out of both the events and the km."
		>
			events ÷ km × 100
		</Formula>
	)
}

function RatioFormula({ what, minKm }) {
	return (
		<Formula
			label={`Ratio and likely range (${what})`}
			note={`The range is a 95% interval. If either count is 0, 0.5 is added to both so the range stays finite. It is only coloured when the whole range sits above or below 1, and only shown when there were at least ${minKm} km to compare against.`}
		>
			ratio = (events now ÷ km now) ÷ (events before ÷ km before)
			<br />
			range = ratio × e<sup>±1.96 × √(1/events now + 1/events before)</sup>
		</Formula>
	)
}

RatioFormula.propTypes = { what: PropTypes.string.isRequired, minKm: PropTypes.number.isRequired }

function VerdictFormula({ method }) {
	return (
		<Formula
			label="Above, below or in line"
			note={`P is the chance of a count at least that extreme if the true rate were the fleet's, treating events as random along the distance (Poisson). The ${method.alpha} cut-off is strict because many areas or vehicles are checked at once, so a few would cross a looser one by luck.`}
		>
			ratio = events ÷ fleet expects
			<br />
			Above fleet: ratio ≥ {method.highRatio} and P(this many or more) &lt; {method.alpha}
			<br />
			Below fleet: ratio ≤ {method.lowRatio} and P(this few or fewer) &lt; {method.alpha}
			<br />
			Too little data: fleet expects &lt; {method.minExpected}
		</Formula>
	)
}

VerdictFormula.propTypes = { method: PropTypes.object.isRequired }

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

function FleetCards({ fleet, reference, method }) {
	return (
		<div className="space-y-3">
			<SubHeading
				title="How often each event happens"
				info={
					<>
						<p>
							<strong>The large number</strong> is events per 100 km driven. Counting per km means vehicles
							that drive more don&apos;t look worse just because they drive more.
						</p>
						<p>
							<strong>Chance in any 10 km</strong> is how likely a vehicle is to log at least one of these
							events over a 10 km stretch.
						</p>
						<p>
							<strong>Days a vehicle logs at least one</strong> is the share of driving days with at least
							one event.
						</p>
						<p>
							<strong>Vs previous {reference.days} days</strong> compares with the {reference.days} days
							before this period: 1.25× means 25% more often. Red is clearly more, green clearly fewer, and
							grey means the difference could be chance. Hover the number to see its likely range.
						</p>
						<p>
							The industry reference is a rough outside figure for context, not a target. Vehicles whose
							devices never send an event type are left out of that event&apos;s figures rather than
							counted as perfect.
						</p>
						<HowCalculated>
							<RateFormula />
							<Formula
								label={`Chance in any ${method.probabilityKm} km`}
								note="Assumes events happen at random along the distance driven (a Poisson process)."
							>
								1 − e<sup>−rate × {method.probabilityKm} ÷ 100</sup>
							</Formula>
							<Formula label="Days a vehicle logs at least one">
								vehicle-days with ≥ 1 event ÷ vehicle-days with driving
							</Formula>
							<RatioFormula what={`vs previous ${reference.days} days`} minKm={method.minAreaKm} />
							<Formula label="Vehicle left out of an event">
								0 events where fleet rate × vehicle km ÷ 100 ≥ {method.notReportedMinExpected}
							</Formula>
							<Formula label="Industry reference">
								vendor rule of thumb of 8 per 100 miles ≈ 5 per 100 km
							</Formula>
						</HowCalculated>
					</>
				}
			/>
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

						{ev.benchmark && (
							<div className="mt-auto pt-3 text-xs text-fleet-secondary">
								<p title={ev.benchmark.source}>Industry reference ≈{fmt(ev.benchmark.ratePer100Km, 0)} per 100 km</p>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}

FleetCards.propTypes = {
	fleet: PropTypes.array.isRequired,
	reference: PropTypes.object.isRequired,
	method: PropTypes.object.isRequired,
}

function FleetChartsPanel({ fleet, reference }) {
	return (
		<Panel title="Event rates and trip risk">
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
				<div>
					<ChartCaption
						title="This period compared with the previous weeks"
						info={
							<>
								<p>
									Each pair of bars is one event type, in events per 100 km. The light bar is the
									previous {reference.days} days; the dark bar is this period.
								</p>
								<p>
									A dark bar clearly taller than its light bar means that event is happening more
									often than usual. Small week-to-week differences are normal; the cards above say
									whether a change is big enough to matter.
								</p>
								<HowCalculated>
									<Formula label="Dark bar (this period)">events ÷ km × 100, over this period</Formula>
									<Formula label={`Light bar (previous ${reference.days} days)`}>
										events ÷ km × 100, over the {reference.days} days before it
									</Formula>
								</HowCalculated>
							</>
						}
					>
						Events per 100 km, now and before.
					</ChartCaption>
					<RateComparisonChart fleet={fleet} referenceDays={reference.days} />
				</div>
				<div>
					<ChartCaption
						title="Chance of at least one event on a trip"
						info={
							<>
								<p>
									Find a trip length on the bottom axis and read up to each line. That height is the
									chance of at least one of that event on a trip that long, for a vehicle driving at
									the fleet&apos;s current rate.
								</p>
								<p>
									Longer trips always carry more chance, so compare the lines with each other rather
									than reading one on its own. Individual vehicles can sit well above or below the
									fleet.
								</p>
								<HowCalculated>
									<Formula
										label="Chance of at least one event"
										note="Rate is the fleet's events per 100 km for this period. Assumes events happen at random along the distance (Poisson)."
									>
										1 − e<sup>−rate × trip km ÷ 100</sup>
									</Formula>
								</HowCalculated>
							</>
						}
					>
						By trip length, at the fleet&apos;s current rate.
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
					{impact.window.fromDate} to {impact.window.toDate}: {fmt(impact.wetKm, 0)} km driven in rain on{' '}
					{impact.wetCalendarDays} rainy days.
				</>
			}
			info={
				<>
					<p>
						A wet day is a day with at least {method.wetThresholdMm} mm of rain in the area where the vehicle
						was driving. Everything else counts as dry.
					</p>
					<p>
						The badge on the right says how far to trust the result. With only a few rainy days, differences
						between wet and dry can easily be chance, so treat &quot;Indicative only&quot; as a hint and
						&quot;Too few wet days&quot; as no conclusion yet.
					</p>
					<HowCalculated>
						<Formula
							label="Wet day"
							note="Daily rainfall from Open-Meteo for the area's 0.1° weather cell (about 11 km across), on local South African days. Driving with no weather data counts as unknown and is left out of wet and dry."
						>
							rainfall that day ≥ {method.wetThresholdMm} mm
						</Formula>
						<Formula
							label="Period used"
							note="Rain is too rare in a single week to compare, so this section pools the report period with the weeks before it."
						>
							{impact.window.fromDate} to {impact.window.toDate}
						</Formula>
						<Formula
							label="Badge"
							note="An area-day is one area on one day. These thresholds are set in the backend service."
						>
							Too few wet days: wet km &lt; 200 or wet area-days &lt; 5
							<br />
							Indicative only: rainy days &lt; 10 or wet area-days &lt; 30
							<br />
							Enough wet days: otherwise
						</Formula>
					</HowCalculated>
				</>
			}
			action={<Badge className={reliability.className}>{reliability.label}</Badge>}
		>
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
				<div>
					<ChartCaption
						title="Events per 100 km, dry and wet"
						info={
								<>
									<p>
										Each event type has a dry bar and a wet bar. A taller wet bar means that event happens
										more often in the rain. The chart alongside shows whether the difference is big
										enough to trust.
									</p>
									<HowCalculated>
										<Formula label="Dry bar">dry-day events ÷ dry-day km × 100</Formula>
										<Formula label="Wet bar">wet-day events ÷ wet-day km × 100</Formula>
									</HowCalculated>
								</>
						}
					/>
					<WetDryChart impact={impact} />
				</div>
				<div>
					<ChartCaption
						title="How much higher on wet days"
						info={
							<>
								<p>
									Each dot is one event type. The dashed line means no difference; 1.5× means 50% more
									often in the wet. The line through a dot is its likely range: if it crosses the dashed
									line, the difference could be chance.
								</p>
								<p>
									&quot;All driving together&quot; compares all wet km with all dry km. &quot;Within the
									same area&quot; compares wet and dry driving in the same places, so rain that happens to
									fall where roads are riskier isn&apos;t mistaken for a weather effect. When the two
									disagree, go by &quot;Within the same area&quot;.
								</p>
								<HowCalculated>
									<Formula
										label="All driving together"
										note="The line through the dot is the same 95% range as the other comparisons in this report."
									>
										(wet events ÷ wet km) ÷ (dry events ÷ dry km)
									</Formula>
									<Formula
										label="Within the same area (Mantel–Haenszel)"
										note="For each area with both wet and dry driving: a = wet events, b = dry events, t₁ = wet km, t₀ = dry km, t = t₁ + t₀. Areas with only wet or only dry driving drop out. The range uses the Greenland–Robins variance."
									>
										ratio = Σ(a × t₀ ÷ t) ÷ Σ(b × t₁ ÷ t)
										<br />
										range = ratio × e<sup>±1.96 × SE</sup>
										<br />
										SE = √( Σ((a + b) × t₁ × t₀ ÷ t²) ÷ (Σ(a × t₀ ÷ t) × Σ(b × t₁ ÷ t)) )
									</Formula>
								</HowCalculated>
							</>
						}
					>
						Right of the dashed line means more events in the wet.
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
			description="Each dot is an area. Red areas log clearly more than the fleet; green ones clearly fewer."
			info={
				<>
					<p>
						Across is the km driven in the area; up is {eventLabel.toLowerCase()} per 100 km there. The dashed
						line is the fleet&apos;s rate.
					</p>
					<p>
						Colour matters more than height. An area is only red when it logs clearly more than the fleet
						would have over the same km in the same weather. A high dot with little driving can stay grey,
						because there isn&apos;t enough driving there to be sure.
					</p>
					<p>
						Areas with under {method.minAreaKm} km of driving are left out
						{lowExposure.areas ? ` (${lowExposure.areas} areas, ${fmt(lowExposure.km, 0)} km)` : ''}.
					</p>
					<HowCalculated>
						<Formula label="Dot height">area events ÷ area km × 100</Formula>
						<Formula
							label="Fleet expects"
							note="Summed over dry, wet and unknown weather, so an area driven mostly in the rain is compared with the fleet's wet-weather rate."
						>
							Σ (area km in that weather ÷ 100 × fleet rate in that weather)
						</Formula>
						<Formula
							label="Fleet rate in a weather condition"
							note={`Adds ${fmt(method.priorKm, 0)} km of driving at the fleet's overall rate, so a condition with little driving isn't swung by a handful of events. Unknown weather uses the overall rate.`}
						>
							(events + overall rate × {method.priorKm / 100}) ÷ ((km + {fmt(method.priorKm, 0)}) ÷ 100)
						</Formula>
						<VerdictFormula method={method} />
					</HowCalculated>
				</>
			}
		>
			<AreaScatterChart areas={visibleAreas} eventKey={eventKey} fleetRate={fleetRate} />

			<TableToggle label={`Show all ${visibleAreas.length} areas as a table`}>
				<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
					<SubHeading
						title="Areas"
						info={
							<>
								<p>
									<strong>Wet days</strong> is rainy days out of the days with weather data for that area.
								</p>
								<p>
									<strong>Events</strong> is what was logged there; <strong>Fleet expects</strong> is what
									the fleet&apos;s rate predicts for the same km and weather. The gap between the two is
									what matters.
								</p>
								<p>
									<strong>Compared with fleet</strong> turns that gap into a verdict: 2× means twice as
									many events as expected. &quot;Too little data&quot; means not enough driving to judge.
								</p>
								<p>
									<strong>Vs previous weeks</strong> compares the area with itself before this period:
									red is clearly more, green clearly fewer, grey could be chance.
								</p>
								<HowCalculated>
									<Formula label="Wet days">
										days with ≥ {method.wetThresholdMm} mm of rain ÷ days with weather data, in this period
									</Formula>
									<Formula label="Per 100 km">events ÷ recorded km × 100</Formula>
									<Formula label="Fleet expects and compared with fleet">
										as in the chart above: Σ (km × fleet rate in that weather ÷ 100), then events ÷ fleet expects
									</Formula>
									<RatioFormula what="vs previous weeks, same area" minKm={method.minAreaKm} />
								</HowCalculated>
							</>
						}
					/>
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

	return (
		<Panel
			title={`Vehicles compared with the fleet: ${eventLabel.toLowerCase()}`}
			description="Each dot is a vehicle. Dots above the dashed line logged more events than the fleet would have."
			info={
				<>
					<p>
						Across is how many events the fleet would log driving this vehicle&apos;s km, in the same areas
						and weather. Up is how many it actually logged. On the dashed line means the same as the fleet.
					</p>
					<p>
						Far above the line is worth a conversation with the driver. Far below is doing better than the
						fleet.
					</p>
					<p>
						A vehicle is only marked above or below when it differs by more than{' '}
						{Math.round((method.highRatio - 1) * 100)}% and the difference is very unlikely to be chance, so
						vehicles that drove little often stay unmarked. Vehicles whose devices never send this event
						type aren&apos;t plotted.
					</p>
					<HowCalculated>
						<Formula
							label="Fleet expects (across)"
							note="Summed over every area and weather condition the vehicle drove in."
						>
							Σ (vehicle km there ÷ 100 × rest-of-fleet rate there)
						</Formula>
						<Formula
							label="Rest-of-fleet rate in an area and weather"
							note={`The vehicle's own driving is taken out, so a vehicle that does most of the driving in an area isn't compared with itself. Adding ${fmt(method.priorKm, 0)} km at the fleet's rate for that weather keeps thinly driven areas from swinging the result.`}
						>
							(others&apos; events + fleet rate × {method.priorKm / 100}) ÷ ((others&apos; km + {fmt(method.priorKm, 0)}) ÷ 100)
						</Formula>
						<Formula label="Events logged (up)">the vehicle&apos;s events in the period</Formula>
						<VerdictFormula method={method} />
					</HowCalculated>
				</>
			}
		>
			<VehicleScatterChart vehicles={vehicles} eventKey={eventKey} />

			<div className="mt-6 flex flex-wrap items-center justify-between gap-3 mb-2">
				<SubHeading
					title="Vehicles to look at"
					info={
						<>
							<p>
								<strong>Mostly drove in</strong> is the area with the most km, plus how many other areas the
								vehicle visited. <strong>Driven wet</strong> is the share of its km in rain.
							</p>
							<p>
								<strong>Events</strong> against <strong>Fleet expects</strong> is the same comparison as the
								chart, as numbers. <strong>Compared with fleet</strong> gives the verdict and the ratio.
							</p>
							<p>
								By default only vehicles that clearly stand out are listed. Untick the box to see every
								vehicle.
							</p>
							<HowCalculated>
								<Formula label="Mostly drove in">the area with the most of the vehicle&apos;s km</Formula>
								<Formula label="Driven wet">km on wet days ÷ all km</Formula>
								<Formula label="Per 100 km">events ÷ recorded km × 100</Formula>
								<Formula label="Fleet expects and compared with fleet">
									as in the chart above: events ÷ fleet expects, with the same thresholds
								</Formula>
							</HowCalculated>
						</>
					}
				/>
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

function DailyPanel({ daily, eventKey, eventLabel, method }) {
	return (
		<Panel
			title="Day by day"
			description="The event rate each day, with how much of the driving was in rain."
			info={
				<>
					<p>
						The line is {eventLabel.toLowerCase()} per 100 km each day (left axis). The light bars are the
						share of that day&apos;s km driven in rain (right axis).
					</p>
					<p>
						If the line rises on days with tall bars, rain may be playing a part. &quot;Does rain change event
						rates?&quot; above tests that properly.
					</p>
					<p>
						Days marked &quot;No event data&quot; recorded far fewer events than their driving would
						produce, usually a device or data gap, so they are left out rather than shown as a false low.
					</p>
					<HowCalculated>
						<Formula label="Line">the day&apos;s events ÷ the day&apos;s km × 100</Formula>
						<Formula label="Bars">km on wet days ÷ all km that day</Formula>
						<Formula
							label="No event data"
							note="The normal rate is the median daily rate over days with at least 1,000 km of driving, across this period and the weeks before. The 1,000 km and 20-event limits are set in the backend service."
						>
							normal rate × km ÷ 100 ≥ 20 and events &lt; {method.gapRatio * 100}% of that
						</Formula>
					</HowCalculated>
				</>
			}
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
	method: PropTypes.object.isRequired,
	daily: PropTypes.array.isRequired,
	eventKey: PropTypes.string.isRequired,
	eventLabel: PropTypes.string.isRequired,
}

export default function WeatherAreaReport({ scopes, scopeValue, onScopeChange }) {
	const [days, setDays] = useState(7)
	const [eventKey, setEventKey] = useState('harsh_braking')
	const [report, setReport] = useState(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)

	const options = useMemo(() => scopeOptions(scopes), [scopes])

	const [retrying, setRetrying] = useState(false)

	const handleGenerate = useCallback(async () => {
		setLoading(true)
		setRetrying(false)
		setError(null)
		const [scopeType, scopeId] = scopeValue.split(':')
		const request = () => generateWeatherReport({
			scopeType: scopeType === 'vehicles' ? 'fleet' : scopeType,
			scopeId: scopeId || undefined,
			days,
		})

		try {
			let result
			try {
				result = await request()
			} catch (err) {
				if (!isRetryable(err)) throw err
				setRetrying(true)
				await wait(RETRY_DELAY_MS)
				result = await request()
			}
			setReport(result)
		} catch (err) {
			setError(err.message || 'Failed to generate weather report')
			setReport(null)
		} finally {
			setLoading(false)
			setRetrying(false)
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
					{loading ? (retrying ? 'Still working…' : 'Generating…') : 'Generate report'}
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

					{hasData && (
						<>
							<FleetCards fleet={report.fleet} reference={report.reference} method={report.method} />
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
							<DailyPanel daily={report.daily} eventKey={eventKey} eventLabel={eventLabel} method={report.method} />

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