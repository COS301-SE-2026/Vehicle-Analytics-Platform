import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Zap, Power, PlayCircle, RefreshCw } from 'lucide-react'
import PropTypes from 'prop-types'
import { getAlerts } from '@/services/vehicleService'

const SEVERITY_STYLES = {
  HIGH: 'bg-red-100 text-fleet-alert border border-red-200',
  MEDIUM: 'bg-orange-100 text-fleet-warning border border-orange-200',
  LOW: 'bg-gray-100 text-fleet-secondary border border-gray-200',
}

const EVENT_ICONS = {
  crash: { icon: AlertTriangle, color: 'text-fleet-alert bg-red-50' },
  harsh_braking: { icon: Zap, color: 'text-fleet-warning bg-orange-50' },
  harsh_acceleration: { icon: Zap, color: 'text-fleet-warning bg-orange-50' },
  harsh_cornering: { icon: Zap, color: 'text-fleet-warning bg-orange-50' },
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

export default function RecentVehicleEvents({ limit = 10 }) {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadEvents = useCallback(() => {
    setIsLoading(true)
    setLoadError(false)
    return getAlerts(limit)
      .then((result) => {
        setEvents(result.alerts)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch recent events:', err)
        setLoadError(true)
        setIsLoading(false)
      })
  }, [limit])

  useEffect(() => {
    void Promise.resolve().then(loadEvents)
  }, [loadEvents])

  return (
    <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-fleet-text text-base">
            Recent Vehicle Events
          </h2>
          <p className="text-xs text-fleet-secondary mt-0.5">
            {isLoading ? 'Loading…' : `Showing last ${events.length} events`}
          </p>
        </div>
        <button
          type="button"
          onClick={loadEvents}
          className="text-fleet-secondary hover:text-fleet-text transition-colors"
          aria-label="Refresh events"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loadError && (
        <p className="text-sm text-fleet-alert py-4 text-center">
          Couldn't load recent events. Try refreshing.
        </p>
      )}

      {!loadError && !isLoading && events.length === 0 && (
        <p className="text-sm text-fleet-secondary py-4 text-center">
          No recent events.
        </p>
      )}

      {!loadError && events.length > 0 && (
        <div className="flex flex-col divide-y divide-fleet-border">
          {events.map((event, index) => {
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
      )}
    </div>
  )
}

RecentVehicleEvents.propTypes = {
  limit: PropTypes.number,
}
