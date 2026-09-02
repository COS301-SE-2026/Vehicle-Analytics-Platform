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
	if (!res.ok) throw new Error('Failed to fetch reporting scopes')
	const data = await res.json()
	return {
		groups: data.data.groups || [],
		vehicles: data.data.vehicles || [],
		unassignedVehicleCount: data.data.unassignedVehicleCount || 0,
	}
}

export async function generateReport({
	scopeType = 'fleet',
	scopeId,
	periodType = 'weekly',
	anchor,
} = {}) {
	const headers = await getAuthHeaders()

	const res = await fetch(`${API_BASE_URL}/api/reports/generate`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			scope_type: scopeType,
			scope_id: scopeId,
			period_type: periodType,
			anchor,
		}),
	})

	if (!res.ok) {
		let message = 'Failed to generate report'
		try {
			const body = await res.json()
			if (body && body.error) message = body.error
		} catch {
		}
		const err = new Error(message)
		err.status = res.status
		throw err
	}

	const data = await res.json()
	return data.data
}