// import useAuthStore from '../store/authStore'

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`

function getAuthHeaders() {
    const token = localStorage.getItem('token')
    return {
        'Content-Type' : 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
}
// API suggestion: GET /api/kpis
// Response shape: { totalVehicles, activeVehicles, averageSpeed, alertsToday, lastUpdated }
//replacing the mock data with that of actual api calls
export async function getKPIs() {
  const response = await fetch(`${API_BASE}/dashboard/kpis`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch KPIs (${response.status})`)
  }

  const result = await response.json()
  const d = result.data

  return {
    totalVehicles:  Number(d.total_vehicles)  || 0,
    activeVehicles: Number(d.active_vehicles) || 0,
    alertsToday:    Number(d.alerts_today)    || 0,
    lastUpdated:    d.last_updated ?? new Date().toISOString(),
    // totalDistance intentionally absent — see note above
  }
}

// API suggestion: GET /api/vehicles/locations or GET /api/telemetry/latest
// Response shape: { timestamp, vehicles: [{ id, lat, lng, speed, status, lastUpdated?, distanceToday? }, ...] }
export async function getVehicleLocations(){
  const response = await fetch(`${API_BASE}/vehicles/locations`, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  })
  if (!response.ok) {
    throw new Error('Failed to fetch vehicle locations')
  }

  const result = await response.json()
  const vehicles = (result.data?.vehicles ?? []).map(vehicle => ({
    id: vehicle.id,
    lat: vehicle.latitude ?? vehicle.lat,
    lng: vehicle.longitude ?? vehicle.lng,
    speed: vehicle.speed,
    status: vehicle.status,
    lastUpdated: vehicle.last_update ?? vehicle.lastUpdated ?? vehicle.last_updated,
    distanceToday: vehicle.distance_today ?? vehicle.distanceToday ?? vehicle.distance,
  }))

  return {
    timestamp: result.data?.timestamp ?? new Date().toISOString(),
    vehicles,
  }
}

// API suggestion: GET /api/alerts?since=...&limit=...
// Response shape: { total, alerts: [{ id, vehicleId, type, severity, message, timestamp }, ...] }
export async function getAlerts(limit = 50) {
  const response = await fetch(`${API_BASE}/dashboard/alerts?limit=${limit}`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch alerts (${response.status})`)
  }

  const result = await response.json()
  return result.data.alerts ?? []
}

// API suggestion: GET /api/users
// Other user endpoints: POST /api/users, PUT /api/users/:id, DELETE /api/users/:id
// Response: array of users [{ id, name, email, role, status? }, ...]

export async function getUsers() {
  // Mock data — remove this block and uncomment the fetch below when ready
  return [
    { id: 1, name: "Zoe Nelly", email: "zoe.nelly@fleet.local", role: "admin" },
    { id: 2, name: "Bob Smith", email: "bob.smith@fleet.local", role: "fleet_manager" },
    { id: 3, name: "Carol White", email: "carol.white@fleet.local", role: "viewer" },
  ];
}

