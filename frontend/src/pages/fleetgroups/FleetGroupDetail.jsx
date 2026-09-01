import {useState, useEffect, useCallback} from 'react'
import {useParams, useNavigate} from 'react-router-dom'
import {ArrowLeft,
    UserMinus,
    RefreshCw,
    Search
} from 'lucide-react'

import{
    getFleetGroups,
    assignFleetManager,
    removeFleetManagerAssignment,
    getAvailableVehicles,
    bulkAssignVehicles,
} from '@/services/fleetGroupService'

import { getUsers } from '@/services/vehicleService'

const PAGE_SIZE = 20

const STATUS_TABS = [
    {value: 'unassigned', label: 'Unassigned'},
    {value: 'in_group', label: 'In This Group'},
    {value: 'other', label: 'In Another Group'},
]

export default function FleetGroupDetail() {
    const {id} = useParams()
    const navigate = useNavigate()

    const [group, setGroup] = useState(null)
    const [managers, setManagers] = useState([])
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState(null)

    //Manager secton
    const [selectedManagerId, setSelectedManagerId] = useState('')
    const [managerSaving, setManagerSaving] = useState(false)
    const [managerError, setManagerError] = useState(null)

    //vehicles section
    const [status, setStatus] = useState('unassigned')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [vehicles, setVehicles] = useState([])
    const [total, setTotal] = useState(0)
    const [vehiclesLoading, setVehiclesLoading] = useState(false)
    const [vehiclesError, setVehiclesError] = useState(null)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [assigning, setAssigning] = useState(false)
    const [selectingAll, setSelectingAll] = useState(false)


    const fetchGroupAndManagers = useCallback(async () => {
        try{
            const [groupList, userList] = await Promise.all([getFleetGroups(), getUsers()])
            const found = groupList.find((g) => String(g.id) === String(id))
            setGroup(found ?? null)
            setManagers((userList.users || []).filter((u) => u.role === 'fleet_manager' && u.is_active))
            setErrorMsg(found ? null : 'Fleet group not found')
        }catch (err) {
            console.error('Fleet group detail fetch error:', err)
            setErrorMsg('Failed to load fleet group')
        }finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        fetchGroupAndManagers()
    }, [fetchGroupAndManagers])

    const fetchVehiclePage = useCallback(async () => {
        if(!group){
            return
        }

        setVehiclesLoading(true)

        try {
            const result = await getAvailableVehicles(group.id, {status, search, page, limit: PAGE_SIZE })
            setVehicles(result.vehicles)
            setTotal(result.total)
            setVehiclesError(null)
        }catch (err) {
            setVehiclesError(err.message || 'Failed to load vehicles')
        }finally {
            setVehiclesLoading(false)
        }
    }, [group, status, search, page])


    useEffect(() => {
        fetchVehiclePage()
    }, [fetchVehiclePage])


    if(loading) {
        return(
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 text-fleet-secondary animate-spin"></RefreshCw>
            </div>
        )
    }

    if(!group){
        return (
            <div className="space-y-4">
                <button 
                    type="button"
                    onClick={() => navigate('/fleet-groups')}
                    className="inline-flex items-center gap-1.5 text-sm text-fleet-secondary hover:text-fleet-text transition-colors">
                        <ArrowLeft className="w-4 h-4"></ArrowLeft>
                        Back to Fleet Groups
                    </button>

            <p className="text-fleet-alert text-sm">{errorMsg || 'Fleet group not found'}</p>
            </div>
        )
    }

    const assignedIds = new Set(group.assigned_managers.map((m) => m.id))
    const eligibleManagers =managers.filter((m) => !assignedIds.has(m.id))


    async function handleAssignManager() {
        if(!selectedManagerId){
            return
        }


        setManagerSaving(true)
        setManagerError(null)

        try{
            await assignFleetManager(group.id, Number(selectedManagerId))
            setSelectedManagerId('')
            await fetchGroupAndManagers()
        }catch (err) {
            setManagerError(err.message || 'Failed to assing manager')
        }finally {
            setManagerSaving(false)
        }
    }

    async function handleRemoveManager(managerId){
        setManagerSaving(true)
        setManagerError(null)


        try {
            await removeFleetManagerAssignment(group.id, managerId)
            await fetchGroupAndManagers()
        }catch (err){
            setManagerError(err.message || 'Failed to remove manager')
        } finally {
            setManagerSaving(false)
        }
    }

    function toggleOne(vehicleId){
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if(next.has(vehicleId)){
                next.delete(vehicleId)
            }else{
                next.add(vehicleId)
            }

            return next
        })
    }


    function toggleAllOnPage() {
        const pageIds = vehicles.map((v) => v.id)
        const allSelected = pageIds.every((vid) => selectedIds.has(vid))
        setSelectedIds((prev) => {
            const next = new Set(prev)

            if(allSelected){
                pageIds.forEach((vid) => next.delete(vid))
            }else{
                pageIds.forEach((vid) => next.add(vid))
            }

            return next
        })
    }

    async function selectAllMatching() {
        setSelectingAll(true)

        try{
            const result = await getAvailableVehicles(group.id, {status, search, page: 1, limit: total || PAGE_SIZE })
            setSelectedIds((prev) => {
                const next = new Set(prev)
                result.vehicles.forEach((v) => next.add(v.id))
                return next
            })
        } catch(err) {
            setVehiclesError(err.message || 'Failed to select all matching vehicles')
        } finally {
            setSelectingAll(false)
        }
    }

    async function handleBulkAssign() {
        if(selectedIds.size === 0){
            return
        }

        setAssigning(true)
        setVehiclesError(null)

        try{
            await bulkAssignVehicles(group.id, Array.from(selectedIds))
            setSelectedIds(new Set())
            await fetchVehiclePage()
        }catch(err) {
            setVehiclesError(err.message || 'Failed to assign vehicles')
        }finally{
            setAssigning(false)
        }
    }

    const pageIds = vehicles.map((v) => v.id)
    const allOnPageSelected = pageIds.length > 0 && pageIds.every((vid) => selectedIds.has(vid))
    const totalPages = Math.max(1, Math.ceil(total/ PAGE_SIZE))

    return (
        <div className="space-y-4">
            <button
                type="button"
                onClick={() => navigate('/fleet-groups')}
                className="inline-flex items-center gap-1.5 text-sm text-fleet-secondary hover:text-fleet-text transition-colors">
                    <ArrowLeft className="w-4 h-4"></ArrowLeft>
                    Back to Fleet Groups
                </button>

                <div>
                    <h1 className="font-display font-bold text-fleet-text text-xl">{group.name}</h1>
                    {group.description && (
                        <p className="text-sm text-fleet-secondary mt-1">{group.description}</p>
                    )}
                </div>


                <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5">
                    <h2 className="font-display font-bold text-fleet-text text-base mb-4">Assigned Managers</h2>

                    {managerError && (
                        <p className="text-xs text-fleet-alert mb-3">{managerError}</p>
                    )}


                    {group.assigned_managers.length === 0 ? (
                        <p className="text-xs text-fleet-idle mb-4">No managers assigned yet</p>
                    ) : ( 
                        <ul className="space-y-2 mb-4">
                            {group.assigned_managers.map((manager) => (
                                <li
                                key={manager.id}
                                className="flex items-center justify-between bg-fleet-bg rounded-lg px-3 py-2">
                                    <div>
                                        <p className="text-sm text-fleet-text font-medium">{manager.name}</p>
                                        <p className="text-sm text-fleet-secondary">{manager.email}</p>
                                    </div>
                                    <button
                                    type="button"
                                    disabled={managerSaving}
                                    onClick={() => handleRemoveManager(manager.id)}
                                    className="text-fleet-alert hover:text-fleet-alert/80 transition-colors disabled:opacity-50"
                                    aria-label={`Remove ${manager.name}`}>
                                        <UserMinus className="w-4 h-4"></UserMinus>
                                    </button>
                                </li>
                            ))}
                        </ul>



                    )}

                    {group.assigned_managers.length === 0 ? (

                    <div className="flex gap-2">
                        <select
                        value={selectedManagerId}
                        onChange={(e) => setSelectedManagerId(e.target.value)}
                        className="flex-1 text-sm border border-fleet-border rounded-lg px-3 py-2 bg-fleet-surface text-fleet-text">
                            <option value="">Select a manager...</option>
                            {eligibleManagers.map((manager) => (
                                <option key={manager.id} value={manager.id}>
                                    {manager.name} ({manager.email})
                                </option>
                            ))}
                        </select>

                        <button
                        type="button"
                        disabled={!selectedManagerId || managerSaving}
                        onClick={handleAssignManager}
                        className="text-sm bg-fleet-blue text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-fleet-blue/90 transition-colors">
                            {managerSaving ? 'Saving...' : 'Assign'}
                        </button>
                    </div>
                    ) : (
                        <p className="text-xs text-fleet-idle">
                            This group already has a manager. Remove the current before assigning a new one.
                        </p>
                    )}
        </div>

        <div className="bg-fleet-surface rounded-xl border border-fleet-border p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-fleet-text text-base">Vehicles</h2>

                <button
                type="button"
                disabled={selectedIds.size === 0 || assigning}
                onClick={handleBulkAssign} 
                className="text-sm bg-fleet-blue text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-fleet-blue/90 transition-colors">
                    {assigning ? 'Assigning...' : `Assign ${selectedIds.size || ''} to group`}
                </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
                {STATUS_TABS.map((tab) => (
                    <button
                    key={tab.value}
                    type="button"
                    onClick={() => setStatus(tab.value)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-ful transition-colors ${
                        status === tab.value
                    ? 'bg-fleet-blue text-white'
                    : 'bg-fleet-bg text-fleet-secondary hover:text-fleet-text'
                }`}>
                    {tab.label}
                </button>
                ))}

                <div className="relative ml-auto">
                    <Search className="w-3.5 h-3.5 text-fleet-secondary absolute left-2.5 top-1/2 -translate-y-1/2"></Search>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search vehicle ID..."
                        className="text-sm border border-fleet-border rounded-lg pl-8 pr-3 py-1.5 bg-fleet-surface text-fleet-text"></input>
                </div>
            </div>

            {vehiclesError && (
                <p className="text-xs text-fleet-alert mb-3">{vehiclesError}</p>
            )}


            {vehiclesLoading ? (
                <div className="py-8 text-center text-fleet-secondary text-sm">Loading vehicles...</div>
            ) : (
                <>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-fleet-secondary text-xs uppercase tracking-wide border-b border-fleet-border">
                                <th className="text-left pb-3 font-medium w-8">
                                    <input 
                                        type="checkbox"
                                        checked={allOnPageSelected}
                                        onChange={toggleAllOnPage}
                                    ></input>
                                </th>

                                <th className="text-left pb-3 font-medium">Vehicle</th>
                                <th className="text-left pb-3 font-medium">Current Group</th>

                            </tr>
                        </thead>

                        <tbody className="divide-y divide-fleet-border">
                            {vehicles.map((vehicle) => (
                                <tr key={vehicle.id} className="hover:bg-fleet-bg transition-colors">
                                    <td className="py-3">
                                        <input  
                                            type="checkbox"
                                            checked={selectedIds.has(vehicle.id)}
                                            onChange={() => toggleOne(vehicle.id)}
                                        ></input>
                                    </td>
                                    <td className="py-3 text-fleet-text font-medium">{vehicle.id}</td>
                                    <td className="py-3 text-fleet-secondary">{vehicle.fleet_group_name || 'Unassigned'}</td>
                                </tr>
                            ))}

                            {vehicles.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-8 text-center text-fleet-secondary text-sm">
                                        No vehicles found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
        </div>

        {total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 text-xs text-fleet-secondary">
            <button
                type="button"
                onClick={selectAllMatching}
                disabled={selectingAll}
                className="hover:text-fleet-text transition-colors font-medium disabled:opacity-50">
                    {selectingAll ? 'Selecting...' : `Select all ${total} matching`}
                </button>

            <div className="flex items-center gap-3">
            <button 
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="disabled:opacity-40 hover:text-fleet-text transition-colors">
                Prev
                </button>

                <span>Page {page} of {totalPages}</span>
            <button 
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="disabled:opacity-40 hover:text-fleet-text transition-colors">
                Next
                </button>
            </div>
            </div>
        )}
            </>
        )}
        </div>
        </div>
    )
}