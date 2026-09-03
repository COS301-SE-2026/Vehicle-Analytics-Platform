import PropTypes from 'prop-types'
import {
    ShieldCheck, Activity, TrendingDown, TrendingUp,
    CornerDownRight, AlertTriangle, Fuel, Route,
} from 'lucide-react'

function MetricCard({ icon: Icon, label, value, unit, comparison }) {
    const hasValue = value !== null && value !== undefined
    const direction = comparison?.direction
    const percent = comparison?.percentChange

    const toneByDirection = {
        improved: 'text-fleet-green',
        deteriorated: 'text-red-600',
        increased: 'text-fleet-secondary',
        decreased: 'text-fleet-secondary',
    }

    return (
        <div className="bg-white rounded-2xl p-5 border border-fleet-border shadow-sm">
            <div className="flex items-start justify-between">
                <p className="text-xs font-semibold tracking-widest text-fleet-secondary uppercase mb-2">
                    {label}
                </p>
                {Icon && <Icon className="w-5 h-5 text-fleet-blue opacity-70 shrink-0" />}
            </div>

            <p className="text-3xl font-bold text-fleet-text leading-none">
                {hasValue ? value : <span className="text-xl text-fleet-secondary">No data</span>}
                {hasValue && unit && (
                    <span className="text-sm font-normal text-fleet-secondary ml-1">{unit}</span>
                )}
            </p>

            {/* {hasValue && percent !== null && percent !== undefined && (
                <p className={`mt-2 text-xs font-medium ${toneByDirection[direction] || 'text-fleet-secondary'}`}>
                    {percent > 0 ? '+' : ''}{percent}% vs previous
                </p>
            )} */} {/* LOOK AT THIS LATER AGAIN IF NECCESSARY. THIS DOES NOT ADD MAJOR VALUE AS OF YET */}
        </div>
    )
}

MetricCard.propTypes = {
    icon: PropTypes.elementType,
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    unit: PropTypes.string,
    comparison: PropTypes.object,
}

MetricCard.defaultProps = {
    icon: null,
    value: null,
    unit: '',
    comparison: null,
}

export default function SafetySummaryCards({ summary, comparison }) {
    const cards = [
        { key: 'safetyScore', icon: ShieldCheck, label: 'Safety Score', value: summary.safetyScore },
        { key: 'totalEvents', icon: Activity, label: 'Total Events', value: summary.totalEvents },
        { key: 'harshBrakes', icon: TrendingDown, label: 'Harsh Braking', value: summary.harshBrakes },
        { key: 'harshAccelerations', icon: TrendingUp, label: 'Harsh Acceleration', value: summary.harshAccelerations },
        { key: 'harshCornering', icon: CornerDownRight, label: 'Harsh Cornering', value: summary.harshCornering },
        { key: 'crashes', icon: AlertTriangle, label: 'Crashes', value: summary.crashes },
        {
            key: 'avgEfficiencyKmPerL',
            icon: Fuel,
            label: 'Fuel Efficiency',
            value: summary.avgEfficiencyKmPerL,
            unit: 'km/L',
        },
        {
            key: 'totalDistanceKm',
            icon: Route,
            label: 'Distance',
            value: summary.totalDistanceKm,
            unit: 'km',
        },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => (
                <MetricCard
                    key={card.key}
                    icon={card.icon}
                    label={card.label}
                    value={card.value}
                    unit={card.unit}
                    comparison={comparison ? comparison[card.key] : null}
                />
            ))}
        </div>
    )
}

SafetySummaryCards.propTypes = {
    summary: PropTypes.object.isRequired,
    comparison: PropTypes.object,
}

SafetySummaryCards.defaultProps = {
    comparison: null,
}