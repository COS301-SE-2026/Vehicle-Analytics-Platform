import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { getVehicleLocations, getVehiclePositionBuffer } from '@/services/vehicleService'
import LiveFleetMapPlaceholder from '@/components/dashboard/LiveFleetMapPlaceholder'
import { useSearchParams } from 'react-router-dom';

const EMPTY_FC = { type: 'FeatureCollection', features: [] }
const DEFAULT_CENTER = [28.2293, -25.75456];
const DEFAULT_ZOOM = 12;

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

  async function fetchVehiclePositionBuffer(){
    try{
      const data = await getVehiclePositionBuffer();
      setBuffer(data);
    }catch(err){
      console.error(err);
    }
  }

  async function fetchLocations() {
    try {
      const l = await getVehicleLocations()
      setLocations(l)
    } catch (e) {
      console.warn('LiveMap fetch failed:', e)
    } finally {
      // Data is loaded
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVehiclePositionBuffer();
    const interval = setInterval(fetchVehiclePositionBuffer, 10000);
    return () => clearInterval(interval)
  },[]);

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 2000);
    return () => clearInterval(interval)
  }, [])

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