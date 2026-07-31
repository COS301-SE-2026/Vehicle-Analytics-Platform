import { AlertOctagon, Gauge, ShieldAlert, TrendingUp, RotateCw } from 'lucide-react'

const EVENT_ICONS = {
    'Harsh Braking': { icon: AlertOctagon, color: 'text-red-500' },
    Speeding: { icon: Gauge, color: 'text-orange-500' },
    'Crash Detection': { icon: ShieldAlert, color: 'text-fleet-secondary' },
    'Harsh Acceleration': { icon: TrendingUp, color: 'text-amber-500' },
    'Harsh Cornering': { icon: RotateCw, color: 'text-yellow-500' },
}

export default function FleetEventBreakdown({ events = [] }) {
  return (
    <div className="rounded-xl border border-fleet-border bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-fleet-secondary mb-3">
        Fleet Event Breakdown
      </h3>
      <ul className="space-y-2.5">
        {events.map(({ type, count }) => {
          const config = EVENT_ICONS[type] ?? { icon: AlertOctagon, color: 'text-fleet-secondary' }
          const Icon = config.icon
          return (
            <li key={type} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-fleet-text">
                <Icon className={`w-4 h-4 ${config.color}`} />
                {type}
              </span>
              <span className="font-medium text-fleet-text">{count}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}