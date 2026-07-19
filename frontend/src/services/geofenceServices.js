const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
import useAuthStore from "../store/authStore";

async function getAuthHeaders() {
    try{
        const token = useAuthStore.getState().token;
        if(!token) {
            return {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            }
        }
    } catch (err) {
        console.error('Error fetching token from store', err);
    } return { 'Content-Type': 'application/json'};
}

// GET /api/geofence
export async function getGeofences() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/geofence`, { headers });
    if (!res.ok) throw new Error('Failed to fetch vehicle details')
    const data = await res.json()
    return {
        total: data.data.total,
        geofences: data.data.geofences,
    };
}

// PATCH /api/geofence/:geofence_id
export async function updateGeofence(geofence_id, update){
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/geofence/${geofence_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ update }),
    })
    if (!res.ok) throw new Error('Failed to update geofence');
    return await res.json( n)
}

// DELETE /api/geofence
export async function deleteGeofence(geofence_id){
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/geofence/${geofence_id}`, {
        method: 'DELETE',
        headers,
    })
    if (!res.ok) throw new Error('Failed to delete geofence')
        return await res.json()
}