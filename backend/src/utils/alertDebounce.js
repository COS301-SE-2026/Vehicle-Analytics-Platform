const DEBOUNCE_MINUTES = 5

function applyDebounce(breaches, debounceMinutes = DEBOUNCE_MINUTES) {
    const windowMs = debounceMinutes * 60 * 1000
    const lastKept = new Map()
    const kept = []

    const sorted = [...breaches].sort((a,b) => {
        if(a.vehicle_id !== b.vehicle_id){
            return a.vehicle_id < b.vehicle_id ? -1 : 1
        }

        return new Date(a.time) - new Date(b.time)
    })

    for (const breach of sorted) {
        const previous = lastKept.get(breach.vehicle_id)
        const current = new Date(breach.time).getTime()

        if(previous === undefined || current - previous >= windowMs) {
            kept.push(breach)
            lastKept.set(breach.vehicle_id, current)
        }
    }

    return kept
}

module.exports = {applyDebounce, DEBOUNCE_MINUTES}