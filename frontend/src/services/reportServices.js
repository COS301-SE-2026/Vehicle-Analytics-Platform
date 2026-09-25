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

async function readError(res){
    let message = `Request failed (${res.status})`
    try {
        const payload = await res.json()
        if (payload && payload.error) message = payload.error
    } catch {
        // Non-JSON body (for example an API Gateway timeout): keep the status message.
    }

    const err = new Error(message)
    err.status = res.status
    return err
}

async function getJson(path){
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}${path}`, { headers })
    if (!res.ok) throw await readError(res)
    const data = await res.json()
    return data.data
}

async function postJson(path, body){
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })
    if (!res.ok) throw await readError(res)
    const data = await res.json()
    return data.data
}

function buildBody({ scopeType, scopeId, periodType, anchor, from, to, format, save }){
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
    if (save) body.save = true

    return body
}


function saveBase64File({ filename, contentType, content }){
    const binary = atob(content)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)

    const blob = new Blob([bytes], { type: contentType || 'application/pdf' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'vapor-report.pdf'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    return link.download
}

export async function getReportScopes(){
    const data = await getJson('/api/reports/scopes')
    return {
        role: data?.role || null,
        groups: data?.groups || [],
        vehicles: data?.vehicles || [],
        unassignedVehicleCount: data?.unassignedVehicleCount || 0,
    }
}

export async function generateReport({
    scopeType = 'fleet',
    scopeId,
    periodType = 'weekly',
    anchor,
    from,
    to,
    save = false,
} = {}) {
    return postJson(
        '/api/reports/generate',
        buildBody({ scopeType, scopeId, periodType, anchor, from, to, save }),
    )
}

export async function downloadReportPdf({
    scopeType = 'fleet',
    scopeId,
    periodType = 'weekly',
    anchor,
    from,
    to,
} = {}) {
    const file = await postJson(
        '/api/reports/generate',
        buildBody({ scopeType, scopeId, periodType, anchor, from, to, format: 'pdf' }),
    )
    return saveBase64File(file)
}

export async function listReportHistory({ limit = 25, offset = 0, trigger } = {}){
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (trigger) params.set('trigger', trigger)

    const data = await getJson(`/api/reports?${params.toString()}`)
    return data?.reports || []
}



export async function getStoredReport(reportId){
    return getJson(`/api/reports/${encodeURIComponent(reportId)}`)
}

export async function downloadStoredReportPdf(reportId){
    const file = await getJson(`/api/reports/${encodeURIComponent(reportId)}/pdf`)
    return saveBase64File(file)
}
