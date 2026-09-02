import {useEffect, useState} from 'react'
import PropTypes from 'prop-types'
import {Truck, ArrowRight} from 'lucide-react'
import { getVehiclesList } from '@/services/vehicleService'

function FleetGroupCard({ group, onSelect}) {

    const [stats, setStats] = useState(null)

    useEffect(() => {
        let cancelled = false

        async function fetchStats() {
            try{
                const result = await getVehiclesList({ fleetGroupId: group.id, limit: 1})
                if(!cancelled){
                    setStats({
                        moving: result.stats.moving ?? 0,
                        idle: result.stats.idle ?? 0,
                        offline: result.stats.offline ?? 0,
                    })
                }
            }catch(err){
                console.error('Fleet group stats fetch error:', err)
            }
        }

        fetchStats()
        return () => {cancelled = true}
    }, [group.id])

    return (
                <button 
                    type="button"
                    onClick={() => onSelect(group)}
                    className="text-left bg-fleet-surface rounded-xl border border-fleet-border p-5 flex flex-col gap-4 hover:border-fleet-blue transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                            <h3 className="font-display font-bold text-fleet-text text-base">{group.name}</h3>
                            <p className="text-xs text-fleet-secondary mt-1">{group.vehicle_count} vehicles</p>
                        </div>
                        <span className="h-8 w-8 shrink-0 rounded-full bg-fleet-bg flex items-center justify-center">
                            <Truck className="w-4 h-4 text-fleet-secondary"></Truck>

                        </span>
</div>
                        {group.description && (
                            <p className="text-sm text-fleet-secondary leading-snug">{group.description}</p>
                        )}
                        <div className="flex items-center gap-4 pt-3 border-t border-fleet-border">
                            <StatusCount color="bg-fleet-green" label="Active" value={stats?.moving}></StatusCount>
                            <StatusCount color="bg-fleet-idle" label="Idle" value={stats?.idle}></StatusCount>
                            <StatusCount color="bg-fleet-secondary" label="Offline" value={stats?.offline}></StatusCount>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-medium text-fleet-blue mt-auto">
                            View vehicles
                            <ArrowRight className="w-3 h-3"></ArrowRight>
                        </div>
                </button>
            )
}

FleetGroupCard.propTypes = {
    group: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        vehicle_count: PropTypes.number,

    }).isRequired,
    onSelect: PropTypes.func.isRequired,
}

function StatusCount({ color, label, value}) {
    return (
        <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${color}`}></span>    
            <span className="text-xs text-fleet-secondary">
                {value ?? '-'} <span className="text-fleet-secondary/70">{label}</span>
            </span>    
        </div>
    )
}

StatusCount.propTypes = {
    color: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.number,
}

export default function FleetGroupCards({ groups, onSelect}){
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
                <FleetGroupCard key={group.id} group={group} onSelect={onSelect}></FleetGroupCard>
            ))}
        </div>
    )
}

FleetGroupCards.propTypes = {
    groups: PropTypes.array.isRequired,
    onSelect: PropTypes.func.isRequired,
}