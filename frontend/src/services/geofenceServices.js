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
        body: JSON.stringify( geofence_payload ),
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

// GET /api/geofences/geojson -- existing zones as a FeatureCollection,
// straight from Postgres (get_geofences_geojson), for map rendering.
// Distinct from getGeofences above, which returns flat rows for the table.
export async function getGeofencesGeoJSON(vehicle_id) {
    const headers = await getAuthHeaders();
    const url = vehicle_id
        ? `${API_BASE_URL}/api/geofences/geojson?vehicle_id=${vehicle_id}`
        : `${API_BASE_URL}/api/geofences/geojson`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Failed to fetch geofences geojson');
    const data = await res.json();
    return data.data; // { type: 'FeatureCollection', features: [...] }
}

// PATCH /api/geofence/:geofence_id
export async function updateGeofence(geofence_id, update){
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/geofences/${geofence_id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify( update ),
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
    const url = geofence_id ? `${API_BASE_URL}/api/geofences/events?geofence_id=${geofence_id}`
                            : `${API_BASE_URL}/api/geofences/events`;
    const res = await fetch( url, { headers });
    if (!res.ok) throw new Error('Failed to fetch geofence events')
    const data = await res.json()
    return {
        total: data.data.total,
        events: data.data.events.map(e => {
            // Was `${e.vehicle_id} ${e.event_type} ${e.name}` -- the
            // controller aliases the zone name as `geofence_name`, so
            // `e.name` was always undefined and every alert rendered as
            // e.g. "1024 entry undefined".
            const zoneName = e.geofence_name ?? "unknown zone";

            // hotspot_created rows have no vehicle_id -- a hotspot belongs
            // to no single vehicle -- so they need their own message shape
            // rather than falling through to the vehicle-crossing wording.
            const isHotspot = e.event_type === "hotspot_created";

            return {
                id: e.id,
                type: isHotspot || e.event_type === "entry" ? "alert" : "notification",
                message: isHotspot
                    ? `New event hotspot detected: ${zoneName}`
                    : `${e.vehicle_id} ${e.event_type} ${zoneName}`,
                time: new Date(e.created_at).toLocaleString(),
                read: false,
            };
        }),
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
