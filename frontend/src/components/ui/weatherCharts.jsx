import PropTypes from 'prop-types'
import {
	Bar,
	BarChart,
	CartesianGrid,
	ComposedChart,
	ErrorBar,
	Legend,
	Line,
	LineChart,
	ReferenceLine,
	ResponsiveContainer,
	Scatter,
	ScatterChart,
	Tooltip,
	XAxis,
	YAxis,
	ZAxis,
} from 'recharts'

// Colour carries meaning here, so it is used the same way in every chart:
// blue is wet, sand is dry, red/green are worse/better than the fleet.
export const CHART_COLORS = {
	navy: '#1B3A5C',
	previous: '#A7B4C4',
	wet: '#2F6FB2',
	dry: '#C9A04E',
	wetFill: '#D6E4F3',
	above: '#DC2626',
	below: '#16A34A',
	inLine: '#94A3B8',
	insufficient: '#CBD5E1',
	grid: '#E5E7EB',
	axis: '#6B7280',
}

export const EVENT_COLORS = {
	harsh_braking: '#1B3A5C',
	harsh_acceleration: '#2F6FB2',
	harsh_cornering: '#7FA3CC',
	over_speeding: '#C9A04E',
	crash_alerts: '#8B8B93',
}

const STATUS_SERIES = [
	{ status: 'above_fleet', name: 'Above fleet', color: CHART_COLORS.above },
	{ status: 'in_line', name: 'In line with fleet', color: CHART_COLORS.inLine },
	{ status: 'below_fleet', name: 'Below fleet', color: CHART_COLORS.below },
	{ status: 'insufficient_data', name: 'Too little data', color: CHART_COLORS.insufficient },
]

const AXIS_PROPS = {
	stroke: CHART_COLORS.axis,
	tick: { fontSize: 12, fill: CHART_COLORS.axis },
	tickLine: false,
}

function niceNumber(v) {
	if (v < 1) return Math.round(v)
	const mag = 10 ** Math.floor(Math.log10(v))
	const n = v / mag
	return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag
}

function sqrtTicks(max, count = 5) {
	const out = new Set([0])
	for (let i = 1; i < count; i += 1) out.add(niceNumber(max * (i / (count - 1)) ** 2))
	return [...out].filter((t) => t <= max).sort((a, b) => a - b)
}

function zeroSafeMax(dataMax) {
	if (!Number.isFinite(dataMax) || dataMax <= 0) return 1
	const mag = 10 ** Math.floor(Math.log10(dataMax))
	return Math.ceil(dataMax / mag) * mag
}

function fmt(value, digits = 1) {
	if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
	return Number(value).toLocaleString('en-US', { maximumFractionDigits: digits })
}

function fmtKm(value) {
	if (value >= 1000) return `${fmt(value / 1000, value >= 10000 ? 0 : 1)}k`
	return fmt(value, 0)
}

function TooltipBox({ title, rows }) {
	return (
		<div className="rounded-lg border border-fleet-border bg-white px-3 py-2 shadow-sm text-xs">
			{title && <p className="font-semibold text-fleet-text mb-1">{title}</p>}
			{rows.map(([label, value]) => (
				<p key={label} className="flex justify-between gap-4 text-fleet-secondary">
					<span>{label}</span>
					<span className="font-medium text-fleet-text">{value}</span>
				</p>
			))}
		</div>
	)
}

TooltipBox.propTypes = {
	title: PropTypes.node,
	rows: PropTypes.arrayOf(PropTypes.array).isRequired,
}

function ChartFrame({ height = 280, children }) {
	return (
		<div style={{ width: '100%', height }}>
			<ResponsiveContainer width="100%" height="100%">
				{children}
			</ResponsiveContainer>
		</div>
	)
}

ChartFrame.propTypes = { height: PropTypes.number, children: PropTypes.node }

// This period vs the previous 28 days, per event

