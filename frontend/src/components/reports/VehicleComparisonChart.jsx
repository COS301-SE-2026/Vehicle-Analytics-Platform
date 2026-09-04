import { useState } from 'react'
import PropTypes from 'prop-types'
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,} from 'recharts'
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

function ChartTooltip({ active, payload, label, unit }){
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

function EmptyState(){
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

export default function VehicleComparisonChart({ vehicles }){
    const [metricKey, setMetricKey] = useState('safetyScore')

    if (!vehicles.length) return <EmptyState />

    const single = vehicles.length === 1
    const metric = METRICS.find((m) => m.key === metricKey) || METRICS[0]

    const data = single
        ? EVENT_BREAKDOWN.map((e) => ({
            label: e.label,
            value: vehicles[0][e.key] ?? 0,
        }))
        : vehicles.map((v) => ({
            label: v.vehicleId,
            value: v[metric.key] === null || v[metric.key] === undefined ? null : v[metric.key],
        }))

    const withData = data.filter((d) => d.value !== null)

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-fleet-secondary">
                    {single
                        ? `Event breakdown for ${vehicles[0].vehicleId}`
                        : `${metric.label} across ${vehicles.length} vehicles`}
                </p>

                {!single && (
                    <select
                        value={metricKey}
                        onChange={(e) => setMetricKey(e.target.value)}
                        aria-label="Comparison metric"
                        data-testid="comparison-metric"
                        className="border border-fleet-border rounded-lg px-3 py-1.5 text-sm text-fleet-text bg-white"
                    >
                        {METRICS.map((m) => (
                            <option key={m.key} value={m.key}>{m.label}</option>
                        ))}
                    </select>
                )}
            </div>

            {withData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-fleet-secondary text-sm">
                    None of the selected vehicles recorded this metric in the reporting period.
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D9D8D2" />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: '#6B6B63' }}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#6B6B63' }}
                            axisLine={false}
                            tickLine={false}
                            domain={single || metric.key !== 'safetyScore' ? [0, 'auto'] : [0, 100]}
                        />
                        <Tooltip
                            cursor={{ fill: '#D9D8D24D' }}
                            content={<ChartTooltip unit={single ? '' : metric.unit} />}
                        />
                        <Bar dataKey="value" fill="#14304F" radius={[4, 4, 0, 0]} maxBarSize={56} />
                    </BarChart>
                </ResponsiveContainer>
            )}

            {!single && metric.higherIsBetter !== null && (
                <p className="text-xs text-fleet-secondary">
                    {metric.higherIsBetter
                        ? 'Higher is better for this metric.'
                        : 'Lower is better for this metric.'}
                </p>
            )}
        </div>
    )
}

VehicleComparisonChart.propTypes = {
    vehicles: PropTypes.arrayOf(PropTypes.object).isRequired,
}