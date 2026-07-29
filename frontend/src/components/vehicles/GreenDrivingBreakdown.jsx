import PropTypes from 'prop-types'

export default function GreenDrivingBreakdown({harshBrakingCount, harshAccelerationCount, harshCorneringCount}) {
    const stats = [
        {label: 'Harsh Braking', count: harshBrakingCount},
        {label: 'Harsh Accel', count: harshAccelerationCount},
        {label: 'Cornering', count: harshCorneringCount},
    ]


    return (
        <div>
            <h3 className="text-xs font-medium text-fleet-secondary tracking-wide mb-2">GREEN DRIVING BREAKDOWN</h3>
            <div className="flex flex-wrap gap-2">
                {stats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-1.5 border border-fleet-border rounded-lg px-3 py-1.5">
                    <span className={`text-sm font-bold ${stat.count > 0 ? 'text-fleet-alert' : 'text-fleet-text'}`}>
                        {stat.count}
                    </span>
                    <span className="text-xs text-fleet-secondary">{stat.label}</span>
                </div>
            ))} 
            </div>
        </div>
    )
}

GreenDrivingBreakdown.propTypes = {
    harshBrakingCount: PropTypes.number.isRequired,
    harshAccelerationCount: PropTypes.number.isRequired,
    harshCorneringCount: PropTypes.number.isRequired,

}