const STATUS_STYLES = {
  CRITICAL: 'text-red-600',
  WARNING: 'text-orange-600',
  GOOD: 'text-fleet-green',
} // this is a threshold for the safety scores

// the safety scores are sorted from lowest. 
export default function LowestSafetyScoresTable({ vehicles = [] }){
    return (
    <div className="rounded-xl border border-fleet-border bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-fleet-secondary mb-3">
        Lowest Safety Scores (Ranked)
      </h3>
      {vehicles.length === 0 ? (
        <p className="text-sm text-fleet-secondary">No data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-fleet-secondary border-b border-fleet-border">
                <th className="py-2 pr-4 font-medium">Rank</th>
                <th className="py-2 pr-4 font-medium">Vehicle ID</th>
                <th className="py-2 pr-4 font-medium">Score</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                {/* <th className="py-2 pr-4 font-medium">Last Updated</th>  */}
                {/* removed the above temporarily because incorrect data is displayed/ 
                REMEMEBER TO CORRECT THIS  */}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, i) => (
                <tr key={v.vehicleId} className="border-b border-fleet-border/60 last:border-0">
                  <td className="py-2 pr-4 text-fleet-secondary">#{String(i + 1).padStart(2, '0')}</td>
                  <td className="py-2 pr-4 font-medium text-fleet-text">{v.vehicleId}</td>
                  <td className="py-2 pr-4 text-fleet-text">{v.score}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        STATUS_STYLES[v.status] ?? STATUS_STYLES.WARNING
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-fleet-secondary">{v.lastUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}