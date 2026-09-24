import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, X, MapPin, Clock, Waypoints, Brain, ArrowRight } from 'lucide-react'
import FleetMap from '../map/FleetMap'
import { getVehicleById } from '@/services/vehicleService'
import { getFleetRisk } from '@/services/riskService'
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

const TIER_LABEL = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const TIER_ACCENT = {
  critical: { text: 'text-rose-600',    bg: 'bg-rose-50',    ring: 'ring-rose-200',    button: 'bg-rose-600 hover:bg-rose-700' },
  high:     { text: 'text-orange-600',  bg: 'bg-orange-50',  ring: 'ring-orange-200',  button: 'bg-orange-600 hover:bg-orange-700' },
  medium:   { text: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-200',   button: 'bg-amber-600 hover:bg-amber-700' },
  low:      { text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200', button: 'bg-emerald-600 hover:bg-emerald-700' },
}

function RiskPrompt({ vehicleId, risk, onDismiss, onSeeRisk }) {
  if (!risk || !risk.tier) return null

  const tier = risk.tier
  const label = TIER_LABEL[tier] || tier
  const accent = TIER_ACCENT[tier] || TIER_ACCENT.low
  const isLow = tier === 'low'

  const headline = isLow
    ? `Vehicle ${vehicleId} is Low risk`
    : `Why is vehicle ${vehicleId} ${label}?`

  const body = isLow
    ? "See what's keeping this vehicle safe and its 30-day trend."
    : 'See the top risk factors, coaching plan, and 30-day trend.'

  return (
    <div
      className={`mx-3 mb-3 mt-auto rounded-xl border ${accent.ring} ${accent.bg} p-3 animate-in slide-in-from-bottom-2 fade-in duration-300`}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className={`w-7 h-7 rounded-full ${accent.bg} ring-1 ${accent.ring} flex items-center justify-center shrink-0`}>
          <Brain className={`w-3.5 h-3.5 ${accent.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold ${accent.text} leading-tight`}>
            {headline}
          </p>
          <p className="text-[11px] text-gray-600 mt-1 leading-snug">
            {body}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-gray-400 hover:text-gray-600 shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 text-[11px] font-medium text-gray-600 hover:text-gray-800 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={onSeeRisk}
          className={`flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-medium text-white py-1.5 rounded-md transition ${accent.button}`}
        >
          See risk
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

function VehiclePanel({ vehicle, risk, onClose, onSeeRisk }) {
  const [promptDismissed, setPromptDismissed] = useState(false)

 
  
  useEffect(() => {
    setPromptDismissed(false)
  }, [vehicle?.id])

  if (!vehicle) return null
  const v = vehicle

  const isMoving = v.status === 'active'
  const statusLabel = isMoving ? 'MOVING' : v.status?.toUpperCase() ?? 'UNKNOWN'
  const statusClass = isMoving ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
  const location = v.displayName || v.city
    || (v.lat && v.lng ? `${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}` : 'Unknown')

  const lastUpdate = (() => {
    if (!v.lastUpdate) return 'Unknown'
    const value = v.lastUpdate
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
    <div className="w-[240px] shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden">
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

      <div className="overflow-y-auto flex-1">
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

        <div className="px-4 py-3 flex flex-col gap-3">
          <DetailRow icon={MapPin} label="Location" value={location} />
          <DetailRow icon={Clock} label="Last Update" value={lastUpdate} />
          <DetailRow icon={Waypoints} label="Odometer" value={v.total_odometer != null ? `${v.total_odometer}` : 'Unknown'} />
          <DetailRow icon={Truck} label="Ignition" value={v.ignition || 'Unknown'} />
          <DetailRow icon={Truck} label="Movement" value={v.movement || 'Unknown'} />
        </div>
      </div>

      {!promptDismissed && risk && risk.tier && (
        <RiskPrompt
          vehicleId={v.id}
          risk={risk}
          onDismiss={() => setPromptDismissed(true)}
          onSeeRisk={() => onSeeRisk(v.id)}
        />
      )}
    </div>
  )
}

export default function FleetMapPlaceholder({
  active, idle, offline, total, vehicles, buffer,
  initialView = null,
  onGeofenceClick,
  focusVehicleId = null,
}) {
  const navigate = useNavigate()
  const [selectedVehicleId, setSelectedVehicleId] = useState(null)
  const [fallbackVehicle, setFallbackVehicle] = useState(null)
  const [riskLookup, setRiskLookup] = useState({})

 
  
  useEffect(() => {
    let cancelled = false
    getFleetRisk()
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return
        const map = {}
        rows.forEach((r) => {
          if (!r || !r.vehicle_id) return
          map[r.vehicle_id] = { score: Number(r.risk_score) || 0, tier: r.risk_tier || 'low' }
        })
        setRiskLookup(map)
      })
      .catch((err) => console.warn('FleetMapPlaceholder: risk lookup failed', err))
    return () => { cancelled = true }
  }, [])

  
  
  useEffect(() => {
    if (!focusVehicleId) return
    const inLive = (vehicles ?? []).some(
      (v) => String(v.id) === String(focusVehicleId)
    )
    if (inLive) {
      setFallbackVehicle(null)
      return
    }
    let cancelled = false
    getVehicleById(focusVehicleId)
      .then((result) => {
        if (cancelled || !result) return
        const v = result.vehicle || result
        const lat = Number(v.last_latitude ?? v.lat)
        const lng = Number(v.last_longitude ?? v.lng)
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
        setFallbackVehicle({
          id: String(focusVehicleId),
          lat, lng,
          status: v.status || 'offline',
          speed: v.speed ?? 0,
          lastUpdate: v.last_update || v.lastUpdate || null,
          device_id: v.device_id || 'Vehicle',
          ...v,
        })
      })
      .catch((err) => console.warn('focus fallback lookup failed', err))
    return () => { cancelled = true }
  }, [focusVehicleId, vehicles])

  const mergedVehicles = useMemo(() => {
    if (!fallbackVehicle) return vehicles ?? []
    const exists = (vehicles ?? []).some(
      (v) => String(v.id) === String(fallbackVehicle.id)
    )
    if (exists) return vehicles ?? []
    return [...(vehicles ?? []), fallbackVehicle]
  }, [vehicles, fallbackVehicle])

  useEffect(() => {
    if (!focusVehicleId) return
    setSelectedVehicleId(focusVehicleId)
  }, [focusVehicleId])

  const selectedVehicle = useMemo(() => {
    if (selectedVehicleId === null || selectedVehicleId === undefined) return null
    return (mergedVehicles ?? []).find(
      (v) => String(v.id) === String(selectedVehicleId)
    ) ?? null
  }, [selectedVehicleId, mergedVehicles])

  const handleSeeRisk = (vehicleId) => {
    navigate(`/risk?focus=${encodeURIComponent(vehicleId)}`)
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div className="relative flex-1">
        <div className="absolute top-4 left-4 z-10 bg-white rounded-xl shadow p-3 w-60 h-55">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              <span className="text-md font-semibold text-gray-700">Live Fleet</span>
            </div>
            <span className="text-xl font-bold text-gray-800">{total}</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-md">
            <div>
              <p className="text-gray-400 uppercase text-[12px]">Moving</p>
              <p className="font-bold text-gray-700">{active}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase text-[12px]">Offline</p>
              <p className="font-bold text-gray-700">{offline}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase text-[12px]">Idle</p>
              <p className="font-bold text-gray-700">{idle}</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Last updated: just now</p>
        </div>

        <FleetMap
          vehicles={mergedVehicles}
          buffer={buffer}
          initialView={initialView}
          onGeofenceClick={onGeofenceClick}
          onVehicleClick={(v) => setSelectedVehicleId(v?.id ?? null)}
          minimal={false}
          highlightVehicleId={focusVehicleId}
        />
      </div>

      {selectedVehicleId !== null && selectedVehicle && (
        <VehiclePanel
          vehicle={selectedVehicle}
          risk={riskLookup[String(selectedVehicleId)]}
          onClose={() => setSelectedVehicleId(null)}
          onSeeRisk={handleSeeRisk}
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
  buffer:   PropTypes.object,
  initialView: PropTypes.shape({
    center: PropTypes.arrayOf(PropTypes.number),
    zoom: PropTypes.number,
  }),
  onGeofenceClick: PropTypes.func,
  focusVehicleId:  PropTypes.string,
}

VehiclePanel.propTypes = {
  vehicle: PropTypes.object,
  risk: PropTypes.object,
  onClose: PropTypes.func,
  onSeeRisk: PropTypes.func,
}

RiskPrompt.propTypes = {
  vehicleId: PropTypes.string,
  risk: PropTypes.object,
  onDismiss: PropTypes.func,
  onSeeRisk: PropTypes.func,
}

DetailRow.propTypes = {
  icon:  PropTypes.elementType,
  label: PropTypes.string,
  value: PropTypes.string,
}
