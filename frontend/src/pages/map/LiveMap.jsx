import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { getVehicleLocations, getVehiclePositionBuffer } from '@/services/vehicleService'
import LiveFleetMapPlaceholder from '@/components/dashboard/LiveFleetMapPlaceholder'
import { useSearchParams } from 'react-router-dom';

const EMPTY_FC = { type: 'FeatureCollection', features: [] }
const DEFAULT_CENTER = [28.2293, -25.75456];
const DEFAULT_ZOOM = 12;

const BUFFER_POLL_MS = 10000
const LOCATIONS_POLL_MS = 2000

function readInitialViewFromQuery() {
  const params = new URLSearchParams(window.location.search)
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  const zoom = Number(params.get('zoom'))

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    };
  }

  return {
    center: [lng, lat],
    zoom: Number.isFinite(zoom) ? zoom : DEFAULT_ZOOM,
  };
}

export default function LiveMap() {
  const [searchParams] = useSearchParams();
  const [buffer, setBuffer] = useState(EMPTY_FC)
  const [locations, setLocations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialView] = useState(() => readInitialViewFromQuery())
  const bufferInFlight = useRef(false)
  const locationsInFlight = useRef(false)
  const cancelled = useRef(false)

  // Clean URL params on mount
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('lat') && !url.searchParams.has('lng') && !url.searchParams.has('zoom')) {
      return
    }
    url.searchParams.delete('lat')
    url.searchParams.delete('lng')
    url.searchParams.delete('zoom')
    const next = `${url.pathname}${url.search ? `?${url.searchParams.toString()}` : ''}${url.hash}`
    window.history.replaceState({}, '', next)
  }, [])

  function handleGeofenceClick(properties) {
    const zoneId = properties?.id
    if (zoneId == null) return
    window.location.assign(`/geofence?zoneId=${encodeURIComponent(String(zoneId))}`)
  }

  const fetchVehiclePositionBuffer = useCallback(async () => {
    if (bufferInFlight.current) return
    bufferInFlight.current = true
    try {
      const data = await getVehiclePositionBuffer()
      if (!cancelled.current) setBuffer(data)
    } catch (err) {
      console.error('LiveMap buffer fetch failed:', err)
    } finally {
      bufferInFlight.current = false
    }
  }, [])

  const fetchLocations = useCallback(async () => {
    if (locationsInFlight.current) return
    locationsInFlight.current = true
    try {
      const l = await getVehicleLocations()
      if (!cancelled.current) setLocations(l)
    } catch (e) {
      console.warn('LiveMap fetch failed:', e)
    } finally {
      locationsInFlight.current = false
      if (!cancelled.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    cancelled.current = false
    return () => { cancelled.current = true }
  }, [])
  useEffect(() => {
    let timer = null

    async function poll() {
      await fetchVehiclePositionBuffer()
      if (cancelled.current) return
      timer = setTimeout(poll, BUFFER_POLL_MS)
    }

    poll()
    return () => { if (timer) clearTimeout(timer) }
  }, [fetchVehiclePositionBuffer])

  useEffect(() => {
    let timer = null

    async function poll() {
      await fetchLocations()
      if (cancelled.current) return
      timer = setTimeout(poll, LOCATIONS_POLL_MS)
    }

    poll()
    return () => { if (timer) clearTimeout(timer) }
  }, [fetchLocations])

  const safeVehicles = locations?.vehicles || []
  const active  = safeVehicles.filter(v => v.status === 'active').length
  const idle    = safeVehicles.filter(v => v.status === 'idle').length
  const offline = safeVehicles.filter(v => v.status === 'offline').length
  const total   = safeVehicles.length

  return (
    <div className="relative w-full h-[calc(100vh-6rem)] min-h-[600px]">
      {loading && (
        <div className="absolute top-4 right-4 z-50 bg-white p-2 rounded-full shadow-md">
          <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
        </div>
      )}

      <LiveFleetMapPlaceholder
        active={active}
        idle={idle}
        offline={offline}
        total={total}
        vehicles={safeVehicles}
        buffer={buffer}
        initialView={initialView}
        onGeofenceClick={handleGeofenceClick}
      />
    </div>
  )
}