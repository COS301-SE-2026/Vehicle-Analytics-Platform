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

