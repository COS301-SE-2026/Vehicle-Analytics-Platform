import { useState, useMemo } from 'react'
import PropTypes from 'prop-types'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { BarChart3 } from 'lucide-react'

const METRICS = [
    { key: 'safetyScore', label: 'Safety score', unit: '', higherIsBetter: true },
    { key: 'totalEvents', label: 'Total events', unit: '', higherIsBetter: false },
    { key: 'harshBrakes', label: 'Harsh braking', unit: '', higherIsBetter: false },
    { key: 'overspeedEvents', label: 'Overspeed events', unit: '', higherIsBetter: false },
    { key: 'distanceKm', label: 'Distance', unit: 'km', higherIsBetter: null },
    { key: 'utilisationPct', label: 'Utilisation', unit: '%', higherIsBetter: true },
    { key: 'avgEfficiencyKmPerL', label: 'Fuel efficiency', unit: 'km/L', higherIsBetter: true },
]

const EVENT_BREAKDOWN = [
    { key: 'harshBrakes', label: 'Harsh braking' },
    { key: 'harshAccelerations', label: 'Harsh accel.' },
    { key: 'harshCornering', label: 'Harsh corner.' },
    { key: 'crashes', label: 'Crashes' },
    { key: 'overspeedEvents', label: 'Overspeed' },
    { key: 'idlingEvents', label: 'Idling' },
]

function ChartTooltip({ active, payload, label, unit }) {
    if (!active || !payload || payload.length === 0) return null
    const value = payload[0].value

    return (
        <div className="bg-white border border-fleet-border rounded-lg px-3 py-2 text-xs shadow-sm">
            <p className="text-fleet-secondary mb-1">{label}</p>
            <p className="font-semibold text-fleet-text">
                {value === null || value === undefined ? 'No data' : `${value}${unit ? ` ${unit}` : ''}`}
            </p>
        </div>
    )
}

ChartTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.array,
    label: PropTypes.string,
    unit: PropTypes.string,
}

ChartTooltip.defaultProps = {
    active: false,
    payload: [],
    label: '',
    unit: '',
}

function EmptyState() {
    return (
        <div className="h-[260px] flex flex-col items-center justify-center gap-3 text-center">
            <BarChart3 className="w-8 h-8 text-fleet-border" />
            <p className="text-sm text-fleet-secondary max-w-sm">
                Scope the report to a single vehicle, or switch on
                {' '}
                <span className="text-fleet-text font-medium">Compare vehicles</span>
                {' '}
                and pick two or more, to plot analytics here.
            </p>
        </div>
    )
}