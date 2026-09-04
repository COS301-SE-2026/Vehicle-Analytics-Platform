const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
import useAuthStore from "../store/authStore";

async function getAuthHeaders() {
    try{
        const token = useAuthStore.getState().token;
        if(token) {
            return {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            }
        }
    } catch (err) {
        console.error('Error fetching token from store', err);
    } return { 'Content-Type': 'application/json'};
}

export async function getFleetGroups() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/fleet-groups`, {headers})

    if(!res.ok){
        throw new Error('Failed to fetch fleet groups')
    }

    const data = await res.json()
    return data.data.groups || []
}

export async function getMyFleetGroups() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/fleet-groups/my-groups`, {headers})

    if(!res.ok){
        throw new Error('Failed to fetch fleet groups')
    }

    const data = await res.json()
    return data.data.groups || []
}

export async function assignFleetManager(fleetGroupId, managerId) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/fleet-groups/${fleetGroupId}/assignments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ managerId }),
    })

    const data = await res.json().catch(() => ({}))

    if(!res.ok){
        throw new Error(data.error || 'Failed to assign fleet manager')
    }

    return data.data
}

export async function removeFleetManagerAssignment(fleetGroupId, managerId) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/fleet-groups/${fleetGroupId}/assignments/${managerId}`, {
        method: 'DELETE',
        headers,
    })

    const data = await res.json().catch(() => ({}))

    if(!res.ok){
        throw new Error(data.error || 'Failed to remove fleet manager assignment')
    }

    return data.data
}

export async function createFleetGroup(name, description) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/fleet-groups`, {
        method: 'POST',
        headers,
        body: JSON.stringify({name, description }),
    })

    const data = await res.json().catch(() => ({}))

    if(!res.ok){
        throw new Error(data.error || 'Failed to create fleet group')
    }

    return data.data.group
}

export async function getAvailableVehicles(fleetGroupId, {status = 'unassigned', search, page = 1, limit = 20} = {}) {
    const headers = await getAuthHeaders()

    const params = new URLSearchParams()
    params.set('status', status)
    if(search){
        params.set('search', search)
    }

    params.set('page', page)
    params.set('limit', limit)

    const res = await fetch(`${API_BASE_URL}/api/fleet-groups/${fleetGroupId}/available-vehicles?${params.toString()}`, {headers})


    if(!res.ok){
        throw new Error('Failed to fetch available vehicles')
    }

    const data = await res.json()

    return{
        vehicles: data.data.vehicles || [],
        total: data.data.total ?? 0,
        page: data.data.page ?? 1,
        limit: data.data.limit ?? 20,
    }
}

export async function bulkAssignVehicles(fleetGroupId, vehicleIds) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/fleet-groups/${fleetGroupId}/vehicles`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({vehicleIds}),
    })

    const data = await res.json().catch(() => ({}))

    if(!res.ok){
        throw new Error(data.error || 'Failed to assign vehicles group')
    }

    return data.data
}

export async function getManagerLeaderboard(limit=5) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/fleet-groups/leaderboard?limit=${limit}`, {headers})

    if(!res.ok){
        throw new Error('Failed to fetch manager leaderboard')
    }

    const data = await res.json()
    return data.data.leaderboard || []
}

export async function updateFleetGroup(id, name, description) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/fleet-groups/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({name,description}),
    })

    const data = await res.json().catch(() => ({}))

    if(!res.ok){
        throw new Error(data.error || 'Failed to update fleet group')
    }

    return data.data.group
}

export async function deleteFleetGroup(id) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/fleet-groups/${id}`, {
        method: 'DELETE',
        headers,
    })

    const data = await res.json().catch(() => ({}))

    if(!res.ok){
        throw new Error(data.error || 'Failed to delete fleet group')
    }

    return data.data.message
}

export async function unassignVehicles(fleetGroupId, vehicleIds) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/fleet-groups/${fleetGroupId}/vehicles/unassign`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({vehicleIds}),
    })

    const data = await res.json().catch(() => ({}))

    if(!res.ok){
        throw new Error(data.error || 'Failed to unassign vehicles')
    }

    return data.data
}


