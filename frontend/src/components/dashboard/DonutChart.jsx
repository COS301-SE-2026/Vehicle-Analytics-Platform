import PropTypes from 'prop-types'

export default function DonutChart({ active, idle, offline, total }) {
  const r = 54, cx = 70, cy = 70
  const circumference = 2 * Math.PI * r
  const activeDash  = (active  / total) * circumference
  const idleDash    = (idle    / total) * circumference
  const offlineDash = (offline / total) * circumference

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="font-semibold text-gray-700 mb-4">Fleet Status</h3>
      <div className="flex flex-col items-center gap-4">
        <svg viewBox="0 0 140 140" className="w-36 h-36">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="16" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2d6a4f" strokeWidth="16"
            strokeDasharray={`${activeDash} ${circumference - activeDash}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth="16"
            strokeDasharray={`${idleDash} ${circumference - idleDash}`}
            strokeDashoffset={-activeDash}
            transform={`rotate(-90 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#9ca3af" strokeWidth="16"
            strokeDasharray={`${offlineDash} ${circumference - offlineDash}`}
            strokeDashoffset={-(activeDash + idleDash)}
            transform={`rotate(-90 ${cx} ${cy})`} />
          <text x={cx} y={cy - 6} textAnchor="middle"
            style={{ fontSize: 22, fontWeight: 700, fill: '#1f2937' }}>{total}</text>
          <text x={cx} y={cy + 12} textAnchor="middle"
            style={{ fontSize: 9, letterSpacing: 1, fill: '#9ca3af' }}>TOTAL</text>
        </svg>

        <div className="w-full flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-green-700 inline-block" />
              Active
            </span>
            <span className="font-bold text-gray-700">{active}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />
              Idle
            </span>
            <span className="font-bold text-gray-700">{idle}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-gray-400 inline-block" />
              Offline
            </span>
            <span className="font-bold text-gray-700">{offline}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

DonutChart.propTypes = {
  offline:  PropTypes.number,
}