import { useState, useEffect } from 'react'
import { Truck, Waypoints, Activity, RefreshCw } from 'lucide-react'
import { getKPIs, getVehicleLocations, getAlerts, getActivityHistory } from '../../services/vehicleService'
import StatCard from '../../components/dashboard/StatCard'
import FleetStatusCard from '../../components/dashboard/FleetStatusCard'
import MostActiveVehiclesTable from '../../components/dashboard/MostActiveVehiclesTable'
import FleetActivityChart from '../../components/dashboard/FleetActivityChart'
import RecentVehicleEvents from '../../components/dashboard/RecentVehicleEvents'

function formatActivityPoints(points, range) {
  return points.map((point) => {
    const date = new Date(point.bucket)
    const timeLabel = range === 'week'
      ? date.toLocaleDateString('en-US', { weekday: 'short' })
      : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    return {
      time: timeLabel,
      vehicles: point.active_vehicles ?? 0,
    }
  })
}

export default function ManagerDashboard() {
  const [kpis, setKpis] = useState(null)
  const [locations, setLocations] = useState(null)
  const [activityRange, setActivityRange] = useState('week')
  const [activityData, setActivityData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [events, setEvents] = useState([])

  async function fetchAll() {
    try {
      const [k, l, a] = await Promise.all([
        getKPIs(),
        getVehicleLocations(),
        getAlerts(10),
      ])
      setKpis(k)
      setLocations(l)
      setEvents(a.alerts.map(alert => ({
        id: alert.id,
        vehicleId: alert.vehicle_id,
        eventType: alert.type,
        description: alert.message,
        location: `${alert.latitude?.toFixed(4)}, ${alert.longitude?.toFixed(4)}`,
        severity: alert.severity?.toUpperCase(),
        timestamp: alert.timestamp,
      })) ?? [])

      const activityPoints = await getActivityHistory(activityRange).catch(() => [])
      setActivityData(formatActivityPoints(activityPoints, activityRange))
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
    const interval = setInterval(fetchAll, 10000)
    return () => clearInterval(interval)
  }, [activityRange])

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
  const idle = vehicles.filter(v => v.status === 'idle').length
  const offline = vehicles.filter(v => v.status === 'offline').length
  const total = kpis.totalVehicles ?? vehicles.length
  const inMotion = active

  const mostActive = [...vehicles]
    .sort((a, b) => (b.distanceToday ?? b.distance ?? 0) - (a.distanceToday ?? a.distance ?? 0))
    .slice(0, 5)

  const chartTitle = activityRange === 'week'
    ? 'Fleet Activity This Week'
    : 'Fleet Activity Today'

  const chartXLabel = activityRange === 'week'
    ? 'Day of Week'
    : 'Time of Day'

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

      {/* Row 3 — Recent Vehicle Events */}
      <RecentVehicleEvents events={events} limit={10} />

      {/* Row 4 — Fleet Activity Chart */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setActivityRange('day')}
          className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
            activityRange === 'day'
              ? 'border-fleet-green text-fleet-green'
              : 'border-fleet-border text-fleet-secondary hover:text-fleet-text'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setActivityRange('week')}
          className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
            activityRange === 'week'
              ? 'border-fleet-green text-fleet-green'
              : 'border-fleet-border text-fleet-secondary hover:text-fleet-text'
          }`}
        >
          This Week
        </button>
      </div>
      <FleetActivityChart
        data={activityData}
        title={chartTitle}
        xLabel={chartXLabel}
        yDomain={[0, 'dataMax']}
        useFallback={false}
      />

    </div>
  )
}
