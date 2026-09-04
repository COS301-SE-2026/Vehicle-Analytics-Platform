import { useEffect, useState } from "react";
import {Trophy, RefreshCw} from 'lucide-react'
import { getManagerLeaderboard } from "@/services/fleetGroupService";
import useAuthStore from "@/store/authStore";

const RANK_STYLES = {
    1: 'bg-fleet-warning text-white',
    2: 'bg-fleet-secondary text-white',
    3: 'bg-fleet-idle text-white',
}

function scoreColour(score){
    if(score >= 90) return 'text-fleet-green'
    if(score >= 75) return 'text-fleet-text'
    if(score >= 50) return 'text-fleet-warning'

    return 'text-fleet-alert'
}

export default function ManagerLeaderboard() {
    const {user} = useAuthStore()
    const [leaderboard, setLeaderBoard] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false

        async function fetchLeaderboard() {
            try{
                const data = await getManagerLeaderboard(5)
                if(!cancelled){
                    setLeaderBoard(data)
                    setError(null)
                }
            }catch(err){
                console.error('Manager leaderboard fetch error:', err)
                if(!cancelled){
                    setError('Failed to load leaderboard')
                }
            }finally{
                if(!cancelled){
                    setLoading(false)
                }
            }
        }

            fetchLeaderboard()

            return () => {cancelled = true}
        }, [])

        return (
            <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-fleet-warning"></Trophy>
                    <h2 className="font-display font-bold text-fleet-text text-base">
                        Top Performing Fleet Managers
                    </h2>
                </div>

                <p className="text-xs text-fleet-secondary -mt-2">
                    Ranked by average fleet safety score, last 7 days
                </p>

                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-5 h-5 text-fleet-secondary animate-spin"></RefreshCw>
                    </div>
                )}

                {!loading && error && (
                    <p className="text-fleet-alert text-sm py-4">
                        {error}
                    </p>
                )}  

                {!loading && !error && leaderboard.length === 0 && (
                    <p className="text-fleet-secondary text-sm py-4">
                        Not enough safety data yet to rank managers.
                    </p>
                )}

                {!loading && !error && leaderboard.length > 0 && (
                    <ul className="divide-y divide-fleet-border">
                        {leaderboard.map((entry) => {
                            const isMe = user?.id === entry.manager_id
                            return (
                                <li
                                    key={entry.manager_id}
                                    className={`flex items-center justify-between py-3 ${isMe ? 'bg-fleet-blue/5 -mx-5 px-5 rounded-md' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    RANK_STYLES[entry.rank] ?? 'bg-fleet-bg text-fleet-secondary'
                                                }`}
                                            >
                                                {entry.rank}
                                            </span>

                                            <div>
                                                <p className="text-sm font-medium text-fleet-text">
                                                    {entry.manager_name} {isMe && <span className="text-fleet-blue">(You)</span>}
                                                </p>
                                                <p className="text-xs text-fleet-secondary">
                                                    {entry.vehicle_count} vehicles &middot; {entry.group_count} group{entry.group_count === 1 ? '' : 's'}
                                                </p>
                                            </div>
                                        </div>

                                        <span className={`text-sm font-bold ${scoreColour(entry.avg_safety_score)}`}>
                                            {entry.avg_safety_score}
                                        </span>
                                    </li>
                            )
                        })}
                    </ul>
                )}
            </div>
        )
}