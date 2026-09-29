import { useState } from 'react'
import PropTypes from 'prop-types'
import { behaviourName, formatNumber } from './anomalyFormat'

const WIDTH = 640
const HEIGHT = 74
const PLOT_LEFT = 12
const PLOT_RIGHT = WIDTH - 12
const BAND_TOP = 12
const BAND_HEIGHT = 38
const CENTRE_Y = BAND_TOP + BAND_HEIGHT / 2
const AXIS_Y = 68
const LANE_OFFSETS = [0, -10, 10]
const MAX_TICKS = 6
const MAX_LABELS = 3

export const DOT_COLORS = {
    high: '#B91C1C',
    moderate: '#B45309',
    low: '#A16207',
    normal: '#A8A8A0',
    unconfirmed: '#B45309',
    selected: '#14304F',
}

const STATUS_TEXT = {
    flagged: 'flagged',
    unconfirmed: 'beyond the flag line, but too little driving to rule out chance',
    normal: 'within the normal range',
}

function isNumber(value) {
    return typeof value === 'number' && Number.isFinite(value)
}

function niceTicks(d0, d1, count = 4) {
    const raw = (d1 - d0) / count
    if (!(raw > 0)) return [d0]
    const pow = 10 ** Math.floor(Math.log10(raw))
    const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw)
    const ticks = []
    for (let v = Math.ceil(d0 / step) * step; v <= d1 + step * 1e-9; v += step) {
        ticks.push(Number(v.toPrecision(12)))
    }
    return ticks
}

function thin(ticks) {
    if (ticks.length <= MAX_TICKS) return ticks
    return ticks.filter((_, i) => i % 2 === 0)
}

function linearScale(d0, d1) {
    const span = d1 - d0 || 1
    return {
        type: 'linear',
        position: (v) => PLOT_LEFT + ((v - d0) / span) * (PLOT_RIGHT - PLOT_LEFT),
        ticks: thin(niceTicks(d0, d1)),
    }
}


function logScale(c, d1) {
    const t = (v) => Math.log10(1 + Math.max(v, 0) / c)
    const t1 = t(d1)
    const ticks = [0]
    for (let p = 10 ** Math.floor(Math.log10(c)); p <= d1; p *= 10) {
        if (p >= c) ticks.push(Number(p.toPrecision(12)))
    }
    return {
        type: 'log',
        position: (v) => PLOT_LEFT + (t(v) / t1) * (PLOT_RIGHT - PLOT_LEFT),
        ticks: thin(ticks),
    }
}


export function buildScale(feature) {
    const { points, median, threshold } = feature.distribution
    const all = [...points.map((p) => p.value), median, threshold].filter(isNumber)
    const max = all.length ? Math.max(...all, 0) : 1

    if (feature.kind === 'speed') {
        const min = Math.min(...all)
        const pad = Math.max((max - min) * 0.08, 1)
        return linearScale(min - pad, max + pad)
    }

    const positives = all.filter((v) => v > 0)
    const low = positives.length ? Math.min(...positives) : null
    if (low !== null && max / low >= 20) return logScale(low, max * 1.15)
    return linearScale(0, max > 0 ? max * 1.1 : 1)
}

const DRAW_ORDER = { normal: 0, unconfirmed: 1, flagged: 2 }

