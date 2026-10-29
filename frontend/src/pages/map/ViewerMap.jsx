import { useState } from 'react'
import PropTypes from 'prop-types'
import { MapPin, RefreshCw, Truck, X } from 'lucide-react'
import { ViewerFleetMap } from '@/components/map/FleetMap'
import useLiveFleetData from '@/hooks/useLiveFleetData'

function formatLocation(vehicle) {
  if (vehicle.displayName || vehicle.city) return vehicle.displayName || vehicle.city
  if (Number.isFinite(vehicle.lat) && Number.isFinite(vehicle.lng)) {
    return `${vehicle.lat.toFixed(4)}, ${vehicle.lng.toFixed(4)}`
  }
  return 'Unknown'
}

function ViewerVehiclePanel({ vehicle, onClose }) {
  if (!vehicle) return null

  return (
    <aside
      aria-label={`Details for vehicle ${vehicle.id}`}
      className="absolute top-0 right-0 z-20 flex h-full w-[260px] flex-col border-l border-fleet-border bg-white shadow-lg"
    >
      <div className="flex items-start justify-between border-b border-fleet-border px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-fleet-secondary">Vehicle</p>
          <h3 className="mt-1 text-base font-semibold text-fleet-text">{vehicle.id}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close vehicle details"
          className="rounded p-1 text-fleet-secondary hover:bg-gray-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-5 px-4 py-5">
        <div className="flex items-center justify-between border-b border-fleet-border pb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-fleet-secondary">Current speed</p>
            <p className="mt-1 text-2xl font-semibold text-fleet-text">
              {vehicle.speed ?? 0}
              <span className="ml-1 text-xs font-normal text-fleet-secondary">km/h</span>
            </p>
          </div>
          <Truck className="h-6 w-6 text-fleet-secondary" aria-hidden="true" />
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-fleet-secondary" aria-hidden="true" />
          <div>
            <p className="text-xs uppercase tracking-wide text-fleet-secondary">Current location</p>
            <p className="mt-1 text-sm font-medium text-fleet-text">{formatLocation(vehicle)}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

ViewerVehiclePanel.propTypes = {
  vehicle: PropTypes.object,
  onClose: PropTypes.func.isRequired,
}

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

export default function ViewerMap() {
  const { vehicles, buffer, loading, lastUpdated } = useLiveFleetData()
  const [selectedVehicle, setSelectedVehicle] = useState(null)

  const moving = vehicles.filter((v) => v.status === 'active').length
  const idle = vehicles.filter((v) => v.status === 'idle').length
  const offline = vehicles.filter((v) => v.status === 'offline').length

  return (
    <div data-testid="viewer-map" className="relative w-full h-[calc(100vh-6rem)] min-h-[600px]">
      <ViewerFleetMap
        vehicles={vehicles}
        buffer={buffer}
        onVehicleClick={setSelectedVehicle}
      />

      <section
        aria-labelledby="viewer-map-title"
        aria-live="polite"
        className="absolute top-4 left-4 z-10 rounded-2xl border border-fleet-border bg-white/95 px-5 py-4 shadow-md"
      >
        {/* Same title as the staff Live Map, so both read as the same page. */}
        <h2 id="viewer-map-title" className="mb-3 text-sm font-semibold text-fleet-text">Live Fleet</h2>
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

      {selectedVehicle && (
        <ViewerVehiclePanel
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  )
}