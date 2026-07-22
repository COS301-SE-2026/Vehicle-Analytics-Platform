// this will show the vehicle ID of the the vehicle with the most events 
export default function TopEventContributors({ contributors  = [] }) {
    return (
        <div className= "round-xl border border-fleet-border bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fleet-secondary mb-3">
        Top Event Contributors
      </h3>
      {contributors.length === 0 ? (
        <p className="text-sm text-fleet-secondary">No contributors to show</p>
      ) : (
        <ul className="space-y-3">
          {contributors.map(({ vehicleId, percentage }) => (
            <li key={vehicleId}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-fleet-text">{vehicleId}</span>
                <span className="text-fleet-secondary">{percentage}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-fleet-border/60">
                <div
                  className="h-1.5 rounded-full bg-fleet-alert"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
    )
}