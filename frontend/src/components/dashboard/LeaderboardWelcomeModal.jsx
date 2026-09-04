import { useEffect, useRef, useState } from "react";
import {X, Trophy} from 'lucide-react'
import { getManagerLeaderboard } from "@/services/fleetGroupService";
import useAuthStore from "@/store/authStore";

const RANK_STYLES = {
  1: 'bg-fleet-warning text-white',
  2: 'bg-fleet-secondary text-white',
  3: 'bg-fleet-idle text-white',
}

function scoreColour(score){
  if(score == null) return 'text-fleet-secondary'
  if(score >= 90) return 'text-fleet-green'
  if(score >= 75) return 'text-fleet-text'
  if(score >= 50) return 'text-fleet-warning'
  return 'text-fleet-alert'
}


export default function LeaderboardWelcome(){
  const { user } = useAuthStore()
  const dialogRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem('vaporJustLoggedIn') === 'true'
    if(justLoggedIn) {
      sessionStorage.removeItem('vaporJustLoggedIn')
      setOpen(true)
    } 
  }, [])

  useEffect(() => {
    const d = dialogRef.current
    if(!d) return

    if(open) {
      if (typeof d.showModal === 'function') {
        d.showModal()
      }else {
        d.setAttribute('open', '')
      }
    } else if (typeof d.close === 'function') {
      d.close()
    } else {
      d.removeAttribute('open')
  }
}, [open])

useEffect(() => {
  if(!open) return
  let cancelled = false

  getManagerLeaderboard(5)
    .then((data) => {
      if(!cancelled){
        setLeaderboard(data)
      }
    })
    .catch((err) => console.error('Welcome modal leaderboard fetch error:', err))
    .finally(() => {if (!cancelled) setLoading(false)})

  return () => {cancelled = true}
}, [open])

function handleClose(){
  setOpen(false)
}

if(!open) return null
return (
  <dialog
    ref={dialogRef}
    onCancel={handleClose}
    className="relative rounded-xl border border-fleet-border bg-fleet-surface p-0 w-full max-w-md backdrop:bg-black/40 m-auto overflow-hidden">

      <div className="p-5">
        <button 
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-fleet-secondary hover:text-fleet-text transition-colors"
          aria-label="close"
        >
        <X className="w-5 h-5"></X>
        </button>
        <div className="flex items-center justify-center gap-2 mb-1 text-center">
          <Trophy className="w-4 h-4 text-fleet-warning"></Trophy>
            <h2 className="font-display font-bold text-fleet-text text-base">
              Top Performing Fleet Managers
            </h2>
            </div>
          <p className="text-xs text-fleet-secondary mb-4 text-center">
            This Week's top performing fleet managers. Keep the wheels turning.
          </p>

          {loading && (
            <p className="text-sm text-fleet-secondary py-6 text-center">Loading...</p>
          )}

          {!loading && leaderboard.length === 0 && (
            <p className="text-sm text-fleet-secondary py-6 text-center">
              Not enough safety data yet to rank managers.
            </p>
          )}

          {!loading && leaderboard.length > 0 && (
            <ul className="divide-y divide-fleet-border">
              {leaderboard.map((entry) => {
                const isMe = user?.id === entry.manager_id
                return (
                  <li
                    key={entry.manager_id}
                    className={`flex items-center justify-between py-2.5 ${isMe ? 'bg-fleet-blue/5 -mx-5 px-5' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                        RANK_STYLES[entry.rank] ?? 'bg-fleet-bg text-fleet-secondary'}`}>
                          {entry.rank}
                        </span>

                        <span className="text-sm font-medium text-fleet-text">
                          {entry.manager_name} {isMe && <span className="text-fleet-blue">(You)</span>}
                        </span>
                        </div>

                        <span className={`text-sm font-bold ${scoreColour(entry.avg_safety_score)}`}>
                          {entry.avg_safety_score}
                        </span>
                        
                  </li>
                )
              })}
            </ul>
          )}

          <button 
            type="button"
            onClick={handleClose}
            className="w-full mt-4 text-sm font-medium text-white bg-fleet-blue rounded-lg py-2 hover:opacity-90 transition-opacity">
              Go to dashboard
            </button>
            </div>
            </dialog>
)
}