import PropTypes from 'prop-types'
import { useState } from 'react'

const CLASSIFICATION_TONE = {
	Excellent: 'bg-fleet-green/10 text-fleet-green',
	Good: 'bg-fleet-blue/10 text-fleet-blue',
	Fair: 'bg-amber-100 text-amber-700',
	Poor: 'bg-red-100 text-red-700',
}

const COLUMNS = [
	{ key: 'vehicleId', label: 'Vehicle', numeric: false },
	{ key: 'safetyScore', label: 'Safety Score', numeric: true },
	{ key: 'totalEvents', label: 'Total Events', numeric: true },
	{ key: 'harshBrakes', label: 'Harsh Braking', numeric: true },
	{ key: 'harshAccelerations', label: 'Harsh Accel.', numeric: true },
	{ key: 'harshCornering', label: 'Harsh Cornering', numeric: true },
	{ key: 'crashes', label: 'Crashes', numeric: true },
	{ key: 'overspeedEvents', label: 'Overspeed', numeric: true },
]

function ScoreBar({ score }) {
	if (score === null || score === undefined) {
		return <span className="text-fleet-secondary text-xs">No data</span>
	}

	const tone = score >= 90 ? 'bg-fleet-green'
		: score >= 75 ? 'bg-fleet-blue'
			: score >= 50 ? 'bg-amber-500' : 'bg-red-500'

	return (
		<div className="flex items-center gap-2 justify-end">
			<span className="font-semibold tabular-nums w-8 text-right">{score}</span>
			<div className="w-16 h-1.5 rounded-full bg-fleet-border overflow-hidden shrink-0">
				<div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
			</div>
		</div>
	)
}

ScoreBar.propTypes = { score: PropTypes.number }

export default function SafetyVehicleTable({ vehicles }) {
	const [sortKey, setSortKey] = useState('safetyScore')
	const [ascending, setAscending] = useState(true)

	if (!vehicles.length) {
		return (
			<p className="text-sm text-fleet-secondary">
				No vehicles recorded safety events in this period.
			</p>
		)
	}

	const sorted = [...vehicles].sort((a, b) => {
		const av = a[sortKey]
		const bv = b[sortKey]

		if (av === null || av === undefined) return 1
		if (bv === null || bv === undefined) return -1

		if (typeof av === 'string') return ascending ? av.localeCompare(bv) : bv.localeCompare(av)
		return ascending ? av - bv : bv - av
	})

	function toggleSort(key) {
		if (key === sortKey) return setAscending((prev) => !prev)
		setSortKey(key)
		return setAscending(key === 'vehicleId')
	}

	return (
		<div className="overflow-x-auto border border-fleet-border rounded-2xl bg-white">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-fleet-border">
						{COLUMNS.map((col) => (
							<th
								key={col.key}
								className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider text-fleet-secondary
									${col.numeric ? 'text-right' : 'text-left'}`}
							>
								<button
									type="button"
									onClick={() => toggleSort(col.key)}
									className="hover:text-fleet-text"
								>
									{col.label}
									{sortKey === col.key && (ascending ? ' \u2191' : ' \u2193')}
								</button>
							</th>
						))}
						<th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-fleet-secondary">
							Rating
						</th>
					</tr>
				</thead>
				<tbody>
					{sorted.map((v) => (
						<tr key={v.vehicleId} className="border-b border-fleet-border last:border-0">
							<td className="px-4 py-3 font-medium text-fleet-text">{v.vehicleId}</td>
							<td className="px-4 py-3 text-right"><ScoreBar score={v.safetyScore} /></td>
							<td className="px-4 py-3 text-right tabular-nums">{v.totalEvents}</td>
							<td className="px-4 py-3 text-right tabular-nums">{v.harshBrakes}</td>
							<td className="px-4 py-3 text-right tabular-nums">{v.harshAccelerations}</td>
							<td className="px-4 py-3 text-right tabular-nums">{v.harshCornering}</td>
							<td className={`px-4 py-3 text-right tabular-nums ${v.crashes > 0 ? 'text-red-600 font-semibold' : ''}`}>
								{v.crashes}
							</td>
							<td className="px-4 py-3 text-right tabular-nums">{v.overspeedEvents}</td>
							<td className="px-4 py-3">
								{v.classification && (
									<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
										CLASSIFICATION_TONE[v.classification] || 'bg-fleet-border text-fleet-secondary'
									}`}
									>
										{v.classification}
									</span>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

SafetyVehicleTable.propTypes = {
	vehicles: PropTypes.array.isRequired,
}