export function RateComparisonChart({ fleet, referenceDays }) {
	const data = fleet.map((ev) => ({
		label: ev.shortLabel,
		previous: ev.referenceRatePer100Km,
		current: ev.ratePer100Km,
	}))

	return (
		<ChartFrame>
			<BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barGap={2}>
				<CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
				<XAxis dataKey="label" {...AXIS_PROPS} interval={0} />
				<YAxis
					{...AXIS_PROPS}
					axisLine={false}
					domain={[0, zeroSafeMax]}
				/>
				<Tooltip
					cursor={{ fill: '#F3F4F6' }}
					content={({ active, payload }) => (active && payload?.length ? (
						<TooltipBox
							title={payload[0].payload.label}
							rows={payload.map((p) => [p.name, `${fmt(p.value, 2)} per 100 km`])}
						/>
					) : null)}
				/>
				<Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
				<Bar dataKey="previous" name={`Previous ${referenceDays} days`} fill={CHART_COLORS.previous} radius={[3, 3, 0, 0]} />
				<Bar dataKey="current" name="This period" fill={CHART_COLORS.navy} radius={[3, 3, 0, 0]} />
			</BarChart>
		</ChartFrame>
	)
}

RateComparisonChart.propTypes = {
	fleet: PropTypes.array.isRequired,
	referenceDays: PropTypes.number.isRequired,
}

// Chance of at least one event by trip length

const TRIP_KM = Array.from({ length: 26 }, (_, i) => i * 2)

export function TripProbabilityChart({ fleet }) {
	const data = TRIP_KM.map((km) => {
		const point = { km }
		for (const ev of fleet) {
			point[ev.key] = ev.ratePer100Km === null
				? null
				: Math.round(1000 * (1 - Math.exp(-ev.ratePer100Km * (km / 100)))) / 10
		}
		return point
	})

	return (
		<ChartFrame>
			<LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
				<CartesianGrid stroke={CHART_COLORS.grid} />
				<XAxis
					dataKey="km"
					type="number"
					domain={[0, 50]}
					ticks={[0, 10, 20, 30, 40, 50]}
					tickFormatter={(v) => `${v} km`}
					{...AXIS_PROPS}
				/>
				<YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} {...AXIS_PROPS} axisLine={false} />
				<Tooltip
					content={({ active, payload, label }) => (active && payload?.length ? (
						<TooltipBox
							title={`Trip of ${label} km`}
							rows={payload.map((p) => [p.name, `${fmt(p.value, 0)}%`])}
						/>
					) : null)}
				/>
				<Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
				{fleet.map((ev) => (
					<Line
						key={ev.key}
						type="monotone"
						dataKey={ev.key}
						name={ev.shortLabel}
						stroke={EVENT_COLORS[ev.key]}
						strokeWidth={2}
						dot={false}
					/>
				))}
			</LineChart>
		</ChartFrame>
	)
}

TripProbabilityChart.propTypes = { fleet: PropTypes.array.isRequired }

// Dry vs wet rates, per event

export function WetDryChart({ impact }) {
	const data = impact.events.map((ev) => ({
		label: ev.shortLabel,
		dry: ev.dryRatePer100Km,
		wet: ev.wetRatePer100Km,
	}))

	return (
		<ChartFrame>
			<BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barGap={2}>
				<CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
				<XAxis dataKey="label" {...AXIS_PROPS} interval={0} />
				<YAxis
					{...AXIS_PROPS}
					axisLine={false}
					domain={[0, zeroSafeMax]}
				/>
				<Tooltip
					cursor={{ fill: '#F3F4F6' }}
					content={({ active, payload }) => (active && payload?.length ? (
						<TooltipBox
							title={payload[0].payload.label}
							rows={payload.map((p) => [p.name, `${fmt(p.value, 2)} per 100 km`])}
						/>
					) : null)}
				/>
				<Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
				<Bar dataKey="dry" name="Dry days" fill={CHART_COLORS.dry} radius={[3, 3, 0, 0]} />
				<Bar dataKey="wet" name="Wet days" fill={CHART_COLORS.wet} radius={[3, 3, 0, 0]} />
			</BarChart>
		</ChartFrame>
	)
}

WetDryChart.propTypes = { impact: PropTypes.object.isRequired }

// Wet vs dry ratios with 95% intervals (dot-and-whisker)

const RATIO_TICKS = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 10, 25, 50, 100]

function ratioPoint(ev, comparison, index, offset, series) {
	if (!comparison) return null
	const low = Number.isFinite(comparison.low) ? comparison.low : 0
	const high = Number.isFinite(comparison.high) ? comparison.high : comparison.ratio
	return {
		x: comparison.ratio,
		y: index + offset,
		err: [comparison.ratio - low, high - comparison.ratio],
		label: ev.label,
		series,
		low,
		high,
		significant: comparison.significant,
	}
}

