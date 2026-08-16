
const API_BASE_URL = import.meta.env.VITE_API_URL

import useAuthStore from '../store/authStore'



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

    if (!res.ok) throw new Error('Failed to fetch vehicle fuel stats')

        const data = await res.json()

        return data.data

    }

    


    export async function getFleetFuelSummary(period = 'week') {

        const headers = await getAuthHeaders()

        const res = await fetch(`${API_BASE_URL}/api/fuel/fleet?period=${period}`, { headers })

        if (!res.ok) throw new Error('Failed to fetch fleet fuel summary')

            const data = await res.json()

            return data.data
}






export async function getFuelDashboard() {

    const headers = await getAuthHeaders()

    const res = await fetch(`${API_BASE_URL}/api/fuel/dashboard`, { headers })

    if (!res.ok) throw new Error('Failed to fetch fuel dashboard')

        const data = await res.json()

        return data.data

    }

    


    export async function calculateTripFuel(tripId) {

        const headers = await getAuthHeaders()


        const res = await fetch(`${API_BASE_URL}/api/fuel/calculate/trip/${tripId}`, {

            method: 'POST',

            headers
    })



    if (!res.ok) throw new Error('Failed to calculate trip fuel')

        const data = await res.json()

        return data.data

    }
