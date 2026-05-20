import { useState, useEffect } from 'react'
import { Truck, Waypoints, Activity, RefreshCw } from 'lucide-react'
import { getKPIs, getVehicleLocations, getAlerts } from '../../services/vehicleService'
import StatCard from '../../components/dashboard/StatCard'
import FleetStatusCard from '../../components/dashboard/FleetStatusCard'
import MostActiveVehiclesTable from '../../components/dashboard/MostActiveVehiclesTable'
import FleetActivityChart from '../../components/dashboard/FleetActivityChart'
import RecentVehicleEvents from '../../components/dashboard/RecentVehicleEvents'

export default function ManagerDashboard() {
  const [kpis, setKpis] = useState(null)
  const [locations, setLocations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchAll() {
    try {
      const [k, l, a] = await Promise.all([
        getKPIs(),
        getVehicleLocations(),
        getAlerts(10),
      ])
      setKpis(k)
      setLocations(l)
      setEvents(a)
      setError(null)
    } catch (err) {
      console.error('ManagerDashboard fetch error:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 10_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-fleet-secondary animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-fleet-alert text-sm">{error}</p>
      </div>
    )
  }

  if (!kpis || !locations) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-fleet-secondary text-sm">No data available</p>
      </div>
    )
  }

  const vehicles = locations.vehicles ?? []
  const active  = vehicles.filter(v => v.status === 'active').length
  const idle    = vehicles.filter(v => v.status === 'idle').length
  const offline = vehicles.filter(v => v.status === 'offline').length
  const total   = kpis.totalVehicles ?? vehicles.length
  const inMotion = active


  const mostActive = [...vehicles]
    .sort((a, b) => (b.distanceToday ?? b.distance ?? 0) - (a.distanceToday ?? a.distance ?? 0))
    .slice(0, 5)

  return (
    <div className="space-y-4">

      {/* Row 1 — KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Truck}
          label="Active Vehicles"
          value={kpis.activeVehicles ?? active}
          sub={`of ${total} total`}
        />
        <StatCard
          icon={Waypoints}
          label="Total Distance Today"
          value={kpis.totalDistance ?? '—'}
          sub="km across fleet"
        />
        <StatCard
          icon={Activity}
          label="Vehicles In Motion"
          value={inMotion}
          sub="currently moving"
          valueColor="text-fleet-green"
        />
      </div>

      {/* Row 2 — Fleet Status + Most Active */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <FleetStatusCard
            active={active}
            idle={idle}
            offline={offline}
            total={total}
          />
        </div>
        <div className="lg:col-span-2">
          <MostActiveVehiclesTable vehicles={mostActive} />
        </div>
      </div>

      {/* Row 3 — Recent Vehicle Events (sourced from /dashboard/alerts) */}
      <RecentVehicleEvents events={events} limit={10} />

      {/* Row 4 — Fleet Activity Chart (pending /dashboard/activity endpoint) */}
      <FleetActivityChart data={activityData} />

    </div>
  )
}
