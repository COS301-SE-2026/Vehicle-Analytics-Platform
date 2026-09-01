import PropTypes from 'prop-types'
import { Users } from 'lucide-react'

export default function FleetGroupsTable({ groups = [], onManage }) {
    return (
        <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-fleet-text text-base">
                    Fleet Groups
                </h2>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-fleet-secondary text-xs uppercase tracking-wide border-b border-fleet-border">
                            <th className="text-left pb-3 font-medium">Group</th>
                            <th className="text-left pb-3 font-medium">Vehicles</th>
                            <th className="text-left pb-3 font-medium">Assigned</th>
                            <th className="text-left pb-3 font-medium">Status</th>
                            <th className="text-left pb-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-fleet-border">
                        {groups.map((group) => (
                            <tr key = {group.id} className="hover:bg-fleet-bg transition-colors">
                                {/*GROUP NAME*/}
                                <td className="py-3">
                                    <span className="font-medium text-fleet-text">{group.name}</span>
                                    {group.description && (
                                        <p className="text-xs text-fleet-secondary mt-0.5">
                                            {group.description}
                                        </p>
                                    )}
                                </td>

                                {/*VEHICLES (count)*/}
                                <td className="py-3">
                                    <span className="text-fleet-secondary">
                                        {group.vehicle_count}
                                    </span>
                                </td>

                                {/*Assigned managers as chips*/}
                                <td className="py-3">
                                    {group.assigned_managers.length === 0 ? (
                                        <span className="text-xs text-fleet-idle">None assigned</span>
                                    ) : ( 
                                        <div className="flex flex-wrap gap-1.5">
                                            {group.assigned_managers.map((manager) => (
                                                <span  
                                                    key={manager.id}
                                                    className="text-xs bg-fleet-green/10 text-fleet-green px-2 py-0.5 rounded-full font-medium">
                                                        {manager.name}
                                                    </span>
                                            ))}
                                        </div>
                                    )}
                                </td>

                                {/*UNASSIGNED FLAG*/}
                                <td className="py-3">
                                    {group.is_unassigned ? (
                                        <span className="text-[10px] text-bold px-2 py-1 rounded-full uppercase bg-fleet-alert text-white">Unassigned</span>
                                    ) : ( 
                                        <span className="text-[10px] font-bold px-2 py-1 rounded-full uppercase bg-fleet-green text-white">
                                            Assigned
                                        </span>
                                    )}
                                </td>

                                {/*ACTIONS*/}
                                <td className="py-3 text-right">
                                    <button
                                        type="button"
                                        onClick={() => onManage(group)}
                                        className="inline-flex items-center gap-1.5 text-xs text-fleet-secondary hover:text-fleet-text transition-colors font-medium">
                                            <Users className="w-3.5 h-3.5"></Users>
                                            Manage
                                        </button>
                                </td>
                            </tr>
                        ))}

                        {groups.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-fleet-secondary text-sm">
                                    No fleet groups found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

FleetGroupsTable.propTypes = {
    groups: PropTypes.array,
    onManage: PropTypes.func.isRequired,
}