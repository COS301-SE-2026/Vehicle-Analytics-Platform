import PropTypes from 'prop-types'

const STATUS_CONTEXT = {
    moving: {label: 'Moving', dot: 'bg-fleet-green'},
    active: {label: 'Moving', dot: 'bg-fleet-green'},
    idle: {label: 'Idle', dot: 'bg-amber-400'},
    offline: {label: 'Offline', dot: 'bg-gray-400'},
}

export default function VehicleStatusBadge({status}) {
    const context = STATUS_CONTEXT[status] ?? STATUS_CONTEXT.offline
    return (
        <span className = "inline-flex items-center gap-1.5 text-xs font-medium text-fleet-text">
            <span className={`w-1.5 h-1.5 rounded-full ${context.dot}`}/>
            {context.label}
        </span>
    )
}

VehicleStatusBadge.propTypes = {
    status: PropTypes.oneOf(['moving', 'active', 'idle', 'offline']).isRequired,
}