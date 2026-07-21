import{
    ShieldCheck,
    Waypoints,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react'

import PropTypes from 'prop-types'

import { getScoreSeverity } from '@/utils/safetyScore'

export default function VehicleSummaryCards({summary}){
    const {
        totalVehicles,
        avgSafetyScore,
        avgSafetyScoreDelta,
        activeTripsToday,
        lowestScoringVehicle,
    } = summary

    const severity = getScoreSeverity(lowestScoringVehicle?.score ?? 0)
    const deltaIsPositive = avgSafetyScoreDelta >= 0

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/*AVERAGE SAFETY SCORE*/}
            <div className="bg-white rounded-xl border border-fleet-border p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className = "text-xs font-medium text-fleet-secondary">AVG. SAFETY SCORE</span>
                    <ShieldCheck className="w-4 h-4 text-fleet-green"/>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-fleet-text">{avgSafetyScore != null ? Number(avgSafetyScore).toFixed(1) : '-'}</span>
                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${deltaIsPositive ? 'text-fleet-green' : 'text-fleet-alert'}`}>
                        {deltaIsPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(avgSafetyScoreDelta)}%
                    </span>
                </div>
                <p className="text-xs text-fleet-secondary mt-1">Overall fleet performance</p>
            </div>

            {/*ACTIVE TRIPS*/}
            <div className="bg-white rounded-xl border border-fleet-border p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-fleet-secondary"> ACTIVE TRIPS</span>
                    <Waypoints className="w-4 h-4 text-fleet-secondary" />
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-fleet-text">{activeTripsToday} / {totalVehicles}</span>
                    <span className="text-xs font-medium text-fleet-secondary bg-gray-100 rounded-full px-2 py-0.5">In transit</span>
                </div>
                <p className="text-xs text-fleet-secondary mt-1">Operational fleet today</p>
            </div>

            {/*LOWEST SCORING VEHICLE*/}
            <div className="bg-white rounded-xl border border-fleet-border p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-fleet-secondary">LOWEST SCORING VEHICLE</span>
                    <AlertTriangle className={`w-4 h-4 ${severity.textClass}`} />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-fleet-text">{lowestScoringVehicle?.id ?? '-'}</span>
                    <span className={`text-xs font-semibold ${severity.textClass} ${severity.bgClass} rounded-full px-2 py-0.5`}>{lowestScoringVehicle?.score ?? '-' } / 100</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full ${severity.barClass} rounded-full`} style={{width: `${lowestScoringVehicle?.score ?? 0}%`}} />
                </div>
                <p className={`text-xs ${severity.textClass} mt-1`}>{severity.label}</p>
            </div>
        </div>
    )
}

VehicleSummaryCards.propTypes = {
    summary: PropTypes.shape({
        totalVehicles: PropTypes.number.isRequired,
        avgSafetyScore: PropTypes.number.isRequired,
        activeTripsToday: PropTypes.number.isRequired,
        avgSafetyScoreDelta: PropTypes.number.isRequired,
        lowestScoringVehicle: PropTypes.shape({
            id: PropTypes.string.isRequired,
            score: PropTypes.number,
        }).isRequired,
    }).isRequired,
}