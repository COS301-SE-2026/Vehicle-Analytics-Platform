import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function SafetyTooltip ({active, payload, label}){
    if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-fleet-border bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-fleet-text">{label}</p>
      <p className="text-fleet-secondary">
        Safety score: <span className="font-medium text-fleet-text">{payload[0].value}</span>
      </p>
    </div>
  )
}

export default function FleetSafetyScoreTrend({ data = [], title = 'Fleet Safety Score Trend' }) {
  return (
    <div className="rounded-xl border border-fleet-border bg-white p-4 h-full">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-fleet-secondary mb-3">
        {title}
      </h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-fleet-secondary text-sm">
          No data available
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-fleet-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-fleet-secondary" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={30} className="text-fleet-secondary" />
              <Tooltip content={<SafetyTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="blue"
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0, fill: '#16a34a' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}