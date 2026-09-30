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
import { capitalise, formatNumber, joinList, valueLabel } from '../reports/anomalyFormat'

const AXIS_PROPS = {
    stroke: CHART_COLORS.axis,
    tick: { fontSize: 12, fill: CHART_COLORS.axis },
    tickLine: false,
}


const LOG_SPREAD = 20
const OFF_SCALE_FACTOR = 4
const MAX_OFF_SCALE_SHARE = 0.2

const EXPOSURE_TICKS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000]
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]
const TICK_BASES = [1, 2, 2.5, 5, 10]
const CURVE_POINTS = 60
const EXACT_LIMIT_MU = 50
const DOT_RADIUS = 4.5

export function niceStep(range, count = 5) {
    if (!Number.isFinite(range) || range <= 0) return 1
    const raw = range / count
    const mag = 10 ** Math.floor(Math.log10(raw))
    const norm = raw / mag
    const base = TICK_BASES.find((b) => norm <= b) ?? 10
    return Number((base * mag).toPrecision(12))
}

// Evenly spaced ticks from min up to the first step at or above max.
export function linearTicks(min, max, count = 5) {
    const step = niceStep(max - min, count)
    const start = Math.floor(min / step) * step
    const end = Math.ceil(max / step) * step
    const ticks = []
    for (let t = start; t <= end + step / 2; t += step) ticks.push(Number(t.toPrecision(12)))
    return { ticks, step, domain: [ticks[0], ticks[ticks.length - 1]] }
}

export function decimalsFor(step) {
    const text = String(Number(step.toPrecision(12)))
    const dot = text.indexOf('.')
    return dot === -1 ? 0 : text.length - dot - 1
}

export function niceCeil(value) {
    if (!Number.isFinite(value) || value <= 0) return 1
    const mag = 10 ** Math.floor(Math.log10(value))
    const step = NICE_STEPS.find((s) => value <= s * mag * (1 + 1e-9)) || 10
    return Number((step * mag).toPrecision(12))
}

export function statusLabel(status, peerNoun = 'fleet') {
    if (status === 'flagged') return `Above ${peerNoun}`
    if (status === 'normal') return `In line with ${peerNoun}`
    if (status === 'unconfirmed') return 'Could be chance'
    return status
}

export const STATUS_LABELS = {
    flagged: statusLabel('flagged'),
    normal: statusLabel('normal'),
    unconfirmed: statusLabel('unconfirmed'),
}

export function anomalySeries(peerNoun = 'fleet') {
    return [
        { status: 'flagged', name: statusLabel('flagged', peerNoun), color: CHART_COLORS.above },
        { status: 'normal', name: statusLabel('normal', peerNoun), color: CHART_COLORS.inLine },
        { status: 'unconfirmed', name: statusLabel('unconfirmed', peerNoun), color: CHART_COLORS.insufficient },
    ]
}

export const ANOMALY_SERIES = anomalySeries()

function fmtExposure(value) {
    if (value >= 1000) return `${formatNumber(value / 1000, value >= 10000 ? 0 : 1)}k`
    return formatNumber(value, 0)
}

export function xAxisFor(exposures) {
    const xs = exposures.filter((x) => Number.isFinite(x) && x > 0)
    if (!xs.length) return { scale: 'auto', domain: [0, 1], ticks: [0, 1], log: false }

    const min = Math.min(...xs)
    const max = Math.max(...xs)

    if (max / min > LOG_SPREAD) {
        const domain = [min * 0.8, max * 1.25]
        return {
            scale: 'log',
            domain,
            ticks: EXPOSURE_TICKS.filter((t) => t >= domain[0] && t <= domain[1]),
            log: true,
        }
    }

    const { ticks, domain } = linearTicks(0, max * 1.05)
    return { scale: 'auto', domain, ticks, log: false }
}

export function yAxisFor(kind, values, refs = []) {
    const finite = values.filter(Number.isFinite)
    const lines = refs.filter(Number.isFinite)

    if (kind === 'speed') {
        const all = [...finite, ...lines]
        const min = all.length ? Math.min(...all) : 0
        const max = all.length ? Math.max(...all) : 1
        const { ticks, domain, step } = linearTicks(Math.max(0, min - 5), max + 5)
        return { domain, ticks, decimals: decimalsFor(step), cap: null }
    }

    const lineMax = lines.length ? Math.max(...lines) : 0
    const limit = OFF_SCALE_FACTOR * lineMax
    const above = lineMax > 0 ? finite.filter((v) => v > limit) : []
    const allowed = Math.max(2, Math.floor(finite.length * MAX_OFF_SCALE_SHARE))
    const capping = above.length > 0 && above.length <= allowed

    const shown = capping ? finite.filter((v) => v <= limit) : finite
    const visibleMax = Math.max(shown.length ? Math.max(...shown) : 0, lineMax)
    const { ticks, domain, step } = linearTicks(0, visibleMax > 0 ? visibleMax * 1.1 : 1)
    return { domain, ticks, decimals: decimalsFor(step), cap: capping ? domain[1] : null }
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

const LANCZOS = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
]

