import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { getVehicleLocations } from '@/services/vehicleService'
import LiveFleetMapPlaceholder from '@/components/dashboard/LiveFleetMapPlaceholder'

export default function LiveMap() {
  const [locations, setLocations] = useState(null)
  const [loading, setLoading]     = useState(true)

  async function fetchLocations() {
    try {
      const l = await getVehicleLocations()
      setLocations(l)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLocations()
    const interval = setInterval(fetchLocations, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  const active    = locations.vehicles.filter(v => v.status === 'active').length
  const idle      = locations.vehicles.filter(v => v.status === 'idle').length
  const offline   = locations.vehicles.filter(v => v.status === 'offline').length
  const total     = locations.vehicles.length

  return (
    <div className="space-y-4">
      <LiveFleetMapPlaceholder
        active={active}
        idle={idle}
        offline={offline}
        total={total}
        vehicles={locations.vehicles}
      />
    </div>
  )
}