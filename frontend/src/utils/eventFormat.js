export function formatEventLabel(type) {
    if (!type) return 'Unknown Event'
    return type
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

export function formatEventTime(timestamp){
    return new Date(timestamp).toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function formatCoordinates(latitude, longitude) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return 'Location unknown'
    }
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
}