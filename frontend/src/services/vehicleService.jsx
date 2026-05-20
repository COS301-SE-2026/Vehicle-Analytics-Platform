const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function getAuthHeaders() {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth')
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
  } catch {
    return { 'Content-Type': 'application/json' }
  }
}

// GET /api/dashboard/kpis
export async function getKPIs() {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}/api/dashboard/kpis`, { headers })
  if (!res.ok) throw new Error('Failed to fetch KPIs')
  const data = await res.json()
  return {
    totalVehicles: data.data.total_vehicles,
    activeVehicles: data.data.active_vehicles,
    alertsToday: data.data.alerts_today,
    lastUpdated: data.data.last_updated,
  }
}

// GET /api/vehicles/locations
export async function getVehicleLocations() {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}/api/vehicles/locations`, { headers })
  if (!res.ok) throw new Error('Failed to fetch vehicle locations')
  const data = await res.json()
  return {
    timestamp: data.data.timestamp,
    vehicles: data.data.vehicles.map(v => ({
      id: v.id,
      lat: parseFloat(v.latitude),
      lng: parseFloat(v.longitude),
      speed: v.speed,
      status: v.status,
      driver_name: v.driver_name,
      last_update: v.last_update,
    })),
  }
}

// GET /api/dashboard/alerts
export async function getAlerts(limit = 50) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}/api/dashboard/alerts?limit=${limit}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch alerts')
  const data = await res.json()
  return {
    total: data.data.total,
    alerts: data.data.alerts,
  }
}

// GET /api/vehicles/:vehicleId
export async function getVehicleById(vehicleId) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch vehicle details')
  const data = await res.json()
  return {
    vehicle: data.data.vehicle,
    recent_events: data.data.recent_events,
  }
}

// GET /api/users (admin only)
export async function getUsers() {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}/api/admin/users`, { headers })
  if (!res.ok) throw new Error('Failed to fetch users')
  const data = await res.json()
  return data.data
}

// PATCH /api/admin/users/:userId/role
export async function updateUserRole(userId, role) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ role }),
  })
  if (!res.ok) throw new Error('Failed to update user role')
  return await res.json()
}

// DELETE /api/admin/users/:userId
export async function deactivateUser(userId) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error('Failed to deactivate user')
  return await res.json()
}