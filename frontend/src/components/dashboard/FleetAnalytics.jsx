import { useState, useEffect } from 'react'
import FleetSafetyScoreTrend from './FleetSafetyScoreTrend'
import FleetEventBreakdown from './FleetEventBreakdown'
import TopEventContributors from './TopEventContributors'
import LowestSafetyScoresTable from './LowestSafetyScoresTable'
import { getFleetAnalytics } from '../../services/vehicleService'
import { Magnet } from 'lucide-react'
import ManagerLeaderboard from './ManagerLeaderboard'

export default function FleetAnalytics() {
  const [range, setRange] = useState('day')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getFleetAnalytics(range)
      .then((res) => { if (!cancelled) setData(res) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [range])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fleet-text">Fleet Analytics</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRange('day')}
            className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
              range === 'day'
                ? 'border-fleet-green text-fleet-green'
                : 'border-fleet-border text-fleet-secondary hover:text-fleet-text'
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setRange('week')}
            className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
              range === 'week'
                ? 'border-fleet-green text-fleet-green'
                : 'border-fleet-border text-fleet-secondary hover:text-fleet-text'
            }`}
          >
            Weekly
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center h-32 text-fleet-secondary text-sm">
          Loading fleet analytics…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <FleetSafetyScoreTrend data={data.safetyTrend} />
            </div>
            <div className="space-y-4">
              <FleetEventBreakdown events={data.eventBreakdown} />
              <TopEventContributors contributors={data.topContributors} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols gap-4">
            <div className="lg:col-span-2">
          <LowestSafetyScoresTable vehicles={data.lowestSafetyScores} />
          </div>
          <div className="lg:col-span-1">
            <ManagerLeaderboard></ManagerLeaderboard>
          </div>
          </div>
        </>
      )}
    </div>
  )
}