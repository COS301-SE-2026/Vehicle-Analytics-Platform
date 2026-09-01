import {useEffect, useState} from 'react'
import { ChevronDown, RefreshCw, ArrowLeft } from 'lucide-react'

import { getVehiclesList } from '@/services/vehicleService'
import { getMyFleetGroups } from '@/services/fleetGroupService'

import useAuthStore from '@/store/authStore'

import VehicleSummaryCards from '@/components/vehicles/VehicleSummaryCards'
import VehiclesTable from '@/components/vehicles/VehiclesTable'
import FleetGroupCards from '@/components/vehicles/FleetGroupCards'

const PAGE_SIZE = 10

const SCOPED_ROLES = ['manager', 'fleet_manager']

export default function VehiclesList(){
    const {role} = useAuthStore()
    const isScoped = SCOPED_ROLES.includes(role)

    const [myGroups, setMyGroups] = useState([])
    const [groupsLoading, setGroupsLoading] = useState(isScoped)
    const [groupsError, setGroupsError] = useState(null)
    const [selectedGroup, setSelectedGroup] = useState(null)


    const [vehicles, setVehicles] = useState([])
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState('all')

useEffect(() => {

    if(!isScoped){
        return
    }

    let cancelled = false

    async function fetchGroups() {
        try{
            const groups = await getMyFleetGroups()

                if(cancelled){
                    return
                }

                setMyGroups(groups)
                setGroupsError(null)

        }catch(err) {
            if(cancelled){
                return
            }
                console.error('My Fleet groups fetch error:', err)
                setGroupsError('Failed to load your fleet groups')
        }finally {
            if(!cancelled){
                setGroupsLoading(false)
            }
        }
    }

    fetchGroups()
    return () => {cancelled = true}
}, [isScoped])

useEffect(() => {
    if(isScoped && !selectedGroup){
        return
    }

    let cancelled = false


    async function fetchAll(){
        setLoading(true)
        try{
            const result = await getVehiclesList({ 
                status: statusFilter, 
                page, 
                limit: PAGE_SIZE,
                fleetGroupId: isScoped ? selectedGroup.id : undefined,
            })

            if (cancelled){
                return
            }

            const merged = result.vehicles.map((v) => ({
                id: v.id,
                status: v.status,
                zone: null, //NEED CHECK HERE
                safetyScore: v.safety_score,
                hasAlert: v.has_alert,
                isSpeeding: v.is_speeding,
                lastUpdated: v.last_updated,
                stale: v.status === 'offline',
            }))

            setVehicles(merged)
            setSummary({
                totalVehicles: result.stats.total ?? 0,
                avgSafetyScore: result.stats.avg_safety_score != null ? Number(result.stats.avg_safety_score) : null,
                avgSafetyScoreDelta: null, //No endpoint i found for this yet. no historical comparison endpoint yet
                activeTripsToday: result.stats.moving ?? 0,
                lowestScoringVehicle: result.stats.lowest_scoring_vehicle
                    ? { id: result.stats.lowest_scoring_vehicle, score: result.stats.lowest_score}
                    : null,
            })

            setError(null)
        }catch (err){
            if (cancelled){
                return
            }
            console.error('Vehicle List Fetch error:', err)
            setError('Failed to load vehicle data')


            } finally {
                if (!cancelled){
                    setLoading(false)
                }
            }
        }
        

        fetchAll()
        return () => {cancelled = true}
    }, [page, statusFilter, isScoped, selectedGroup])


function handleSelectGroup(group) {
    setSelectedGroup(group)
    setPage(1)
    setStatusFilter('all')
    setLoading(true)
    setVehicles([])
    setSummary(null)
    setError(null)
}


    if(isScoped && groupsLoading) {
            return (
                <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 text-fleet-secondary animate-spin"></RefreshCw>
                </div>
            )
        }

        if (isScoped && groupsError){
            return (
                <div className="flex items-center justify-center h-64">
                    <p className="text-fleet-alert text-sm">{groupsError}</p>
                </div>
            )
        }

        if (isScoped && myGroups.length === 0){
            return (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <p className="text-fleet-text font-medium mb-1">No fleet groups assigned</p>
                    <p className="text-sm text-fleet-secondary">Contact an Admin to get access to a fleet group.</p>
                </div>
            )
        }

        if (isScoped && !selectedGroup){
            return (
                <div className="space-y-4">
                    <div>
                    <h1 className="text-xl font-bold text-fleet-text">My Fleet Groups</h1>
                    <p className="text-sm text-fleet-secondary">Select a group to view its vehicles</p>
                </div>
                <FleetGroupCards groups={myGroups} onSelect={handleSelectGroup}></FleetGroupCards>
                </div>
            )
        }

        if(loading) {
            return (
                <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 text-fleet-secondary animate-spin"></RefreshCw>
                </div>
            )
        }

        if (error){
            return (
                <div className="flex items-center justify-center h-64">
                    <p className="text-fleet-alert text-sm">{error}</p>
                </div>
            )
        }

        if(!summary){
            return (
                <div className="flex items-center justify-center h-64">
                    <p className="text-fleet-secondary text-sm">No data available</p>
                </div>
            )
        }

    const totalPages = Math.max(1, Math.ceil((summary.totalVehicles ?? 0) / PAGE_SIZE))

    return(
        <div className="space-y-4">
            <div className="flex items-start justify-between">
        <div>
            {isScoped && (
                <button 
                    type="button"
                    onClick={() => setSelectedGroup(null)}
                    className="inline-flex items-center gap-1 text-xs text-fleet-secondary hover:text-fleet-text mb-1">
                        <ArrowLeft className="w-3.5 h-3.5"></ArrowLeft>
                        Switch group
                    </button>
            )}

            <h1 className="text-xl font-bold text-fleet-text">{isScoped ? selectedGroup.name : 'Vehicles'}</h1>
            <p className="text-sm text-fleet-secondary">{summary.totalVehicles} registered vehicles</p>
        </div>
        <div className="relative">
            <select 
            value={statusFilter}
            onChange={(e) => {setStatusFilter(e.target.value); setPage(1) }}
            className="appearance-none text-sm border border-fleet-border rounded-lg pl-3 pr-8 py-2 text-fleet-text bg-white">
        
        <option value="all">All Statuses</option>
        <option value="moving">Moving</option>
        <option value="idle">Idle</option>
        <option value="offline">Offline</option>
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-fleet-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/>

        </div>
        </div>

        {isScoped && myGroups.length > 1 && (
            <div className="flex flex-wrap gap-2">
                {myGroups.map((g) => (
                    <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectGroup(g)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                            g.id === selectedGroup.id
                                ? 'bg-fleet-blue text-white'
                                : 'bg-fleet-bg text-fleet-secondary hover:text-fleet-text'
                        }`}>
                            {g.name}
                        </button>
                ))}
            </div>
        )}

        <VehicleSummaryCards summary={summary}/>

        <VehiclesTable
            vehicles={vehicles}
            page={page}
            totalPages={totalPages}
            totalVehicles={summary.totalVehicles}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            />
            </div>
    )
}