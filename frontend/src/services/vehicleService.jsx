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
      console.warn('KPI fetch timed out — using fallback');
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
      // Reverse-geocoded fields from vehicle_location_cache, joined in by
      // getLiveLocations. Previously fetched by the backend but never
      // surfaced past this mapping step -- LiveFleetMapPlaceholder's
      // VehiclePanel falls back to raw coordinates specifically because
      // these were never here to prefer.
      road: v.road,
      roadClass: v.road_class,
      routeNumber: v.route_number,
      speedLimit: v.speed_limit,
      suburb: v.suburb,
      city: v.city,
      province: v.province,
      country: v.country,
      displayName: v.display_name,
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
  const v = data.data.vehicle
  const trip = data.data.current_trip

  return {
    vehicle:{
    ...v,
    latitude: parseFloat(v.latitude),
    longitude: parseFloat(v.longitude),
    speed: Number(v.speed),
    speedLimit: Number(v.speed_limit),
    tripStartTime: trip ? trip.start_time: null,

  },
    recent_events: (data.data.recent_events || []).map((e) => ({
      ...e,
      latitude: parseFloat(e.latitude),
      longitude: parseFloat(e.longitude),
      speed: Number(e.speed),
    })),
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

// GET /api/vehicles/buffer (for live map trails)
// Was: `return data.data.vehicles` -- getVehiclePositionBuffer on the
// backend returns {type:'FeatureCollection', timestamp, features}, which
// has no .vehicles key. This silently returned undefined, so FleetMap's
// buffer prop has effectively always been empty. Now returns the
// FeatureCollection itself, which FleetMap consumes directly as trail
// source data (see FleetMap.jsx) -- no shape conversion needed on either end.
export async function getVehiclePositionBuffer() {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_BASE_URL}/api/vehicles/buffer`, {
    headers
  });

  if (!res.ok) {
    throw new Error('Failed to fetch playback buffer')
  }

  const data = await res.json();

  return data.data; // { type: 'FeatureCollection', timestamp, features: [...] }
}

export async function getVehicleSafetyScore(vehicleId, date = null) {
  const headers = await getAuthHeaders()
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  const res = await fetch(`${API_BASE_URL}/api/safety/scores/${vehicleId}${query}`, {headers})

  if (!res.ok){
    throw new Error('Failed to fetch vehicle safety score')
  }

  const data = await res.json()
  return data.data
  
}

export async function getFleetSafetyScores(date = null){
  const headers = await getAuthHeaders()
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  const res = await fetch(`${API_BASE_URL}/api/safety/scores${query}`, { headers })


  if (!res.ok){
    throw new Error('Failed to fetch fleet safety scores')
  }

  const data = await res.json()
  return data.data.vehicles || []
}

export async function getVehiclesList({status, page = 1, limit = 20} = {}) {
  const headers = await getAuthHeaders()

  const params = new URLSearchParams()

  if (status && status !== 'all'){
    params.set('status', status)
  }

  params.set('page', page)
  params.set('limit', limit)

  const res = await fetch(`${API_BASE_URL}/api/vehicles?${params.toString()}`, {headers})
  if (!res.ok){
    throw new Error('Failed to fetch vehicles list')
  }

  const data = await res.json()

  return {
    vehicles: data.data.vehicles || [],
    stats: data.data.stats || {},
    pagination: data.data.pagination || {}
  }

  
}


export async function getVehicleTrips(vehicleId, {limit = 10, before } = {}){
  const headers = await getAuthHeaders()
  const params = new URLSearchParams()
  params.set('limit', limit)

  if(before){
    params.set('before', before)
  }

  const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/trips?${params.toString()}`, {headers})

  if(!res.ok){
    throw new Error('Failed to fetch vehicle trips')
  }
    const data = await res.json()
    return data.data
}

export async function getVehicleSafetyScoreTrend(vehicleId, days = 7) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/safety-trend?days=${days}`, {headers})

  if (!res.ok){
    throw new Error('Failed to fetch vehicle safety trend')
  }

  const data = await res.json()
  return data.data
  
}

export async function getTripReplay(tripId) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE_URL}/api/trips/replay/${tripId}`, {headers})

  if (!res.ok){
    throw new Error('Failed to fetch trip replay')
  }

  const data = await res.json()
  return data.data
  
}



