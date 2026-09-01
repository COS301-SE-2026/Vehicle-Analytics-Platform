import PropTypes from 'prop-types'
import {Truck} from 'lucide-react'

export default function FleetGroupCards({ groups, onSelect}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
                <button 
                    key={group.id}
                    type="button"
                    onClick={() => onSelect(group)}
                    className="text-left bg-fleet-surface rounded-xl border border-fleet-border p-5 hover;border-fleet-blue transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-display font-bold text-fleet-text text-base">{group.name}</h3>
                            <Truck className="w-4 h-4 text-fleet-secondary"></Truck>
                        </div>
                        {group.description && (
                            <p className="text-xs text-fleet-secondary mb-3">{group.description}</p>
                        )}

                        <p className="text-sm text-fleet-secondary">{group.vehicle_count} vehicles</p>

                </button>
            ))}
        </div>
    )
}

FleetGroupCards.propTypes = {
    groups: PropTypes.array.isRequired,
    onSelect: PropTypes.func.isRequired,
}