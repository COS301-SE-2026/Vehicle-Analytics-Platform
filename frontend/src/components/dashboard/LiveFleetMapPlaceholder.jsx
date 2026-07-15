import { useState } from 'react'
import { Truck, X, MapPin, Clock, Waypoints } from 'lucide-react'
import FleetMap from '../map/FleetMap'
import PropTypes from 'prop-types'

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-xs text-gray-700 font-medium">{value}</p>
      </div>
    </div>
  )
}

function VehiclePanel({ vehicle, onClose }) {
  if (!vehicle) return null

  const v = vehicle

  const isMoving = v.status === 'active'
  const statusLabel = isMoving ? 'MOVING' : v.status?.toUpperCase() ?? 'UNKNOWN'
  const statusClass = isMoving
    ? 'bg-green-100 text-green-700'
    : 'bg-amber-100 text-amber-700'

  const location = v.lat && v.lng
    ? `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`
    : v.location || 'Unknown'

  const lastUpdate = (() =>{
    if (!v.last_update) return 'Unknown'
    const value = v.last_update
    if (value instanceof Date) {
      return value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    if (typeof value === 'string') {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }
      return value
    }
    return value
  })()

  return (
    <div className="w-[220px] shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-y-auto">

      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800 text-sm">{v.id}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">{v.device_id || 'Vehicle'}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Speed */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Current Speed</p>
          <p className="text-2xl font-bold text-gray-800">
            {v.speed ?? 0}
            <span className="text-xs font-normal text-gray-400 ml-1">km/h</span>
          </p>
        </div>
        <Truck className={`w-6 h-6 opacity-50 ${isMoving ? 'text-green-700' : 'text-amber-500'}`} />
      </div>

      {/* Details */}
      <div className="px-4 py-3 flex flex-col gap-3 flex-1">
        <DetailRow icon={MapPin} label="Location" value={location} />
        <DetailRow icon={Clock} label="Last Update" value={lastUpdate} />
        <DetailRow icon={Waypoints} label="Odometer" value={v.total_odometer != null ? `${v.total_odometer}` : 'Unknown'} />
        <DetailRow icon={Truck} label="Ignition" value={v.ignition || 'Unknown'} />
        <DetailRow icon={Truck} label="Movement" value={v.movement || 'Unknown'} />
      </div>

    </div>
  )
}

export default function FleetMapPlaceholder({ active, idle, offline, total, vehicles, buffer = [] }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null)

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div className="relative flex-1">

        {/* Fleet Summary Card */}
        <div className="absolute top-4 left-4 z-10 bg-white rounded-xl shadow p-3 w-44">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="text-xs font-semibold text-gray-700">Live Fleet</span>
            </div>
            <span className="text-sm font-bold text-gray-800">{total}</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-xs">
            <div>
              <p className="text-gray-400 uppercase text-[10px]">Moving</p>
              <p className="font-bold text-gray-700">{active}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase text-[10px]">Offline</p>
              <p className="font-bold text-gray-700">{offline}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase text-[10px]">Idle</p>
              <p className="font-bold text-gray-700">{idle}</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Last updated: just now</p>
        </div>

        {/* Real Map */}
        <FleetMap
          vehicles={vehicles}
          buffer={buffer}
          onVehicleClick={setSelectedVehicle}
          minimal={false}
        />
      </div>

      {selectedVehicle && (
        <VehiclePanel
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  )
}

FleetMapPlaceholder.propTypes = {
  active:   PropTypes.number,
  idle:     PropTypes.number,
  offline:  PropTypes.number,
  total:    PropTypes.number,
  vehicles: PropTypes.array,
}

VehiclePanel.propTypes = {
  vehicle: PropTypes.object,
  onClose: PropTypes.func,
}
DetailRow.propTypes = {
  icon:  PropTypes.elementType,
  label: PropTypes.string,
  value: PropTypes.string,
}