import PropTypes from 'prop-types'

import {
  getScoreSeverity,
} from '../../utils/safetyScore'

export default function SafetyScoreRing({ score, size = 36, strokeWidth = 3, showLabel = true }) {
  const severity = getScoreSeverity(score)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const normalizedScore = score == null ? 0 : Math.max(0, Math.min(score, 100))
  const filledFraction = normalizedScore / 100
  const offset = circumference * (1 - filledFraction)

  return (
    <div className="flex items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            data-testid="background-ring"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={severity.ringColour}
            strokeOpacity={0.18}
            strokeWidth={strokeWidth}
          />
          <circle
            data-testid="progress-ring"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={severity.ringColour}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>

        <div
          data-testid="score-fill"
          className="absolute inset-0 m-auto flex items-center justify-center rounded-full bg-transparent"
          style={{ width: size - strokeWidth * 2 - 2, height: size - strokeWidth * 2 - 2 }}
        >
          <span className="text-xs font-bold text-fleet-text leading-none">
            {score ?? '-'}
          </span>
        </div>
      </div>

      {showLabel && (
        <span className={`text-xs font-semibold ${severity.textClass}`}>
          {severity.label}
        </span>
      )}
    </div>
  )
}

SafetyScoreRing.propTypes = {
  score: PropTypes.number,
  size: PropTypes.number,
  strokeWidth: PropTypes.number,
  showLabel: PropTypes.bool,
}