function Strip({ feature, selectedVehicleId, onSelectVehicle, highlightFocus }) {
    const [activeId, setActiveId] = useState(null)
    const scale = buildScale(feature)
    const x = scale.position
    const { points, median, threshold } = feature.distribution
    const name = behaviourName(feature)



    const ordered = points
        .map((p, index) => ({ ...p, lane: LANE_OFFSETS[index % LANE_OFFSETS.length] }))
        .sort((a, b) => (DRAW_ORDER[a.status] ?? 0) - (DRAW_ORDER[b.status] ?? 0))


    const flagged = points.filter((p) => p.status === 'flagged')
    const labelled = new Set(flagged.slice(-MAX_LABELS).map((p) => p.vehicleId))
    if (highlightFocus) points.filter((p) => p.inFocus).forEach((p) => labelled.add(p.vehicleId))
    if (selectedVehicleId) labelled.add(selectedVehicleId)

    const captionPoint = points.find((p) => p.vehicleId === (activeId || selectedVehicleId))
    const bandEnd = isNumber(threshold) ? x(threshold) : null



    return (
        <figure className="space-y-1" data-testid={`strip-${feature.feature}`}>
            <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-fleet-text">
                    {name}
                    <span className="font-normal text-fleet-secondary"> {feature.unitLabel}</span>
                </span>
                <span className="text-xs text-fleet-secondary">
                    Median {formatNumber(median)}
                    {isNumber(threshold) ? `, flag line ${formatNumber(threshold)}` : ', no spread to set a flag line'}
                    {scale.type === 'log' ? ', log scale' : ''}
                </span>
            </figcaption>

            <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="w-full h-auto overflow-visible"
                role="group"
                aria-label={`${name}: ${points.length} vehicles, median ${formatNumber(median)}, ${flagged.length} flagged`}
            >
                {bandEnd !== null && (
                    <rect
                        x={PLOT_LEFT}
                        y={BAND_TOP}
                        width={Math.max(bandEnd - PLOT_LEFT, 0)}
                        height={BAND_HEIGHT}
                        rx="6"
                        fill="#A8A8A0"
                        fillOpacity="0.14"
                        data-testid="normal-band"
                    />
                )}
                {isNumber(median) && (
                    <line x1={x(median)} x2={x(median)} y1={BAND_TOP} y2={BAND_TOP + BAND_HEIGHT} stroke="#8A8A82" strokeWidth="1" />
                )}
                {bandEnd !== null && (
                    <line
                        x1={bandEnd}
                        x2={bandEnd}
                        y1={BAND_TOP - 4}
                        y2={BAND_TOP + BAND_HEIGHT + 4}
                        stroke={DOT_COLORS.high}
                        strokeDasharray="4 3"
                        data-testid="flag-line"
                    />
                )}

                {scale.ticks.map((tick) => (
                    <text key={tick} x={x(tick)} y={AXIS_Y} textAnchor="middle" fontSize="10" fill="#6B6B63">
                        {formatNumber(tick)}
                    </text>
                ))}

                {ordered.map((p) => {
                    const selected = p.vehicleId === selectedVehicleId
                    const focus = highlightFocus && p.inFocus
                    const colour = p.status === 'flagged'
                        ? DOT_COLORS[p.severity] || DOT_COLORS.high
                        : p.status === 'unconfirmed' ? DOT_COLORS.unconfirmed : DOT_COLORS.normal
                    const hollow = p.status === 'unconfirmed'
                    const interesting = p.status !== 'normal' || focus

                    return (
                        <g key={p.vehicleId}>
                            <circle
                                cx={x(p.value)}
                                cy={CENTRE_Y + p.lane}
                                r={p.status === 'flagged' || focus ? 6 : 4.5}
                                fill={hollow ? '#FFFFFF' : colour}
                                stroke={selected || focus ? DOT_COLORS.selected : hollow ? colour : 'none'}
                                strokeWidth={selected || focus ? 2.5 : 1.5}
                                tabIndex={interesting ? 0 : -1}
                                role="button"
                                aria-label={`${p.vehicleId}: ${formatNumber(p.value)} ${feature.unitLabel}, ${STATUS_TEXT[p.status] || p.status}`}
                                aria-pressed={selected}
                                data-testid={`dot-${feature.feature}-${p.vehicleId}`}
                                className="cursor-pointer outline-none"
                                onClick={() => onSelectVehicle(p.vehicleId)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        onSelectVehicle(p.vehicleId)
                                    }
                                }}
                                onMouseEnter={() => setActiveId(p.vehicleId)}
                                onMouseLeave={() => setActiveId(null)}
                                onFocus={() => setActiveId(p.vehicleId)}
                                onBlur={() => setActiveId(null)}
                            />
                            {labelled.has(p.vehicleId) && (
                                <text
                                    x={x(p.value)}
                                    y={BAND_TOP - 2}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="600"
                                    fill={p.status === 'flagged' ? colour : DOT_COLORS.selected}
                                >
                                    {p.vehicleId}
                                </text>
                            )}
                        </g>
                    )
                })}
            </svg>

            <p className="text-xs text-fleet-secondary min-h-[1rem]" aria-live="polite">
                {captionPoint
                    ? `${captionPoint.vehicleId}: ${formatNumber(captionPoint.value)} ${feature.unitLabel}, ${STATUS_TEXT[captionPoint.status] || captionPoint.status}.`
                    : `${points.length} vehicles, ${flagged.length} flagged.`}
            </p>
        </figure>
    )
}

Strip.propTypes = {
    feature: PropTypes.object.isRequired,
    selectedVehicleId: PropTypes.string,
    onSelectVehicle: PropTypes.func.isRequired,
    highlightFocus: PropTypes.bool.isRequired,
}



function Swatch({ fill, stroke = 'none', label }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" aria-hidden="true">
                <circle cx="6" cy="6" r="4.5" fill={fill} stroke={stroke} strokeWidth="1.5" />
            </svg>
            {label}
        </span>
    )
}

Swatch.propTypes = { fill: PropTypes.string.isRequired, stroke: PropTypes.string, label: PropTypes.string.isRequired }

function nameList(features) {
    return features.map((f) => behaviourName(f).toLowerCase()).join(', ')
}

export default function AnomalyDistribution({
    features = {},
    selectedVehicleId = null,
    onSelectVehicle = () => {},
    highlightFocus = false,
}) {
    const entries = Object.values(features)
    const scored = entries.filter((f) => f.status === 'scored' && f.distribution && f.distribution.points.length)
    const noEvents = entries.filter((f) => f.status === 'no_events')
    const tooFew = entries.filter((f) => f.status === 'insufficient_peers')

    return (
        <div className="space-y-6">
            {scored.length === 0 ? (
                <p className="text-sm text-fleet-secondary">No behaviour had enough vehicles with data to draw.</p>
            ) : (
                scored.map((feature) => (
                    <Strip
                        key={feature.feature}
                        feature={feature}
                        selectedVehicleId={selectedVehicleId}
                        onSelectVehicle={onSelectVehicle}
                        highlightFocus={highlightFocus}
                    />
                ))
            )}

            {scored.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-fleet-secondary">
                    <Swatch fill={DOT_COLORS.high} label="Flagged" />
                    <Swatch fill="#FFFFFF" stroke={DOT_COLORS.unconfirmed} label="Beyond the line, too little driving to be sure" />
                    <Swatch fill={DOT_COLORS.normal} label="Within the normal range" />
                    <Swatch fill="#FFFFFF" stroke={DOT_COLORS.selected} label="Selected" />
                </div>
            )}

            {noEvents.length > 0 && (
                <p className="text-xs text-fleet-secondary">
                    No vehicle recorded any {nameList(noEvents)} incidents in this period.
                </p>
            )}
            {tooFew.length > 0 && (
                <p className="text-xs text-fleet-secondary">
                    Too few vehicles had data to compare {nameList(tooFew)}.
                </p>
            )}
        </div>
    )
}

AnomalyDistribution.propTypes = {
    features: PropTypes.object,
    selectedVehicleId: PropTypes.string,
    onSelectVehicle: PropTypes.func,
    highlightFocus: PropTypes.bool,
}