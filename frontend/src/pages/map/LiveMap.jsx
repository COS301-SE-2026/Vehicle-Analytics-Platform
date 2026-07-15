import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { getVehicleLocations, getVehiclePositionBuffer } from '@/services/vehicleService'
import LiveFleetMapPlaceholder from '@/components/dashboard/LiveFleetMapPlaceholder'
import FleetMap from '../../components/map/FleetMap'

export default function LiveMap() {
  const [buffer, setBuffer] = useState({})
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
    const interval = setInterval(fetchLocations, 1000);
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