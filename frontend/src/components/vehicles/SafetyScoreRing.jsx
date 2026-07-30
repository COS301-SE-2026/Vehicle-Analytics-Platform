import PropTypes from 'prop-types'

import {
    getScoreSeverity
} from '../../utils/safetyScore'

export default function SafetyScoreRing({score, size=36, strokeWidth = 3, showLabel = true}) {
    const {colour,label} = getScoreSeverity(score)
    const radius = (size-strokeWidth)/2
    const circumference = 2*Math.PI * radius
    const filledFraction = score ==null? 0: score/100
    const offset = circumference*(1-filledFraction)

    return(
        <div className="flex items-center gap-2">
            <svg width={size} height={size} className="-rotate-90">
                <circle data-testid="background-ring" cx={size/2} cy={size/2} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth}/>
                <circle
                    data-testid="progress-ring"
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
