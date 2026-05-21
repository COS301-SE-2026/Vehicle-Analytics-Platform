import { useState, useEffect } from 'react'
import { Truck, Waypoints, Users, RefreshCw } from 'lucide-react'
import { getKPIs, getVehicleLocations, getUsers } from '../../services/vehicleService'
import StatCard from '../../components/dashboard/StatCard'
import FleetStatusCard from '../../components/dashboard/FleetStatusCard'
import MostActiveVehiclesTable from '../../components/dashboard/MostActiveVehiclesTable'
import FleetActivityChart from '../../components/dashboard/FleetActivityChart'
import UserManagementTable from '../../components/dashboard/UserManagementTable'
import DataFeedStatusCard from '../../components/dashboard/DataFeedStatusCard'
import EditUserModal from '../../components/dashboard/EditUserModal'
import RecentVehicleEvents from '../../components/dashboard/RecentVehicleEvents'
import DeactivateUserModal from '@/components/dashboard/DeactivateUserModal'

// Placeholder activation handler kept at module scope to satisfy linting rules.
function handleActivate(user) {
  // Wire up API call later
  // Intentionally module-scoped to avoid redefining inside the component.
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState(null)
  const [locations, setLocations] = useState(null)
  const [users, setUsers] = useState([])
  const [events] = useState([])
  const [editingUser, setEditingUser] = useState(null)
  const [deactivatingUser, setDeactivatingUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastDataReceived, setLastDataReceived] = useState(new Date())

  async function fetchAll() {
    try {
      const [k, l, u] = await Promise.all([
        getKPIs(),
        getVehicleLocations(),
        getUsers(),
      ])
      setKpis(k)
      setLocations(l)
      setUsers(u)
      setLastDataReceived(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 10000)
    return () => clearInterval(interval)
  }, [])

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

  const vehicles = locations.vehicles ?? []
  const active = vehicles.filter(v => v.status === 'active').length
  const idle = vehicles.filter(v => v.status === 'idle').length
  const offline = vehicles.filter(v => v.status === 'offline').length
  const total = kpis.totalVehicles ?? vehicles.length

  const mostActive = [...vehicles]
    .sort((a, b) => (b.distanceToday ?? 0) - (a.distanceToday ?? 0))
    .slice(0, 5)

  const adminCount = users.filter(u => u.role === 'admin').length
  const managerCount = users.filter(u => u.role === 'manager').length
  const viewerCount = users.filter(u => u.role === 'viewer').length

  function handleEdit(user) {
    setEditingUser(user) 
    // Wire up modal later
  }

  function handleDeactivate(user) {
    setDeactivatingUser(user)
    // Wire up API call later
  }

  // Uses module-scoped `handleActivate`

  function handleDeactivateConfirm(user) {
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'inactive' } : u))
    setDeactivatingUser(null)
    // Wire up API call here later
  }

  async function handleSaveRole(user, newRole) {
   setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
  }

  return (
    <div className="space-y-4">

      {/* Row 1 — Four KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Truck}
          label="Active Vehicles"
          value={kpis.activeVehicles ?? active}
          sub={`of ${total} total`}
        />
        <StatCard
          icon={Waypoints}
          label="Total Distance Today"
          value={kpis.totalDistance ?? 0}
          sub="km across fleet"
        />
        <StatCard
          icon={Users}
          label="Registered Users"
          value={users.length}
          sub={`${adminCount} Admin · ${managerCount} Mgr · ${viewerCount} Vwr`}
        />
        <DataFeedStatusCard
          isLive={kpis !== null}
          lastReceived={lastDataReceived.toISOString()}
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

      {/* Row 3 — User Management */}
      <UserManagementTable
        users={users}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
        onActivate={handleActivate}
      />

      {/* Row 4 — Recent Vehicle Events */}
      <RecentVehicleEvents events={events} limit={10} />


      {/* Row 5 — Fleet Activity Chart */}
      <FleetActivityChart />

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveRole}
        />
      )}

       {/* Deactivate User Modal */}
      <DeactivateUserModal
        isOpen={!!deactivatingUser}
        user={deactivatingUser}
        onConfirm={handleDeactivateConfirm}
        onCancel={() => setDeactivatingUser(null)}
      />

    </div>
  )
}