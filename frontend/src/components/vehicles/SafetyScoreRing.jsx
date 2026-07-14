import PropTypes from 'prop-types'

function getScoreMeta(score){

    if (score == null){
        return {colour: '#9CA3AF', label: 'No Data'}
    }

    if (score >= 80){
        return {colour: '#16A34A', label: 'Exemplary'}
    }

    if (score >= 60){
        return {colour: '#16A34A', label: 'Good'}
    }

    if (score >= 45){
        return {colour: '#F59E0B', label: 'Needs Attention'}
    }

    return {colour: '#DC2626', label: 'Critical Attention'}
}

export default function SafetyScoreRing({score, size=36, strokeWidth = 3, showLabel = true}) {
    const {colour,label} = getScoreMeta(score)
    const radius = (size-strokeWidth)/2
    const circumference = 2*Math.PI * radius
    const pct = score ==null? 0: score/100
    const offset = circumference*(1-pct)

    return(
        <div className="flex items-center gap-2">
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth}/>
                <circle
                    cx={size/2} cy={size/2} r={radius} fill="none"
                    stroke={colour} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                />
            </svg>
            <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-fleet-text">
                    {score ?? '-'}
                </span>
                {showLabel && <span className="text-xs text-fleet-secondary">{label}</span>}
            </div>
        </div>
    )
}

    SafetyScoreRing.propTypes = {
        score: PropTypes.number,
        size: PropTypes.number,
        strokeWidth: PropTypes.number,
        showLabel: PropTypes.bool,
    } 
