import { AlertTriangle, Zap, Power, PlayCircle } from 'lucide-react'
import PropTypes from 'prop-types'

const MOCK_EVENTS = [
  {
    id: 'evt-001',
    vehicleId: 'VH-0042',
    eventType: 'speeding',
    description: 'Exceeded speed limit: 95 km/h in 80 zone',
    location: 'N1 Highway, Midrand',
    severity: 'HIGH',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'evt-002',
    vehicleId: 'VH-0031',
    eventType: 'harsh_braking',
    description: 'Harsh braking detected',
    location: 'R21 Highway',
    severity: 'MEDIUM',
    timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  {
    id: 'evt-003',
    vehicleId: 'VH-0007',
    eventType: 'engine_off',
    description: 'Engine turned off',
    location: 'Sandton Depot',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: 'evt-004',
    vehicleId: 'VH-0055',
    eventType: 'engine_on',
    description: 'Engine started',
    location: 'OR Tambo, Johannesburg',
    severity: 'LOW',
    timestamp: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
  },
  {
    id: 'evt-005',
    vehicleId: 'VH-0019',
    eventType: 'speeding',
    description: 'Exceeded speed limit: 112 km/h in 100 zone',
    location: 'N14 Highway, Krugersdorp',
    severity: 'HIGH',
    timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
]

const SEVERITY_STYLES = {
  HIGH: 'bg-red-100 text-fleet-alert border border-red-200',
  MEDIUM: 'bg-orange-100 text-fleet-warning border border-orange-200',
  LOW: 'bg-gray-100 text-fleet-secondary border border-gray-200',
}

const EVENT_ICONS = {
  speeding: { icon: AlertTriangle, color: 'text-fleet-alert bg-red-50' },
  harsh_braking: { icon: Zap, color: 'text-fleet-warning bg-orange-50' },
  engine_off: { icon: Power, color: 'text-fleet-secondary bg-gray-50' },
  engine_on: { icon: PlayCircle, color: 'text-fleet-green bg-green-50' },
  default: { icon: AlertTriangle, color: 'text-fleet-secondary bg-gray-50' },
}

function getEventIcon(eventType) {
  const key = eventType?.toLowerCase().replace(' ', '_')
  return EVENT_ICONS[key] ?? EVENT_ICONS.default
}

function formatTime(timestamp) {
  if (!timestamp) return 'Unknown'
  const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function RecentVehicleEvents({ events, limit = 10 }) {
  // Use passed events if available, otherwise fall back to mock data
  const data = events && events.length > 0 ? events : MOCK_EVENTS
  const displayed = data.slice(0, limit)

  return (
    <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5">

      {/* Header */}
      <div className="mb-4">
        <h2 className="font-display font-bold text-fleet-text text-base">
          Recent Vehicle Events
        </h2>
        <p className="text-xs text-fleet-secondary mt-0.5">
          Showing last {displayed.length} events
        </p>
      </div>

      <div className="flex flex-col divide-y divide-fleet-border">
        {displayed.map((event, index) => {
          const { icon: Icon, color } = getEventIcon(event.eventType)

          return (
            <div
              key={event.id ?? index}
              className="flex items-center gap-4 py-3 hover:bg-fleet-bg transition-colors rounded-lg px-2"
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Event Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-fleet-text font-medium truncate">
                  <span className="font-mono">{event.vehicleId}</span>
                  {' · '}
                  {event.description}
                </p>
                <p className="text-xs text-fleet-secondary truncate mt-0.5">
                  {event.location}
                </p>
              </div>

              {/* Severity Badge */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${SEVERITY_STYLES[event.severity] ?? SEVERITY_STYLES.LOW}`}>
                {event.severity}
              </span>

              {/* Time */}
              <span className="text-xs text-fleet-secondary shrink-0 w-16 text-right">
                {formatTime(event.timestamp)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

RecentVehicleEvents.propTypes = {
  events: PropTypes.array,
  limit:  PropTypes.number,
}