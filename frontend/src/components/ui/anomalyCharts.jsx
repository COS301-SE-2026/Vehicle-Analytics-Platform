import PropTypes from 'prop-types'
import {
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis,
} from 'recharts'
import { CHART_COLORS } from './weatherCharts'
import { formatNumber } from '../reports/anomalyFormat'

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

export const ANOMALY_SERIES = [
    { status: 'flagged', name: 'Above fleet', color: CHART_COLORS.above },
    { status: 'normal', name: 'In line with fleet', color: CHART_COLORS.inLine },
    { status: 'unconfirmed', name: 'Too little data', color: CHART_COLORS.insufficient },
]

export const STATUS_LABELS = {
    flagged: 'Above fleet',
    normal: 'In line',
    unconfirmed: 'Too little data',
}

const EXPOSURE_TICKS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000]
const CURVE_POINTS = 40
const EXACT_LIMIT_MU = 50

function fmtExposure(value) {
    if (value >= 1000) return `${formatNumber(value / 1000, value >= 10000 ? 0 : 1)}k`
    return formatNumber(value, 0)
}

function normalUpperQuantile(alpha) {
    const t = Math.sqrt(-2 * Math.log(alpha))
    return t - (2.515517 + 0.802853 * t + 0.010328 * t * t)
        / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t)
}

export function chanceLimitCount(mu, alpha) {
    if (!(mu > 0)) return null
    if (mu > EXACT_LIMIT_MU) {
        const z = normalUpperQuantile(alpha)
        return Math.ceil(mu + z * Math.sqrt(mu) + (z * z - 1) / 6 + 0.5)
    }

    let term = Math.exp(-mu)
    let cdf = term
    let k = 0
    while (1 - cdf >= alpha) {
        k += 1
        term *= mu / k
        cdf += term
    }
    return k + 1
}

export function chanceLimitCurve(median, ratePer, domain, alpha) {
    if (!(median > 0) || !ratePer) return []
    const [lo, hi] = domain
    const step = Math.log(hi / lo) / (CURVE_POINTS - 1)

    return Array.from({ length: CURVE_POINTS }, (_, i) => {
        const x = lo * Math.exp(step * i)
        const units = x / ratePer
        const k = chanceLimitCount(median * units, alpha)
        return { x, y: k === null ? null : k / units }
    })
}

function yAxisFor(kind, values, extras) {
    const all = [...values, ...extras].filter(Number.isFinite)
    const max = all.length ? Math.max(...all) : 1

    if (kind === 'speed') {
        const min = all.length ? Math.min(...all) : 0
        return { scale: 'linear', domain: [Math.max(0, Math.floor((min - 10) / 10) * 10), Math.ceil((max + 10) / 10) * 10] }
    }

    const top = zeroSafeMax(max * 1.05)
    return { scale: 'sqrt', domain: [0, top], ticks: sqrtTicks(top) }
}

function capitalise(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : ''
}

