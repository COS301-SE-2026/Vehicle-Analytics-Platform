import { useEffect, useMemo, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts'

import PropTypes from 'prop-types'

import { BarChart3, ChevronDown } from "lucide-react";

import { getVehiclesList } from "@/services/vehicleService";

function scoreColour(score) {
    if(score == null) return '#9E9E9E'
    if(score >= 90) return '#4D7C5F'
    if(score >= 75) return '#14304F'
    if(score >= 50) return '#E67E22'
    return '#C0392B'
}

function GroupSelect({ value, onChange, groups, excludeId, label}) {
    return (
        <label className="flex items-center gap-2 text-xs text-fleet-secondary">
            {label}
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="appearance-none text-sm border border-fleet-border rounded-lg pl-3 pr-8 py-1.5 text-fleet-text bg-white">
                        {groups.map((g) => (
                            <option key={g.id} value={g.id} disabled={g.id === excludeId}>
                                {g.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-fleet-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></ChevronDown>

            </div>
        </label>
    )
}

GroupSelect.propTypes = {
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onChange: PropTypes.func.isRequired,
    groups: PropTypes.array.isRequired,
    excludeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    label: PropTypes.string.isRequired,
}

export default function FleetvsFleetAnalytics({ groups}) {
    const sortedByFleetSize = useMemo(
        () => [...groups].sort((a,b) => (b.vehicle_count ?? 0) - (a.vehicle_count ?? 0)),
        [groups]
    )

    const [groupAId, setGroupAId] = useState(sortedByFleetSize[0]?.id)
    const [groupBId, setGroupBId] = useState(sortedByFleetSize[1]?.id)
    const [data, setData] = useState([])
    const [showAll, setShowAll] = useState(false)
    const [loading, setLoading] = useState(true)

    const selected = showAll
        ? groups
        : [groupAId, groupBId].map((id) => groups.find((g) => g.id === id)).filter(Boolean)


    useEffect(() => {
        let cancelled = false

        async function fetchAll() {
            setLoading(true)
            try{
                const results = await Promise.all(
                    selected.map(async (group) => {
                        try{
                            const result = await getVehiclesList({ fleetGroupId: group.id, limit: 1})
                            return {
                                id: group.id,
                                name: group.name,
                                score: result.stats?.avg_safety_score != null
                                    ? Number(result.stats.avg_safety_score)
                                    : null,
                                vehicles: result.stats?.total ?? 0,
                                harshEvents: Number(result.stats?.harsh_events_today ?? 0),
                                crashes: Number(result.stats?.crashes_today ?? 0),
                            }
                        }catch (err) {
                            console.error(`Fleet vs fleet fetch error for group ${group.id}:`, err)
                            return {id: group.id, name: group.name, score: null, vehicles: 0, harshEvents: 0, crashes: 0}
                        }
                    })
                )
                if(!cancelled){
                    setData(results)
                }
            }finally {
                if(!cancelled) setLoading(false)
            }
        }

        if(showAll ? groups.length > 0 : (groupAId && groupBId)) fetchAll()
            return () => {cancelled = true}
    }, [groupAId, groupBId, showAll, groups])

    if(groups.length < 2){
        return null
    }


    return (
        <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-fleet-blue"></BarChart3>
                    <h2 className="font-display font-bold text-fleet-text text-base">
                        Fleet vs Fleet Analytics
                    </h2>
                </div>

                {groups.length > 2 && (
                    <div className="flex items-center gap-3">
                        {!showAll && (
                            <>
                        <GroupSelect label="Compare" value={groupAId} onChange={setGroupAId} groups={groups} excludeId={groupBId}></GroupSelect>
                        <GroupSelect label="with" value={groupBId} onChange={setGroupBId} groups={groups} excludeId={groupAId}></GroupSelect>
                            </>
                        )}
                    <button
                        type="button"
                        onClick={() => setShowAll((prev) => !prev)}
                        className="text-xs font-medium text-fleet-blue hover:text-fleet-blue/80 transition-colors whitespace-nowrap">
                            {showAll ? 'Compare 2 fleets' : 'Show all fleets'}
                        </button>
                    </div>
                )}
            </div>
            <p className="text-xs text-fleet-secondary mb-4">
                Average safety score today
            </p>

            {loading && (
                <div className="h-[160px] flex items-center justify-center text-fleet-secondary text-sm">
                    Comparing...
                </div>
            )}

            {!loading && (
                <>
                <ResponsiveContainer width="100%" height={Math.max(140, data.length * 56)}>
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 4, right:24, left: 8, bottom: 4}}
                        barCategoryGap="35%">
                        
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#D9D8D2"></CartesianGrid>
                        <XAxis
                            type="number"
                            domain={[0, 100]}
                            tick={{ fontSize: 11, fill: '#6B6B63' }}
                            axisLine={false}
                            tickLine={false}
                        ></XAxis>
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={110}
                            tick={{ fontSize: 12, fill: '#2B2D26' }}
                            axisLine={false}
                            tickLine={false}
                        ></YAxis>
                        <Tooltip
                            contentStyle={{
                                background: '#FFFFFF',
                                border: '1px solid #D9D8D2',
                                borderRadius: '8px',
                                fontSize: '12px',
                            }}
                            formatter={(value, key, entry) => [
                                value != null ? `${value} safety score` : 'No data yet',
                                `${entry.payload.vehicles} vehicles`,
                            ]}
                        ></Tooltip>


                        <Bar dataKey="score" radius={[0,4,4,0]} maxBarSize={28}>
                            {data.map((entry) => (
                                <Cell key={entry.id} fill={scoreColour(entry.score)}></Cell>
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                <table className="w-full text-sm mt-4">
                    <thead>
                        <tr className="text-fleet-secondary text-xs uppercase tracking-wide border-b border-fleet-border">
                            <th className="text-left pb-2 font-medium">Fleet</th>
                            <th className="text-right pb-2 font-medium">Vehicles</th>
                            <th className="text-right pb-2 font-medium">Harsh Events Today</th>
                            <th className="text-right pb-2 font-medium">Crashes Today</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-fleet-border">
                        {data.map((row) => (
                            <tr key={row.id}>
                                <td className="py-2 font-medium text-fleet-text">{row.name}</td>
                                <td className="py-2 text-right text-fleet-secondary">{row.vehicles}</td>
                                <td className={`py-2 text-right font-medium ${row.harshEvents > 0 ? 'text-fleet-warning' : 'text-fleet-secondary'}`}>{row.harshEvents}</td>
                                <td className={`py-2 text-right font-medium ${row.crashes > 0 ? 'text-fleet-alert' : 'text-fleet-secondary'}`}>{row.crashes}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </>
            )}
        </div>
    )
}

FleetvsFleetAnalytics.propTypes = {
    groups: PropTypes.array.isRequired,
}