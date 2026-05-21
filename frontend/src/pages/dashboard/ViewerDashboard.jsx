import { useState, useEffect } from 'react'
import { Truck, Waypoints, Activity, RefreshCw } from 'lucide-react'
import { getKPIs, getVehicleLocations } from '../../services/vehicleService'
import StatCard from '../../components/dashboard/StatCard'
import FleetStatusCard from '../../components/dashboard/FleetStatusCard'
import MostActiveVehiclesTable from '../../components/dashboard/MostActiveVehiclesTable'
import RecentVehicleEvents from '../../components/dashboard/RecentVehicleEvents'
import FleetActivityChart from '../../components/dashboard/FleetActivityChart'
import DataFeedStatusCard from '../../components/dashboard/DataFeedStatusCard'
import DonutChart from '../../components/dashboard/DonutChart'
import MapSection from '../../components/dashboard/LiveFleetMapPlaceholder'

export default function ViewerDashboard() {
  const [kpis, setKpis] = useState(null)
  const [locations, setLocations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [k, l] = await Promise.all([
          getKPIs(),
          getVehicleLocations(),
        ])
        setKpis(k)
        setLocations(l)
        setError(null)
      } catch (err) {
        console.error('ViewerDashboard fetch error:', err)
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-fleet-alert">Failed to load dashboard data</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-fleet-secondary animate-spin" />
      </div>
    )
  }

  if (!kpis || !locations) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-fleet-secondary">No data available</p>
      </div>
    )
  }

  const active = kpis.activeVehicles
  const idle = kpis.idleVehicles ?? locations.vehicles.filter(v => v.status === 'idle').length
  const offline = kpis.offlineVehicles ?? locations.vehicles.filter(v => v.status === 'offline').length
  const total = kpis.totalVehicles

  const vehicles = locations.vehicles ?? []
  const mostActive = [...vehicles]
    .sort((a, b) => (b.distanceToday ?? 0) - (a.distanceToday ?? 0))
    .slice(0, 5)

  return (
    <div className="space-y-4">
      {/* Row 1 — Four KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Truck}
          label="Active Vehicles"
          value={active}
          sub={`of ${total} total`}
        />
        <StatCard
          icon={Waypoints}
          label="Total Distance Today"
          value={kpis.totalDistance ?? 0}
          sub="km across fleet"
        />
        <DataFeedStatusCard
          isLive={kpis !== null}
          lastReceived={new Date().toISOString()}
        />
      </div>

      {/* Row 2 — Fleet Status + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <FleetStatusCard
            active={active}
            idle={idle}
            offline={offline}
            total={total}
          />
          <div className="mt-4">
            <DonutChart active={active} idle={idle} offline={offline} total={total} />
          </div>
        </div>
        <div className="lg:col-span-2">
          <MapSection />
        </div>
      </div>

      {/* Row 3 — Most Active Vehicles */}
      <MostActiveVehiclesTable vehicles={mostActive} />

      {/* Row 4 — Recent Vehicle Events */}
      <RecentVehicleEvents limit={10} />

      {/* Row 5 — Fleet Activity Chart */}
      <FleetActivityChart />
    </div>
  )
}
