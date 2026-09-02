

import useAuthStore from '../store/authStore'





const API_BASE_URL = import.meta.env.VITE_API_URL



async function getAuthHeaders() {

  const token = useAuthStore.getState().token

  return {

    'Content-Type': 'application/json',

    ...(token ? { Authorization: `Bearer ${token}` } : {})

  }

}



export async function getVehicleFuelStats(vehicleId, days = 30) {

  const headers = await getAuthHeaders()

  const res = await fetch(`${API_BASE_URL}/api/fuel/vehicle/${vehicleId}?days=${days}`, { headers })

  if (!res.ok) {

    throw new Error('Failed to fetch vehicle fuel stats')

  }

  const data = await res.json()

  return data.data

}



export async function getVehicleFuelHistory(vehicleId, period = 'week', limit = 30) {

  const headers = await getAuthHeaders()

  const res = await fetch(`${API_BASE_URL}/api/fuel/vehicle/${vehicleId}/history?period=${period}&limit=${limit}`, { headers })

  if (!res.ok) {

    throw new Error('Failed to fetch vehicle fuel history')

  }

  const data = await res.json()

  return data.data

}



export async function getFleetFuelSummary(period = 'week') {

  const headers = await getAuthHeaders()

  const res = await fetch(`${API_BASE_URL}/api/fuel/fleet?period=${period}`, { headers })

  if (!res.ok) {

    throw new Error('Failed to fetch fleet fuel summary')

  }

  const data = await res.json()

  return data.data

}



export async function getFuelDashboard() {

  const headers = await getAuthHeaders()


  const res = await fetch(`${API_BASE_URL}/api/fuel/dashboard`, { headers })

  if (!res.ok) {

    throw new Error('Failed to fetch fuel dashboard')

  }

  const data = await res.json()

  return data.data

}





export async function calculateTripFuel(tripId) {

  const headers = await getAuthHeaders()

  const res = await fetch(`${API_BASE_URL}/api/fuel/calculate/trip/${tripId}`, {

    method: 'POST',

    headers

  })

  if (!res.ok) {

    throw new Error('Failed to calculate trip fuel')

  }

  const data = await res.json()

  return data.data

}



export async function getVehicleFuelTrend(vehicleId, days = 30) {

  const headers = await getAuthHeaders()

  const res = await fetch(`${API_BASE_URL}/api/fuel/vehicle/${vehicleId}/trend?days=${days}`, { headers })

  if (!res.ok) {

    throw new Error('Failed to fetch vehicle fuel trend')

  }

  const data = await res.json()

  return data.data

}





export async function getFleetFuelHistory(period = 'week', limit = 10) {

  const headers = await getAuthHeaders()

  const res = await fetch(`${API_BASE_URL}/api/fuel/fleet/history?period=${period}&limit=${limit}`, { headers })

  if (!res.ok) {

    throw new Error('Failed to fetch fleet fuel history')

  }

  const data = await res.json()

  return data.data

}



export async function calculateDailyHistory(vehicleId, date) {

  const headers = await getAuthHeaders()

  const res = await fetch(`${API_BASE_URL}/api/fuel/vehicle/${vehicleId}/calculate?date=${date}`, {

    method: 'POST',

    headers

  })

  if (!res.ok) {

    throw new Error('Failed to calculate daily history')

  }

  const data = await res.json()

  return data.data


}