export function WeatherRatioChart({ impact }) {
	const events = impact.events
	const overall = events.map((ev, i) => ratioPoint(ev, ev.crude, i, -0.14, 'All driving together')).filter(Boolean)
	const sameArea = events.map((ev, i) => ratioPoint(ev, ev.areaAdjusted, i, 0.14, 'Within the same area')).filter(Boolean)
	const all = [...overall, ...sameArea]

	if (all.length === 0) {
		return <p className="text-sm text-fleet-secondary py-10 text-center">Not enough wet and dry driving to compare.</p>
	}

	const MIN_RATIO = 0.01
	const MAX_RATIO = 100
	const values = all.flatMap((p) => [p.x, p.low, p.high]).filter((v) => Number.isFinite(v) && v > 0)
	const lo = Math.max(MIN_RATIO, Math.min(1, ...values) * 0.8)
	const hi = Math.min(MAX_RATIO, Math.max(1, ...values) * 1.25)
	const ticks = RATIO_TICKS.filter((t) => t >= lo && t <= hi)

	const clip = (p) => ({
		...p,
		err: [p.x - Math.max(p.low, lo), Math.min(p.high, hi) - p.x],
	})
	const overallPlot = overall.map(clip)
	const sameAreaPlot = sameArea.map(clip)

	return (
		<ChartFrame height={Math.max(240, events.length * 52 + 24)}>
			<ScatterChart margin={{ top: 28, right: 16, bottom: 0, left: 8 }}>
				<CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
				<XAxis
					type="number"
					dataKey="x"
					scale="log"
					domain={[lo, hi]}
					ticks={ticks}
					tickFormatter={(v) => `${v}×`}
					allowDataOverflow
					{...AXIS_PROPS}
				/>
				<YAxis
					type="number"
					dataKey="y"
					domain={[-0.5, events.length - 0.5]}
					ticks={events.map((_, i) => i)}
					tickFormatter={(i) => events[i]?.shortLabel ?? ''}
					reversed
					width={92}
					interval={0}
					{...AXIS_PROPS}
					axisLine={false}
				/>
				<ZAxis range={[60, 60]} />
				<ReferenceLine
					x={1}
					stroke={CHART_COLORS.axis}
					strokeDasharray="4 4"
					label={{ value: 'No difference', position: 'top', fontSize: 11, fill: CHART_COLORS.axis }}
				/>
				<Tooltip
					cursor={false}
					content={({ active, payload }) => {
						if (!active || !payload?.length) return null
						const p = payload[0].payload
						return (
							<TooltipBox
								title={`${p.label}: ${p.series.toLowerCase()}`}
								rows={[
									['Wet vs dry', `${fmt(p.x, 2)}×`],
									['Likely range', `${fmt(p.low, 2)}–${fmt(p.high, 2)}×`],
									['Clear difference', p.significant ? 'Yes' : 'No'],
								]}
							/>
						)
					}}
				/>
				<Legend wrapperStyle={{ fontSize: 12 }} />
				<Scatter name="All driving together" data={overallPlot} fill={CHART_COLORS.inLine}>
					<ErrorBar dataKey="err" direction="x" width={0} stroke={CHART_COLORS.inLine} strokeWidth={2} />
				</Scatter>
				<Scatter name="Within the same area" data={sameAreaPlot} fill={CHART_COLORS.wet}>
					<ErrorBar dataKey="err" direction="x" width={0} stroke={CHART_COLORS.wet} strokeWidth={2} />
				</Scatter>
			</ScatterChart>
		</ChartFrame>
	)
}

WeatherRatioChart.propTypes = { impact: PropTypes.object.isRequired }

// Areas: distance driven vs event rate

const KM_TICKS = [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000]

