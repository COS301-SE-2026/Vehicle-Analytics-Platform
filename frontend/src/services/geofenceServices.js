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

// POST /api/geofence
export async function createGeofence(geofence_payload){
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/geofences`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ geofence_payload }),
    })
    if (!res.ok) throw new Error('Failed to create a geofence')
    const data = await res.json()
    return {
        message: data.data.message,
        geofence: data.data.geofence,
    };
}

// GET /api/geofence
export async function getGeofences() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/geofences`, { headers });
    if (!res.ok) throw new Error('Failed to fetch geofences')
    const data = await res.json()
    return {
        total: data.data.total,
        geofences: data.data.geofences,
    };
}

// PATCH /api/geofence/:geofence_id
export async function updateGeofence(geofence_id, update){
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/geofences/${geofence_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ update }),
    })
    if (!res.ok) throw new Error('Failed to update geofence');
    return await res.json()
}

// DELETE /api/geofence
export async function deleteGeofence(geofence_id){
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/geofences/${geofence_id}`, {
        method: 'DELETE',
        headers,
    })
    if (!res.ok) throw new Error('Failed to delete geofence')
        return await res.json()
}

// GET /api/geofence/
export async function getGeofenceEvents(geofence_id){
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/geofences/events?geofence_id=${geofence_id}` , { headers });
    if (!res.ok) throw new Error('Failed to fetch geofence events')
    const data = await res.json()
    return {
        total: data.data.total,
        events: data.data.events,
    };
}

// GET 
export async function discoverFrequentStops(vehicle_id) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/geofences/discover/stops?vehicle_id=${vehicle_id}` , { headers });
    if (!res.ok) throw new Error('Failed to fetch geofence events')
    const data = await res.json()
    return {
        total_clusters: data.data.total_clusters,
        clusters: data.data.clusters,
    };
}

export async function createGeofenceFromCluster(cluster_payload){
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/geofences/discover/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cluster_payload),
    });
    if (!res.ok) throw new Error('Failed to create geofence from cluster');
    const data = await res.json()
    return {
        message: data.data.message,
        geofence: data.data.geofence,
    }
}

export async function discoverFrequentEvents(vehicle_id, event_category, event_detail){
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/geofences/discover/events?vehicle_id=${vehicle_id ?? ''}&event_category=${event_category ?? ''}&event_detail=${event_detail ?? ''}` , { headers });
    if (!res.ok) throw new Error('Failed to fetch geofence events')
    const data = await res.json()
    return {
        total_hotspots: data.data.total_hotspots,
        hotspots: data.data.hotspots,
    };
}

