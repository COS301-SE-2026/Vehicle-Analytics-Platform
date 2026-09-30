import useAuthStore from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'



function getAuthHeaders(){
    try {
        const token = useAuthStore.getState().token
        if (token) {
            return {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            }
        }
    } catch (err) {
        console.error('Error fetching token from store', err)
    }
    return { 'Content-Type': 'application/json' }
}



export async function getAnomalies({
    scopeType = 'fleet',
    scopeId,
    periodType = 'current',
    currentDays,
    from,
    to,
} = {}) {
    const params = new URLSearchParams()
    params.set('scope_type', scopeType)
    params.set('period_type', periodType)

    if (Array.isArray(scopeId)) {
        scopeId.forEach((id) => params.append('scope_id', id))
    } else if (scopeId) {
        params.set('scope_id', scopeId)
    }

    if (periodType === 'custom') {
        if (from) params.set('from', from)
        if (to) params.set('to', to)
    } else if (currentDays) {
        params.set('current_days', String(currentDays))
    }

    const res = await fetch(`${API_BASE_URL}/api/anomalies?${params.toString()}`, {
        headers: getAuthHeaders(),
    })

    if (!res.ok) {
        let message = 'Failed to detect anomalies'
        try {
            const payload = await res.json()
            if (payload && payload.error) message = payload.error
        } catch {
            // default message
        }
        throw new Error(message)
    }

    const payload = await res.json()
    return payload.data || payload
}


export default { getAnomalies }