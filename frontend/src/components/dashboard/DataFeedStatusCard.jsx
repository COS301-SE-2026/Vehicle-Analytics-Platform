import PropTypes from 'prop-types'

export default function DataFeedStatusCard({ isLive = true, lastReceived = '3 seconds ago' }) {
  return (
    <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5 flex flex-col justify-between">
      <p className="text-fleet-secondary text-xs uppercase tracking-wide font-medium">
        Data Feed Status
      </p>
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-fleet-green animate-pulse' : 'bg-fleet-idle'}`} />
          <span className={`font-display font-bold text-2xl ${isLive ? 'text-fleet-green' : 'text-fleet-idle'}`}>
            {isLive ? 'Live' : 'Offline'}
          </span>
        </div>
        <p className="text-fleet-secondary text-xs mt-1">
          Last received {lastReceived}
        </p>
      </div>
    </div>
  )
}

DataFeedStatusCard.propTypes = {
  isLive:       PropTypes.bool,
  lastReceived: PropTypes.string,
}