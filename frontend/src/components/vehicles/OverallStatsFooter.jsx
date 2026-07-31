import PropTypes from 'prop-types'

export default function OverallStatsFooter({ stats}) {
    const {
        overallSafetyScore, 
        overallRating,
        totalDistanceKm,
        totalTrips,
        incidentsPer100Km,
        activeDays
    } = stats


    return (
        <div className="bg-white rounded-xl border border-fleet-border p-5 flex items-center gap-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-full border-4 border-fleet-text shrink-0">
                <span className="text-xl font-bold text-fleet-text">{overallSafetyScore}</span>
            </div>


            <div className="pr-6 border-r border-fleet-border">
                <p className="text-xs font-medium text-fleet-secondary tracking-wide">SAFETY RATING</p>
                <p className="text-sm font-semibold text-fleet-text mt-1">{overallRating}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <div>
                    <p className="text-xs font-medium text-fleet-secondary tracking-wide">TOTAL DISTANCE</p>
                    <p className="text-sm font-bold text-fleet-text">{totalDistanceKm.toLocaleString()} km</p>                 
                </div>
                <div>
                    <p className="text-xs font-medium text-fleet-secondary tracking-wide">INCIDENTS</p>
                    <p className="text-sm font-bold text-fleet-alert">{incidentsPer100Km} / 100km</p>                 
                </div>
                <div>
                    <p className="text-xs font-medium text-fleet-secondary tracking-wide">ACTIVE DAYS</p>
                    <p className="text-sm font-bold text-fleet-text">{activeDays} Days</p>                 
                </div>
                <div>
                    <p className="text-xs font-medium text-fleet-secondary tracking-wide">TRIPS RECORDED</p>
                    <p className="text-sm font-bold text-fleet-text">{totalTrips} Total</p>                 
                </div>
            </div>
        </div>
    )
}

OverallStatsFooter.propTypes = {
    stats: PropTypes.shape({
        overallSafetyScore: PropTypes.number.isRequired,
        overallRating: PropTypes.string.isRequired,
        totalDistanceKm: PropTypes.number.isRequired,
        totalTrips: PropTypes.number.isRequired,
        incidentsPer100Km: PropTypes.number.isRequired,
        activeDays: PropTypes.number.isRequired,
    }).isRequired,
}