export function AnomalyFunnelChart({
    feature,
    alpha,
    selectedVehicleId = null,
    onSelectVehicle = () => {},
    highlightFocus = false,
}) {
    const { distribution } = feature
    const points = distribution.points
        .filter((p) => Number.isFinite(p.value) && p.exposure > 0)
        .map((p) => ({ ...p, x: p.exposure, y: p.value }))

    if (points.length === 0) {
        return <p className="text-sm text-fleet-secondary py-10 text-center">No vehicles to plot for this behaviour.</p>
    }

    const xs = points.map((p) => p.x)
    const domain = [Math.min(...xs) * 0.8, Math.max(...xs) * 1.25]
    const xTicks = EXPOSURE_TICKS.filter((t) => t >= domain[0] && t <= domain[1])

    const curve = feature.kind === 'rate'
        ? chanceLimitCurve(distribution.median, distribution.ratePer, domain, alpha)
        : []
    const y = yAxisFor(feature.kind, points.map((p) => p.y), [distribution.median, distribution.threshold])

    const ringed = points.filter((p) => p.vehicleId === selectedVehicleId || (highlightFocus && p.inFocus))
    const select = (point) => onSelectVehicle((point.payload || point).vehicleId)

    return (
        <ChartFrame height={340}>
            <ComposedChart margin={{ top: 8, right: 16, bottom: 8, left: -4 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} />
                <XAxis
                    type="number"
                    dataKey="x"
                    scale="log"
                    domain={domain}
                    ticks={xTicks}
                    tickFormatter={fmtExposure}
                    allowDataOverflow
                    label={{ value: distribution.exposureLabel, position: 'insideBottom', offset: -4, fontSize: 12, fill: CHART_COLORS.axis }}
                    {...AXIS_PROPS}
                />
                <YAxis
                    type="number"
                    dataKey="y"
                    scale={y.scale}
                    domain={y.domain}
                    ticks={y.ticks}
                    allowDataOverflow
                    tickFormatter={(v) => formatNumber(v)}
                    label={{ value: capitalise(feature.unitLabel), angle: -90, position: 'insideLeft', offset: 16, fontSize: 12, fill: CHART_COLORS.axis }}
                    {...AXIS_PROPS}
                    axisLine={false}
                />
                <ZAxis range={[56, 56]} />
                {Number.isFinite(distribution.median) && (
                    <ReferenceLine
                        y={distribution.median}
                        stroke={CHART_COLORS.navy}
                        strokeDasharray="4 4"
                        label={{ value: `Fleet median ${formatNumber(distribution.median)}`, position: 'insideBottomRight', fontSize: 11, fill: CHART_COLORS.navy }}
                    />
                )}
                {Number.isFinite(distribution.threshold) && (
                    <ReferenceLine
                        y={distribution.threshold}
                        stroke={CHART_COLORS.above}
                        strokeDasharray="4 4"
                        label={{ value: 'Flag line', position: 'insideTopRight', fontSize: 11, fill: CHART_COLORS.above }}
                    />
                )}
                <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const p = payload[0].payload
                        if (!p.vehicleId) return null
                        const rows = [[distribution.exposureLabel, formatNumber(p.exposure, 0)]]
                        if (p.observed !== null && p.observed !== undefined) rows.push(['Incidents', formatNumber(p.observed, 0)])
                        if (p.expected !== null && p.expected !== undefined) rows.push(['Fleet expects', formatNumber(p.expected)])
                        rows.push([capitalise(feature.unitLabel), formatNumber(p.value)])
                        rows.push(['Compared with fleet', STATUS_LABELS[p.status] || p.status])
                        return <TooltipBox title={`Vehicle ${p.vehicleId}`} rows={rows} />
                    }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {curve.length > 0 && (
                    <Line
                        data={curve}
                        dataKey="y"
                        name="Chance limit"
                        type="monotone"
                        stroke={CHART_COLORS.axis}
                        strokeDasharray="2 4"
                        strokeWidth={1.5}
                        dot={false}
                        legendType="plainline"
                    />
                )}
                {ANOMALY_SERIES.map(({ status, name, color }) => (
                    <Scatter
                        key={status}
                        name={name}
                        data={points.filter((p) => p.status === status)}
                        fill={color}
                        fillOpacity={0.85}
                        cursor="pointer"
                        onClick={select}
                    />
                ))}
                {ringed.length > 0 && (
                    <Scatter
                        name="Selected vehicle"
                        data={ringed}
                        legendType="circle"
                        fill="none"
                        onClick={select}
                        shape={({ cx, cy }) => (
                            <circle cx={cx} cy={cy} r={9} fill="none" stroke={CHART_COLORS.navy} strokeWidth={2} />
                        )}
                    />
                )}
            </ComposedChart>
        </ChartFrame>
    )
}

AnomalyFunnelChart.propTypes = {
    feature: PropTypes.shape({
        kind: PropTypes.string.isRequired,
        unitLabel: PropTypes.string,
        distribution: PropTypes.object.isRequired,
    }).isRequired,
    alpha: PropTypes.number.isRequired,
    selectedVehicleId: PropTypes.string,
    onSelectVehicle: PropTypes.func,
    highlightFocus: PropTypes.bool,
}