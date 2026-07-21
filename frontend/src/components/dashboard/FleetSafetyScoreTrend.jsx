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