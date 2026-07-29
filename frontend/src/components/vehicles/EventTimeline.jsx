import PropTypes from 'prop-types'

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatCoords(lat,lng) {
    return `${lat.toFixed(4)}\u00B0 N, ${lng.toFixed(4)}\u00B0 W`
}

export default function EventTimeline({ events }) {
    if (events.length === 0) {
        return (
            <div>
                <h3 className="text-xs font-medium text-fleet-secondary tracking-wide mb-2">EVENT TIMELINE</h3>
                <p className="text-xs text-fleet-scondary">No events recorded for this trip.</p>
            </div>
        )
    }

    return (
        <div>
            <h3 className="text-xs font-medium text-fleet-secondary tracking-wide mb-2">EVENT TIMELINE</h3>
            <div className="space-y-3">
                {events.map((event, index) => {
                    const isUnsafe = event.type !== 'trip_started' && event.type !== 'trip_ended'
                    return (
                        <div key={`${event.type}-${event.timestamp}-${index}`} className="flex gap-3">
                            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isUnsafe ? 'bg-fleet-alert' : 'bg-fleet-text'}`}/>
                        <div>
                            <p className={`text-sm font-medium ${isUnsafe ? 'text-fleet-alert' : 'text-fleet-text'}`}>
                                {event.label}
                            </p>
                            <p className="text-xs text-fleet-secondary">
                                {formatTime(event.timestamp)} &bull; {formatCoords(event.latitude, event.longitude)}
                            </p>
                        </div>
                    </div>
                    )
                })}
            </div>
        </div>
    )
}

EventTimeline.propTypes = {
    events: PropTypes.arrayOf(
        PropTypes.shape({
            type: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            timestamp: PropTypes.string.isRequired,
            latitude: PropTypes.number.isRequired,
            longitude: PropTypes.number.isRequired,
        })
    ).isRequired,
}