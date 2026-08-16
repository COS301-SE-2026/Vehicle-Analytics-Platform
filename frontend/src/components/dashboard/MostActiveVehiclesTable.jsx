import PropTypes from "prop-types"

const STATUS_STYLES = {
  moving: 'bg-fleet-green text-white',
  active: 'bg-fleet-green text-white',
  idle: 'bg-fleet-warning text-white',
  offline: 'bg-fleet-idle text-white',
}

const STATUS_LABELS = {
  moving: 'MOVING',
  active: 'ACTIVE',
  idle: 'IDLE',
  offline: 'OFFLINE',
}

function getTimestampColor(seconds) {
  if (seconds < 30) return 'text-fleet-secondary'
  if (seconds < 120) return 'text-fleet-warning'
  return 'text-fleet-alert'
}

function getSecondsDiff(timestamp) {
  if (!timestamp) return 999
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return 999
  return Math.floor((Date.now() - parsed.getTime()) / 1000)
}

function formatLastUpdated(timestamp) {
  if (!timestamp) return 'Unknown'
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return 'Unknown'

  const diffMs = Math.max(0, Date.now() - parsed.getTime())
  const minutes = Math.floor(diffMs / 60000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
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
              const currentTimeStamp = vehicle.lastUpdate
              const secondsDiff = getSecondsDiff(currentTimeStamp)
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
                    {vehicle.distanceToday} km
                  </td>
                  <td className="py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${STATUS_STYLES[vehicle.status] ?? STATUS_STYLES.offline}`}>
                      {STATUS_LABELS[vehicle.status] ?? vehicle.status}
                    </span>
                  </td>
                  <td className={`py-3 text-xs font-medium ${timeColor}`}>
                    {formatLastUpdated(currentTimeStamp)}
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

MostActiveVehiclesTable.propTypes = {
  vehicles: PropTypes.array,
}
