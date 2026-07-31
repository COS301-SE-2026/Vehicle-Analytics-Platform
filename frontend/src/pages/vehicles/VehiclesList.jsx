import {useEffect, useState} from 'react'
import { ChevronDown, RefreshCw } from 'lucide-react'

import { getVehiclesList } from '@/services/vehicleService'
import VehicleSummaryCards from '@/components/vehicles/VehicleSummaryCards'
import VehiclesTable from '@/components/vehicles/VehiclesTable'

const PAGE_SIZE = 10

export default function VehiclesList(){
    const [vehicles, setVehicles] = useState([])
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState('all')

useEffect(() => {
    let cancelled = false

    async function fetchAll(){
        try{
            const result = await getVehiclesList({ status: statusFilter, page, limit: PAGE_SIZE })

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
    }, [page, statusFilter])

        if (loading){
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
            <h1 className="text-xl font-bold text-fleet-text">Vehicles</h1>
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