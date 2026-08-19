import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import PropTypes from 'prop-types'
import { getActivityHistory } from '@/services/vehicleService'

export default function FleetActivityChart({
  range = 'day',
  title = 'Fleet Activity Today',
  xLabel = 'Time of Day',
  yLabel = 'Vehicles Active',
  yDomain = [0, 15],
}) {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadActivity = useCallback(() => {
    setIsLoading(true)
    setLoadError(false)
    return getActivityHistory(range)
      .then((points) => {
        setData(points)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch activity history:', err)
        setLoadError(true)
        setIsLoading(false)
      })
  }, [range])

  useEffect(() => {
    void Promise.resolve().then(loadActivity)
  }, [loadActivity])

  const hasData = !isLoading && !loadError && data.length > 0

  return (
    <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-fleet-text text-base">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-fleet-blue inline-block" />
          <span className="text-xs text-fleet-secondary">Active Vehicles</span>
        </div>
      </div>

      {isLoading && (
        <div className="h-[220px] flex items-center justify-center text-fleet-secondary text-sm">
          Loading…
        </div>
      )}

      {!isLoading && loadError && (
        <div className="h-[220px] flex items-center justify-center text-fleet-alert text-sm">
          Couldn't load activity data.
        </div>
      )}

      {!isLoading && !loadError && !hasData && (
        <div className="h-[220px] flex items-center justify-center text-fleet-secondary text-sm">
          No activity data available
        </div>
      )}

      {hasData && (
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
                value: xLabel,
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
              domain={yDomain}
              label={{
                value: yLabel,
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
              fill="#14304F"
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

FleetActivityChart.propTypes = {
  range: PropTypes.oneOf(['day', 'week']),
  title: PropTypes.string,
  xLabel: PropTypes.string,
  yLabel: PropTypes.string,
  yDomain: PropTypes.array,
}
