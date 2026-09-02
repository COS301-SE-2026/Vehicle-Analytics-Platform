import useAuthStore from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function getAuthHeaders() {
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

export async function getReportScopes() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}/api/reports/scopes`, { headers })

    if (!res.ok) {
        throw new Error('Failed to fetch reporting scopes')
    }

    const data = await res.json()
    return {
        role: data.data?.role || null,
        groups: data.data?.groups || [],
        vehicles: data.data?.vehicles || [],
        unassignedVehicleCount: data.data?.unassignedVehicleCount || 0,
    }
}

export async function generateReport({
    scopeType = 'fleet',
    scopeId,
    periodType = 'weekly',
    anchor,
    from,
    to,
} = {}) {
    const headers = await getAuthHeaders()

    const body = {
        scope_type: scopeType,
        scope_id: scopeId,
        period_type: periodType,
    }

    if (periodType === 'custom') {
        body.from = from
        body.to = to
    } else if (anchor) {
        body.anchor = anchor
    }

    const res = await fetch(`${API_BASE_URL}/api/reports/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        let message = 'Failed to generate report'
        try {
            const payload = await res.json()
            if (payload && payload.error) message = payload.error
        } catch {
            // Keep default message on non-JSON response body
			// i am keeping this to be changed later. PLEASE NOTE BRUVA !!!!
        }
        const err = new Error(message)
        err.status = res.status
        throw err
    }

    const data = await res.json()
    return data.data
}