export function AreaScatterChart({ areas, eventKey, fleetRate }) {
	const points = areas
		.map((a) => ({
			x: a.km,
			y: a.metrics[eventKey].ratePer100Km,
			name: a.name,
			city: a.kind === 'suburb' ? a.city : null,
			status: a.metrics[eventKey].status,
			observed: a.metrics[eventKey].observed,
			expected: a.metrics[eventKey].expected,
			ratio: a.metrics[eventKey].ratio,
		}))
		.filter((p) => p.y !== null && p.x > 0)

	if (points.length === 0) {
		return <p className="text-sm text-fleet-secondary py-10 text-center">No areas with enough driving to plot.</p>
	}

	const minKm = Math.min(...points.map((p) => p.x))
	const maxKm = Math.max(...points.map((p) => p.x))
	const domain = [minKm * 0.8, maxKm * 1.25]
	const ticks = KM_TICKS.filter((t) => t >= domain[0] && t <= domain[1])

	return (
		<ChartFrame height={320}>
			<ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: -4 }}>
				<CartesianGrid stroke={CHART_COLORS.grid} />
				<XAxis
					type="number"
					dataKey="x"
					scale="log"
					domain={domain}
					ticks={ticks}
					tickFormatter={fmtKm}
					allowDataOverflow
					label={{ value: 'Km driven in the area', position: 'insideBottom', offset: -4, fontSize: 12, fill: CHART_COLORS.axis }}
					{...AXIS_PROPS}
				/>
				<YAxis
					type="number"
					dataKey="y"
					scale="sqrt"
					domain={[0, zeroSafeMax]}
					label={{ value: 'Per 100 km', angle: -90, position: 'insideLeft', offset: 16, fontSize: 12, fill: CHART_COLORS.axis }}
					{...AXIS_PROPS}
					axisLine={false}
				/>
				<ZAxis range={[48, 48]} />
				{fleetRate !== null && (
					<ReferenceLine
						y={fleetRate}
						stroke={CHART_COLORS.navy}
						strokeDasharray="4 4"
						label={{ value: `Fleet ${fmt(fleetRate, 1)}`, position: 'insideTopRight', fontSize: 11, fill: CHART_COLORS.navy }}
					/>
				)}
				<Tooltip
					cursor={false}
					content={({ active, payload }) => {
						if (!active || !payload?.length) return null
						const p = payload[0].payload
						return (
							<TooltipBox
								title={p.city ? `${p.name}, ${p.city}` : p.name}
								rows={[
									['Km driven', fmt(p.x, 0)],
									['Events', fmt(p.observed, 0)],
									['Fleet expects', fmt(p.expected, 0)],
									['Per 100 km', fmt(p.y, 2)],
								]}
							/>
						)
					}}
				/>
				<Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
				{STATUS_SERIES.map(({ status, name, color }) => (
					<Scatter
						key={status}
						name={name}
						data={points.filter((p) => p.status === status)}
						fill={color}
						fillOpacity={0.8}
					/>
				))}
			</ScatterChart>
		</ChartFrame>
	)
}

AreaScatterChart.propTypes = {
	areas: PropTypes.array.isRequired,
	eventKey: PropTypes.string.isRequired,
	fleetRate: PropTypes.number,
}

// Vehicles: events the fleet would log vs events actually logged

export function VehicleScatterChart({ vehicles, eventKey }) {
	const points = vehicles
		.map((v) => ({
			x: v.metrics[eventKey].expected,
			y: v.metrics[eventKey].observed,
			vehicleId: v.vehicleId,
			km: v.km,
			mainArea: v.mainArea,
			status: v.metrics[eventKey].status,
			ratio: v.metrics[eventKey].ratio,
		}))
		.filter((p) => p.status !== 'not_reported' && p.x !== null)

	if (points.length === 0) {
		return <p className="text-sm text-fleet-secondary py-10 text-center">No vehicles to plot for this event.</p>
	}

	const max = Math.max(1, ...points.map((p) => Math.max(p.x, p.y))) * 1.05
	const ticks = sqrtTicks(max)

	return (
		<ChartFrame height={340}>
			<ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: -4 }}>
				<CartesianGrid stroke={CHART_COLORS.grid} />
				<XAxis
					type="number"
					dataKey="x"
					scale="sqrt"
					domain={[0, max]}
					ticks={ticks}
					allowDecimals={false}
					tickFormatter={(v) => fmt(v, 0)}
					label={{ value: 'Events the fleet would log', position: 'insideBottom', offset: -4, fontSize: 12, fill: CHART_COLORS.axis }}
					{...AXIS_PROPS}
				/>
				<YAxis
					type="number"
					dataKey="y"
					scale="sqrt"
					domain={[0, max]}
					ticks={ticks}
					allowDecimals={false}
					tickFormatter={(v) => fmt(v, 0)}
					label={{ value: 'Events logged', angle: -90, position: 'insideLeft', offset: 16, fontSize: 12, fill: CHART_COLORS.axis }}
					{...AXIS_PROPS}
					axisLine={false}
				/>
				<ZAxis range={[56, 56]} />
				<ReferenceLine
					segment={[{ x: 0, y: 0 }, { x: max, y: max }]}
					stroke={CHART_COLORS.navy}
					strokeDasharray="4 4"
					label={{ value: 'Same as fleet', position: 'insideTopLeft', fontSize: 11, fill: CHART_COLORS.navy }}
				/>
				<Tooltip
					cursor={false}
					content={({ active, payload }) => {
						if (!active || !payload?.length) return null
						const p = payload[0].payload
						return (
							<TooltipBox
								title={`Vehicle ${p.vehicleId}`}
								rows={[
									['Mostly drove in', p.mainArea || '—'],
									['Km driven', fmt(p.km, 0)],
									['Events logged', fmt(p.y, 0)],
									['Fleet would log', fmt(p.x, 0)],
									['Compared with fleet', p.ratio === null ? '—' : `${fmt(p.ratio, 2)}×`],
								]}
							/>
						)
					}}
				/>
				<Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
				{STATUS_SERIES.map(({ status, name, color }) => (
					<Scatter
						key={status}
						name={name}
						data={points.filter((p) => p.status === status)}
						fill={color}
						fillOpacity={0.85}
					/>
				))}
			</ScatterChart>
		</ChartFrame>
	)
}

