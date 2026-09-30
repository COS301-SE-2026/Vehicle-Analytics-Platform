import PropTypes from 'prop-types'
import { RefreshCw } from 'lucide-react'
import { ViewerFleetMap } from '@/components/map/FleetMap'
import useLiveFleetData from '@/hooks/useLiveFleetData'

function Count({ label, value, dotClass }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-fleet-secondary">
        <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-semibold text-fleet-text">{value}</p>
    </div>
  )
}

Count.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  dotClass: PropTypes.string.isRequired,
}

/**
 * Live map for the viewer role: every vehicle's live position, and nothing
 * else. No risk tiers, no geofences, no links into vehicle details.
 */
export default function ViewerMap() {
  const { vehicles, buffer, loading, lastUpdated } = useLiveFleetData()

  const moving = vehicles.filter((v) => v.status === 'active').length
  const idle = vehicles.filter((v) => v.status === 'idle').length
  const offline = vehicles.filter((v) => v.status === 'offline').length

  return (
    <div className="relative w-full h-[calc(100vh-6rem)] min-h-[600px]">
      <ViewerFleetMap vehicles={vehicles} buffer={buffer} />

      <section
        aria-label="Fleet status"
        aria-live="polite"
        className="absolute top-4 left-4 z-10 rounded-2xl border border-fleet-border bg-white/95 px-5 py-4 shadow-md"
      >
        <div className="grid grid-cols-3 gap-6">
          <Count label="Moving" value={moving} dotClass="bg-fleet-green" />
          <Count label="Idle" value={idle} dotClass="bg-amber-500" />
          <Count label="Offline" value={offline} dotClass="bg-gray-400" />
        </div>
        <p className="mt-3 text-xs text-fleet-secondary">
          {lastUpdated
            ? `${vehicles.length} vehicles · updated ${lastUpdated.toLocaleTimeString()}`
            : 'Loading vehicles…'}
        </p>
      </section>

      {loading && (
        <div className="absolute top-4 right-16 z-10 rounded-full bg-white p-2 shadow-md">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-500" aria-label="Loading" />
        </div>
      )}
    </div>
  )
}