function logGamma(z) {
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
    const zz = z - 1
    let x = 0.99999999999980993
    for (let i = 0; i < LANCZOS.length; i += 1) x += LANCZOS[i] / (zz + i + 1)
    const t = zz + 7.5
    return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x)
}




export function gammaP(a, x) {
    if (!(x > 0)) return 0
    const lead = a * Math.log(x) - x - logGamma(a)
    if (x < a + 1) {
        let term = 1 / a
        let sum = term
        for (let n = 1; n < 1000; n += 1) {
            term *= x / (a + n)
            sum += term
            if (term < sum * 1e-14) break
        }
        return Math.min(1, Math.exp(lead) * sum)
    }
    let b = x + 1 - a
    let c = 1 / 1e-300
    let d = 1 / b
    let h = d
    for (let n = 1; n < 1000; n += 1) {
        const an = -n * (n - a)
        b += 2
        d = an * d + b
        if (Math.abs(d) < 1e-300) d = 1e-300
        c = b + an / c
        if (Math.abs(c) < 1e-300) c = 1e-300
        d = 1 / d
        const delta = d * c
        h *= delta
        if (Math.abs(delta - 1) < 1e-14) break
    }
    return Math.max(0, 1 - Math.exp(lead) * h)
}





export function chanceLimitContinuous(mu, alpha) {
    if (!(mu > 0)) return null
    let lo = 1e-9
    let hi = mu + 12 * Math.sqrt(mu) + 60
    for (let i = 0; i < 80; i += 1) {
        const mid = (lo + hi) / 2
        if (gammaP(mid, mu) > alpha) lo = mid
        else hi = mid
    }
    return (lo + hi) / 2
}

export function chanceLimitCurve(rate, ratePer, domain, alpha, maxY = Infinity) {
    if (!(rate > 0) || !ratePer) return []
    const [lo, hi] = domain
    if (!(lo > 0) || !(hi > lo)) return []
    const step = Math.log(hi / lo) / (CURVE_POINTS - 1)

    return Array.from({ length: CURVE_POINTS }, (_, i) => {
        const x = lo * Math.exp(step * i)
        const units = x / ratePer
        const k = chanceLimitContinuous(rate * units, alpha)
        return { x, y: k === null ? null : k / units }
    }).filter((p) => p.y !== null && p.y <= maxY)
}

export function offScaleNote(points, unitLabel) {
    const above = points.filter((p) => p.offScale)
    if (!above.length) return null
    const unit = unitLabel ? ` ${unitLabel}` : ''
    const items = above.map((p) => `${p.vehicleId} (${formatNumber(p.value)}${unit})`)
    return `Above the top of the chart, shown as triangles: ${joinList(items)}.`
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

export function VehicleSymbol({ cx, cy, fill, fillOpacity, payload }) {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null
    if (payload && payload.offScale) {
        const r = DOT_RADIUS + 1.5
        return (
            <path
                d={`M ${cx} ${cy - r * 0.2} L ${cx + r} ${cy + r * 1.4} L ${cx - r} ${cy + r * 1.4} Z`}
                fill={fill}
                fillOpacity={fillOpacity}
            />
        )
    }
    return <circle cx={cx} cy={cy} r={DOT_RADIUS} fill={fill} fillOpacity={fillOpacity} />
}

VehicleSymbol.propTypes = {
    cx: PropTypes.number,
    cy: PropTypes.number,
    fill: PropTypes.string,
    fillOpacity: PropTypes.number,
    payload: PropTypes.object,
}

export function VehicleTooltip({ active = false, payload = [], feature, peerNoun = 'fleet' }) {
    if (!active || !payload?.length) return null
    const p = payload[0].payload
    if (!p?.vehicleId) return null

    const rows = [[feature.distribution.exposureLabel || 'Exposure', formatNumber(p.exposure, 0)]]
    if (p.observed !== null && p.observed !== undefined) rows.push(['Incidents', formatNumber(p.observed, 0)])
    if (p.expected !== null && p.expected !== undefined) rows.push(['Expected', formatNumber(p.expected)])
    rows.push([valueLabel(feature), formatNumber(p.value)])
    rows.push([`Compared with ${peerNoun}`, statusLabel(p.status, peerNoun)])
    return <TooltipBox title={`Vehicle ${p.vehicleId}`} rows={rows} />
}

VehicleTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.array,
    feature: PropTypes.shape({ distribution: PropTypes.object.isRequired }).isRequired,
    peerNoun: PropTypes.string,
}

export function SelectionRing({ cx, cy }) {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null
    return <circle cx={cx} cy={cy} r={9} fill="none" stroke={CHART_COLORS.navy} strokeWidth={2} />
}

SelectionRing.propTypes = { cx: PropTypes.number, cy: PropTypes.number }

