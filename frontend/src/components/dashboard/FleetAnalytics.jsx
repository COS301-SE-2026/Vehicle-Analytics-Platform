import { useState, useEffect } from 'react'
import FleetSafetyScoreTrend from './FleetSafetyScoreTrend'
import FleetEventBreakdown from './FleetEventBreakdown'
import TopEventContributors from './TopEventContributors'
import LowestSafetyScoresTable from './LowestSafetyScoresTable'
import { getFleetAnalytics } from '../../services/vehicleService'

export default function FleetAnalytics() {
  const [range, setRange] = useState('day')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => getFleetAnalytics(range))
      .then((res) => { if (!cancelled) setData(res) })
      .catch((err) => { 
        console.error('Fleet analytics failed:', err)
        if (!cancelled) setData(null) 
      })
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
            Today
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
              
              {/* Dynamic title based on range */}
              <FleetSafetyScoreTrend 
                data={data.safetyTrend} 
                title={range === 'day' ? 'Fleet Safety Score (Today - Hourly)' : 'Fleet Safety Score Trend'}
              />
            </div>
            <div className="space-y-4">
              <FleetEventBreakdown events={data.eventBreakdown} />
              <TopEventContributors contributors={data.topContributors} />
            </div>
          </div>
          <LowestSafetyScoresTable vehicles={data.lowestSafetyScores} />
        </>
      )}
    </div>
  )
}