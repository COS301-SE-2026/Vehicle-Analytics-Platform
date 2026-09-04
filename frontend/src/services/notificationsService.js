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

export async function getNotifications(since) {
    const headers = await getAuthHeaders()
    const query = since ? `?since=${encodeURIComponent(since)}` : ''
    const res = await fetch(`${API_BASE_URL}/api/notifications/${query}`, {headers})

    if(!res.ok){
        throw new Error('Failed to fetch notifications')
    }

    const data = await res.json()
    const body = data.data || {}

    return{
        notifications: body.notifications || [],
        checkedAt: body.checked_at || body.checed_at || new Date().toISOString(),
    }
}

