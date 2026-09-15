import useAuthStore from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function getAuthHeaders(){
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



export async function getReportScopes(){
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

function buildBody({ scopeType, scopeId, periodType, anchor, from, to, format }){
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


    if (format) body.format = format


    return body
}

async function readError(res){
    let message = 'Failed to generate report'
    try {
        const payload = await res.json()
        if (payload && payload.error) message = payload.error
    } catch {
        //  keep the default message.
    }
    
    const err = new Error(message)
    err.status = res.status
    return err

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

    const res = await fetch(`${API_BASE_URL}/api/reports/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(buildBody({ scopeType, scopeId, periodType, anchor, from, to })),
    })

    if (!res.ok) throw await readError(res)

    const data = await res.json()

    return data.data
}



export async function downloadReportPdf({
    scopeType = 'fleet',
    scopeId,
    periodType = 'weekly',
    anchor,
    from,
    to,
} = {}) {
    const headers = await getAuthHeaders()

    const res = await fetch(`${API_BASE_URL}/api/reports/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
            buildBody({ scopeType, scopeId, periodType, anchor, from, to, format: 'pdf' }),
        ),

    })

    if (!res.ok) throw await readError(res)

    const disposition = res.headers.get('Content-Disposition') || ''

    const match = disposition.match(/filename="([^"]+)"/)

    const filename = match ? match[1] : 'vapor-report.pdf'

    const blob = await res.blob()

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    return filename
    
}