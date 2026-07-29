import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { getVehicleLocations, getVehiclePositionBuffer } from '@/services/vehicleService'
import LiveFleetMapPlaceholder from '@/components/dashboard/LiveFleetMapPlaceholder'
import FleetMap from '../../components/map/FleetMap'

const EMPTY_FC = { type: 'FeatureCollection', features: [] }

export default function LiveMap() {
  // Matches the FeatureCollection shape getVehiclePositionBuffer now
  // actually returns (previously {} happened to "work" only because the
  // buffer was silently always empty due to the .vehicles bug -- see
  // vehicleService.jsx).
  const [buffer, setBuffer] = useState(EMPTY_FC)
  const [locations, setLocations] = useState(null)
  const [loading, setLoading]     = useState(true)

  async function fetchVehiclePositionBuffer(){
    try{
      const data = await getVehiclePositionBuffer();
      setBuffer(data);
    }catch(err){
      console.error(err);
    }finally{
      setLoading(false);
    }
  }

  async function fetchLocations() {
    try {
      const l = await getVehicleLocations()
      setLocations(l)
    } catch (e) {
      console.warn('LiveMap fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    fetchVehiclePositionBuffer();
    const interval = setInterval(fetchVehiclePositionBuffer, 30000);
    return () => clearInterval(interval)
  },[]);

  useEffect(() => {
    fetchLocations();
    // Was 1000ms -- polling every second for data that, per the ingestion
    // pipeline, only actually changes once per Lambda batch (every 5-10s
    // per the architecture doc). That mismatch was pure wasted load, not
    // extra freshness. 5000ms still comfortably clears the "within 5-10
    // seconds of events" requirement.
    const interval = setInterval(fetchLocations, 5000);
    return () => clearInterval(interval)
  }, [])


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }
  if (!locations) {
    return null
  }

  const active    = locations?.vehicles?.filter(v => v.status === 'active').length ?? 0
  const idle      = locations?.vehicles?.filter(v => v.status === 'idle').length ?? 0
  const offline   = locations?.vehicles?.filter(v => v.status === 'offline').length ?? 0
  const total     = locations?.vehicles?.length ?? 0

  return (
    <div className="space-y-4">
      <LiveFleetMapPlaceholder
        active={active}
        idle={idle}
        offline={offline}
        total={total}
        vehicles={locations?.vehicles}
        buffer={buffer}
      />
    </div>
  )
}