VehicleScatterChart.propTypes = {
	vehicles: PropTypes.array.isRequired,
	eventKey: PropTypes.string.isRequired,
}

// ---------------------------------------------------------------------------
// Day by day: event rate (line) against share of km driven wet (bars)
// ---------------------------------------------------------------------------

export function DailyChart({ daily, eventKey, eventLabel }) {
	const data = daily.map((d) => {
		const gap = d.gaps.includes(eventKey)
		return {
			label: d.day.slice(5),
			day: d.day,
			km: d.km,
			wetPct: d.wetKmShare === null ? null : Math.round(d.wetKmShare * 100),
			rate: gap ? null : d.ratesPer100Km[eventKey],
			gap,
		}
	})

	return (
		<ChartFrame height={300}>
			<ComposedChart data={data} margin={{ top: 16, right: 0, bottom: 0, left: -8 }}>
				<CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
				<XAxis dataKey="label" {...AXIS_PROPS} />
				<YAxis yAxisId="rate" {...AXIS_PROPS} axisLine={false} />
				<YAxis
					yAxisId="wet"
					orientation="right"
					domain={[0, 100]}
					ticks={[0, 50, 100]}
					tickFormatter={(v) => `${v}%`}
					{...AXIS_PROPS}
					axisLine={false}
				/>
				{data.filter((d) => d.gap).map((d) => (
					<ReferenceLine
						key={d.label}
						yAxisId="rate"
						x={d.label}
						stroke={CHART_COLORS.axis}
						strokeDasharray="3 3"
						label={{ value: 'No event data', position: 'top', fontSize: 11, fill: CHART_COLORS.axis }}
					/>
				))}
				<Tooltip
					content={({ active, payload }) => {
						if (!active || !payload?.length) return null
						const p = payload[0].payload
						return (
							<TooltipBox
								title={p.day}
								rows={[
									['Km driven', fmt(p.km, 0)],
									['Driven wet', p.wetPct === null ? '—' : `${p.wetPct}%`],
									[`${eventLabel} per 100 km`, p.gap ? 'No event data' : fmt(p.rate, 2)],
								]}
							/>
						)
					}}
				/>
				<Legend wrapperStyle={{ fontSize: 12 }} />
				<Bar yAxisId="wet" dataKey="wetPct" name="Share of km driven wet" fill={CHART_COLORS.wetFill} radius={[3, 3, 0, 0]} />
				<Line
					yAxisId="rate"
					type="monotone"
					dataKey="rate"
					name={`${eventLabel} per 100 km`}
					stroke={CHART_COLORS.navy}
					strokeWidth={2}
					dot={{ r: 3 }}
					connectNulls={false}
				/>
			</ComposedChart>
		</ChartFrame>
	)
}

DailyChart.propTypes = {
	daily: PropTypes.array.isRequired,
	eventKey: PropTypes.string.isRequired,
	eventLabel: PropTypes.string.isRequired,
}