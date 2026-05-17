import { useState } from 'react'
import { Truck, X, MapPin, User, Clock, Waypoints, Wifi, ZoomIn, ZoomOut, Layers, Search,  } from 'lucide-react'
import FleetMap from '../map/FleetMap'

const mockVehicleDetail = {
  id: 'VH-0042',
  model: 'TRUCK-DAF-XF-2023',
  status: 'moving',
  currentSpeed: 87,
  location: 'N1 Highway, Near Midrand',
  driverId: 'DRV-294',
  tripDuration: '1h 24m 12s',
  distanceToday: 142.8,
  lastSignal: '2023-10-27 14:22:04',
  gpsSignal: 'EXCELLENT',
}

const mockIdleVehicle = {
  id: 'VH-0031',
  model: 'TRUCK-MAN-TGX-2022',
  status: 'idle',
  currentSpeed: 0,
  location: 'Pretoria CBD, Francise Baard Street',
  driverId: 'DRV-102',
  tripDuration: '0h 00m 00s',
  distanceToday: 45.2,
  lastSignal: '2023-10-27 14:20:11',
  gpsSignal: 'GOOD',
}

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
  const isMoving = vehicle.status === 'active'

  return (
    <div className="w-[220px] shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800 text-sm">{vehicle.id}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${
              isMoving ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {vehicle.status}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">ID: {vehicle.id}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Current Speed</p>
          <p className="text-2xl font-bold text-gray-800">
            {/* Speed  */}
            {vehicle.currentSpeed ?? vehicle.speed ?? 0}
            <span className="text-xs font-normal text-gray-400 ml-1">km/h</span>
          </p>

          {/* location - handle missing lat/long */}
          <DetailRow
            icon={MapPin}
            label="Locaction"
            value={vehicle.lat && vehicle && vehicle.lng
              ? `${vehicle.lat.toFoxed(4)}, ${vehicle.lng.toFixed(4)}`
              : vehicle.location || 'Unknown'
            }
          />
        </div>
        <Truck className={`w-6 h-6 opacity-50 ${isMoving ? 'text-green-700' : 'text-amber-500'}`} />
      </div>

      <div className="px-4 py-3 flex flex-col gap-3 flex-1">
        <DetailRow icon={MapPin} label="Location" value={ vehicle.lat ? `${vehicle.lat.toFixed(4)}, ${vehicle.lng.toFixed(4)}` : 'Unknown'} />
        <DetailRow icon={Wifi} label="GPS Signal" value="Excellent" />
      </div>

      <div className="px-4 pb-4">
        <button className="w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          View Current Trip
        </button>
      </div>
    </div>
  )
}

export default function FleetMapPlaceholder({ active, idle, offline, total, vehicles = [] }) {
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = search
    ? vehicles.filter(v => v.id.toLowerCase().includes(search.toLowerCase()))
    : vehicles

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

         {/* Search Bar */}
        {/* ADD SEARCH BAR AND FUNCTIONALITY LATER  */}

        {/* Real Map */}
        <FleetMap
          vehicles={filtered}
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
