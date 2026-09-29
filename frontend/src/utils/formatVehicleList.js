export default function formatVehicleList(ids, maxShown = 3) {
    if(!ids || ids.length === 0) {
        return 'no vehicles'
    }

    if(ids.length === 1) {
        return `vehicle ${ids[0]}`
    }

    if(ids.length <= maxShown) {
        return `vehicles ${ids.join(', ')}`
    }

    return `${ids.length.toLocaleString()} vehicles`
}