import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import PropTypes from 'prop-types'

const DEFAULT_DATA = [
  { time: '06:00', vehicles: 3 },
  { time: '08:00', vehicles: 9 },
  { time: '10:00', vehicles: 11 },
  { time: '12:00', vehicles: 8 },
  { time: '14:00', vehicles: 12 },
  { time: '16:00', vehicles: 11 },
  { time: '18:00', vehicles: 7 },
  { time: '20:00', vehicles: 4 },
]

export default function FleetActivityChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5 flex items-center justify-center h-64">
        <p className="text-fleet-secondary text-sm">No fleet activity data available</p>
      </div>
    )
  }

  return (
    <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-fleet-text text-base">
          Fleet Activity Today
        </h2>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-fleet-green inline-block" />
          <span className="text-xs text-fleet-secondary">Active Vehicles</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
          barCategoryGap="30%"
          barGap={4}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#D9D8D2"
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#6B6B63' }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'Time of Day',
              position: 'insideBottom',
              offset: -2,
              fontSize: 11,
              fill: '#6B6B63'
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B6B63' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 15]}
            label={{
              value: 'Vehicles Active',
              angle: -90,
              position: 'insideLeft',
              fontSize: 11,
              fill: '#6B6B63'
            }}
          />
          <Tooltip
            contentStyle={{
              background: '#FFFFFF',
              border: '1px solid #D9D8D2',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value} vehicles`, 'Active']}
          />
          <Bar
            dataKey="vehicles"
            fill="#4D7C5F"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

FleetActivityChart.propTypes = { data: PropTypes.array }