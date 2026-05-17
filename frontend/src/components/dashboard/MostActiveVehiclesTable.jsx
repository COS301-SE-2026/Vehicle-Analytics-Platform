const STATUS_STYLES = {
  moving: 'bg-fleet-green text-white',
  idle: 'bg-fleet-warning text-white',
  offline: 'bg-fleet-idle text-white',
}

const STATUS_LABELS = {
  moving: 'MOVING',
  idle: 'IDLE',
  offline: 'OFFLINE',
}

function getTimestampColor(seconds) {
  if (seconds < 30) return 'text-fleet-secondary'
  if (seconds < 120) return 'text-fleet-warning'
  return 'text-fleet-alert'
}

function formatLastUpdated(timestamp) {
  if (!timestamp) return 'Unknown'
  const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000)
  if (diff < 60) return `${diff} seconds ago`
  const mins = Math.floor(diff / 60)
  const secs = diff % 60
  return `${mins} min ${secs} sec ago`
}

function getSecondsDiff(timestamp) {
  if (!timestamp) return 999
  return Math.floor((Date.now() - new Date(timestamp)) / 1000)
}

export default function MostActiveVehiclesTable({ vehicles = [] }) {
  return (
    <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5 flex flex-col gap-4">
      <h2 className="font-display font-bold text-fleet-text text-base">
        Most Active Vehicles Today
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-fleet-secondary text-xs uppercase tracking-wide border-b border-fleet-border">
              <th className="text-left pb-3 font-medium">Rank</th>
              <th className="text-left pb-3 font-medium">Vehicle ID</th>
              <th className="text-left pb-3 font-medium">Distance Today</th>
              <th className="text-left pb-3 font-medium">Status</th>
              <th className="text-left pb-3 font-medium">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fleet-border">
            {vehicles.map((vehicle, index) => {
              const secondsDiff = getSecondsDiff(vehicle.lastUpdated)
              const timeColor = getTimestampColor(secondsDiff)

              return (
                <tr key={vehicle.id} className="hover:bg-fleet-bg transition-colors">
                  <td className="py-3 text-fleet-secondary font-medium">
                    {index + 1}.
                  </td>
                  <td className="py-3">
                    <span className="font-mono text-fleet-text font-medium text-xs">
                      {vehicle.id}
                    </span>
                  </td>
                  <td className="py-3 text-fleet-text font-medium">
                    {vehicle.distanceToday ?? vehicle.distance ?? 0} km
                  </td>
                  <td className="py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${STATUS_STYLES[vehicle.status] ?? STATUS_STYLES.offline}`}>
                      {STATUS_LABELS[vehicle.status] ?? vehicle.status}
                    </span>
                  </td>
                  <td className={`py-3 text-xs font-medium ${timeColor}`}>
                    {formatLastUpdated(vehicle.lastUpdated ?? vehicle.last_updated)}
                  </td>
                </tr>
              )
            })}

            {vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-fleet-secondary text-sm">
                  No vehicle data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}