export function AnomalyFunnelChart({
    feature,
    alpha,
    peerNoun = 'fleet',
    selectedVehicleId = null,
    onSelectVehicle = () => {},
    highlightFocus = false,
}) {
    const { distribution } = feature
    const plottable = distribution.points.filter((p) => Number.isFinite(p.value) && p.exposure > 0)

    if (plottable.length === 0) {
        return <p className="text-sm text-fleet-secondary py-10 text-center">No vehicles to plot for this behaviour.</p>
    }

    const x = xAxisFor(plottable.map((p) => p.exposure))
    const y = yAxisFor(feature.kind, plottable.map((p) => p.value), [distribution.median, distribution.flagLine])

    const points = plottable.map((p) => {
        const offScale = y.cap !== null && p.value > y.cap
        return { ...p, x: p.exposure, y: offScale ? y.cap : p.value, offScale }
    })

    const curveDomain = [x.log ? x.domain[0] : Math.min(...points.map((p) => p.x)) * 0.25, x.domain[1]]
    const curve = feature.kind === 'rate'
        ? chanceLimitCurve(distribution.chanceRate, distribution.ratePer, curveDomain, alpha, y.domain[1])
        : []

    const ringed = points.filter((p) => p.vehicleId === selectedVehicleId || (highlightFocus && p.inFocus))
    const select = (point) => onSelectVehicle((point.payload || point).vehicleId)
    const axis = distribution.axis || {}
    const xTitle = `${axis.x || distribution.exposureLabel || ''}${x.log ? ' (log scale)' : ''}`
    const note = offScaleNote(points, feature.unitLabel)

    return (
        <div>
            <ChartFrame height={380}>
                <ComposedChart margin={{ top: 8, right: 100, bottom: 28, left: 16 }}>
                    <CartesianGrid stroke={CHART_COLORS.grid} />
                    <XAxis
                        type="number"
                        dataKey="x"
                        scale={x.scale}
                        domain={x.domain}
                        ticks={x.ticks}
                        interval={0}
                        tickFormatter={fmtExposure}
                        label={{ value: xTitle, position: 'insideBottom', offset: -18, fontSize: 12, fill: CHART_COLORS.axis }}
                        {...AXIS_PROPS}
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        domain={y.domain}
                        ticks={y.ticks}
                        interval={0}
                        tickFormatter={(v) => formatNumber(v, y.decimals)}
                        width={56}
                        label={{
                            value: axis.y || capitalise(feature.unitLabel),
                            angle: -90,
                            position: 'insideLeft',
                            offset: -8,
                            style: { textAnchor: 'middle' },
                            fontSize: 12,
                            fill: CHART_COLORS.axis,
                        }}
                        {...AXIS_PROPS}
                        axisLine={false}
                    />
                    <ZAxis range={[64, 64]} />
                    {Number.isFinite(distribution.median) && (
                        <ReferenceLine
                            y={distribution.median}
                            stroke={CHART_COLORS.navy}
                            strokeDasharray="4 4"
                            label={{
                                value: `Median ${formatNumber(distribution.median)}`,
                                position: 'right',
                                fontSize: 11,
                                fill: CHART_COLORS.navy,
                            }}
                        />
                    )}
                    {Number.isFinite(distribution.flagLine) && (
                        <ReferenceLine
                            y={distribution.flagLine}
                            stroke={CHART_COLORS.above}
                            strokeDasharray="4 4"
                            label={{ value: 'Flag line', position: 'right', fontSize: 11, fill: CHART_COLORS.above }}
                        />
                    )}
                    <Tooltip
                        cursor={false}
                        content={<VehicleTooltip feature={feature} peerNoun={peerNoun} />}
                    />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
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
                            isAnimationActive={false}
                            legendType="plainline"
                        />
                    )}
                    {anomalySeries(peerNoun)
                        .filter(({ status }) => points.some((p) => p.status === status))
                        .map(({ status, name, color }) => (
                        <Scatter
                            key={status}
                            name={name}
                            data={points.filter((p) => p.status === status)}
                            fill={color}
                            fillOpacity={0.85}
                            shape={VehicleSymbol}
                            legendType="circle"
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
                            shape={SelectionRing}
                        />
                    )}
                </ComposedChart>
            </ChartFrame>
            {note && <p className="mt-2 text-xs text-fleet-secondary" data-testid="anomaly-offscale-note">{note}</p>}
        </div>
    )
}

AnomalyFunnelChart.propTypes = {
    feature: PropTypes.shape({
        kind: PropTypes.string.isRequired,
        unitLabel: PropTypes.string,
        distribution: PropTypes.object.isRequired,
    }).isRequired,
    alpha: PropTypes.number.isRequired,
    peerNoun: PropTypes.string,
    selectedVehicleId: PropTypes.string,
    onSelectVehicle: PropTypes.func,
    highlightFocus: PropTypes.bool,
}