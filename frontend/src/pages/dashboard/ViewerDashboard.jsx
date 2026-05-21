import { useState, useEffect } from 'react'
import { Truck, Waypoints, RefreshCw } from 'lucide-react'
import { getKPIs, getVehicleLocations } from '../../services/vehicleService'
import StatCard from '../../components/dashboard/StatCard'
import DonutChart from '../../components/dashboard/DonutChart'
import MapSection from '../../components/dashboard/mapPlaceholder'

export default function ViewerDashboard() {
  const [kpis, setKpis]           = useState(null)
  const [locations, setLocations] = useState(null)
  const [loading, setLoading]     = useState(true)

  async function fetchAll() {
    try {
      const[k, l] = await Promise.all([getKPIs(), getVehicleLocations()])
      setKpis(k)
      setLocations(l)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll() 
    const interval = setInterval(fetchAll, 10000)
    return () => clearInterval(interval)
  }, [])

  if(loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    )
  }

  const active  = kpis.activeVehicles
  const idle    = kpis.idleVehicles ?? locations.vehicles.filter(v => v.status === 'idle').length
  const offline = kpis.offlineVehicles ?? locations.vehicles.filter(v => v.status === 'offline').length
  const total   = kpis.totalVehicles

 return (
    <div className="space-y-6">

      {/* 2 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={Truck}
          label="Active Vehicles"
          value={kpis.activeVehicles}
          sub={`of ${kpis.totalVehicles} total`}
        />
        <StatCard
          icon={Waypoints}
          label="Total Distance Today"
          value={847}
          sub="kilometres across fleet"
        />
      </div>

      {/* Map & Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MapSection
            active={active}
            idle={idle}
            offline={offline}
            total={total}
            vehicles={locations.vehicles}
          />
        </div>
        <DonutChart
          active={active}
          idle={idle}
          offline={offline}
          total={total}
        />
      </div>

    </div>
  )
}
