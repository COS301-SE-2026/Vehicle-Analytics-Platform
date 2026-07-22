const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
import useAuthStore from '../store/authStore';

async function getAuthHeaders() {
  try {
    const token = useAuthStore.getState().token;
    if (token) {
       return {
         'Content-Type': 'application/json',
         Authorization: `Bearer ${token}`,
       }
    }
  } catch (err) {
    console.error('Error fetching token from store', err);
  }
  return { 'Content-Type': 'application/json' };
}

// GET /api/dashboard/kpis
export async function getKPIs() {
  const headers = await getAuthHeaders();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(`${API_BASE_URL}/api/dashboard/kpis`, {
      headers,
      signal: controller.signal
    });

    clearTimeout(timeout);
    if (!res.ok) throw new Error('Failed to fetch KPIs');

    const data = await res.json();
    return {
      totalVehicles: data.data.total_vehicles,
      activeVehicles: data.data.active_vehicles,
      alertsToday: data.data.alerts_today,
      distanceToday: data.data.distance_today,
      lastUpdated: data.data.last_updated,
    };
  } catch (err) {
    if (err.name === 'AbortError' || err.message === 'Failed to fetch KPIs') {
      console.warn('KPI fetch timed out - using fallback');
      return {
        totalVehicles: 0,
        activeVehicles: 0,
        alertsToday: 0,
        distanceToday: 0,
        lastUpdated: new Date().toISOString()
      };
    }
    throw err;
  }
}

// GET /api/vehicles/locations
export async function getVehicleLocations() {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}/api/vehicles/locations`, { headers })
  if (!res.ok) throw new Error('Failed to fetch vehicle locations')
  const data = await res.json()
  const vehicles = (data.data.vehicles || [])
    .map(v => ({
      id: v.id,
      lat: Number.parseFloat(v.latitude),
      lng: Number.parseFloat(v.longitude),
      speed: v.speed,
      status: v.status,
      total_odometer: v.total_odometer,
      ignition: v.ignition,
      movement: v.movement, 
      lastUpdate: v.last_update,
      distanceToday: Number.parseFloat(v.distance_today) || 0,
    }))
    .filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lng))

  return {
    timestamp: data.data.timestamp,
    vehicles,
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

// GET /api/dashboard/activity
export async function getActivityHistory(range = 'day') {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}/api/dashboard/activity?range=${encodeURIComponent(range)}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch activity history')
  const data = await res.json()
  return data.data.points || []
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
export async function deleteUser(userId) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error('Failed to delete user')
  return await res.json()
}

// GET /api/vehicles/buffer (for live map)
export async function getVehiclePositionBuffer() {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/api/vehicles/buffer`, {
    headers
  });

  if(!res.ok){
    throw new Error('Failed to fetch playback buffer')
  }

  const data = await res.json();

  return data.data.vehicles;

}

// fleet anaylytics. THis has just been added to show mock data to have it displaying on the frontend

const MOCK_FLEET_ANALYTICS = {
  day: {
    safetyTrend: [
      { label: '00:00', score: 91 }, { label: '04:00', score: 89 }, { label: '08:00', score: 82 },
      { label: '12:00', score: 78 }, { label: '16:00', score: 84 }, { label: '20:00', score: 90 },
    ],
    eventBreakdown: [
      { type: 'Harsh Braking', count: 24 },
      { type: 'Speeding', count: 18 },
      { type: 'Crash Detection', count: 0 },
      { type: 'Harsh Acceleration', count: 12 },
      { type: 'Harsh Cornering', count: 8 },
    ],
    topContributors: [
      { vehicleId: 'TRK-2024-K1', percentage: 42 },
      { vehicleId: 'VAN-992-M', percentage: 38 },
      { vehicleId: 'TRK-441-Z', percentage: 20 },
    ],
    lowestSafetyScores: [
      { vehicleId: 'VAN-102-L', score: 62, status: 'CRITICAL', lastUpdated: '12:04:01' },
      { vehicleId: 'TRK-441-Z', score: 71, status: 'WARNING', lastUpdated: '14:15:33' },
    ],
  },
  week: {
    safetyTrend: [
      { label: 'Mon', score: 88 }, { label: 'Tue', score: 90 }, { label: 'Wed', score: 85 },
      { label: 'Thu', score: 79 }, { label: 'Fri', score: 86 }, { label: 'Sat', score: 91 }, { label: 'Sun', score: 89 },
    ],
    eventBreakdown: [
      { type: 'Harsh Braking', count: 96 },
      { type: 'Speeding', count: 74 },
      { type: 'Crash Detection', count: 1 },
      { type: 'Harsh Acceleration', count: 45 },
      { type: 'Harsh Cornering', count: 30 },
    ],
    topContributors: [
      { vehicleId: 'TRK-2024-K1', percentage: 39 },
      { vehicleId: 'VAN-992-M', percentage: 31 },
      { vehicleId: 'TRK-441-Z', percentage: 22 },
    ],
    lowestSafetyScores: [
      { vehicleId: 'VAN-102-L', score: 58, status: 'CRITICAL', lastUpdated: '2 days ago' },
      { vehicleId: 'TRK-441-Z', score: 69, status: 'WARNING', lastUpdated: '1 day ago' },
    ],
  },
}

// GET /api/dashboard/fleet-analytics
export async function getFleetAnalytics(range = 'day') {
  const headers = await getAuthHeaders()
  try {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/fleet-analytics?range=${encodeURIComponent(range)}`, { headers })
    if (!res.ok) throw new Error('Failed to fetch fleet analytics')
    const data = await res.json()
    return {
      safetyTrend: data.data.safety_trend ?? [],
      eventBreakdown: data.data.event_breakdown ?? [],
      topContributors: (data.data.top_contributors ?? []).map(c => ({
        vehicleId: c.vehicle_id,
        percentage: c.percentage,
      })),
      lowestSafetyScores: (data.data.lowest_safety_scores ?? []).map(v => ({
        vehicleId: v.vehicle_id,
        score: v.score,
        status: v.status?.toUpperCase(),
        lastUpdated: v.last_updated,
      })),
    }
  } catch (err) {
    console.warn('Fleet analytics fetch failed - using mock data:', err.message)
    return MOCK_FLEET_ANALYTICS[range] ?? MOCK_FLEET_ANALYTICS.day
  }
}
