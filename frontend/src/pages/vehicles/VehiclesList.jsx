import {useEffect, useState} from 'react'
import { ChevronDown, RefreshCw } from 'lucide-react'

import { getVehicleLocations, getFleetSafetyScores } from '@/services/vehicleService'
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
            const [locationResult, safetyScores] = await Promise.all([
                getVehicleLocations(),
                getFleetSafetyScores(),
            ])

            if (cancelled){
                return
            }

            const scoreByVehicle = Object.fromEntries(
                safetyScores.map((s) => [s.vehicle_id, s])
            )

            const merged = locationResult.vehicles.map((v) => ({
                id: v.id,
                status: v.status,
                zone: null, //NEED CHECK HERE
                hasAlert: false, //NEED CHEC ALSO CANT SEEM TO FIND SOURCE YET
                safetyScore: scoreByVehicle[v.id]?.safety_score ?? null,
                lastUpdated: v.lastUpdated,
                stale: v.status === 'offline',
            }))


            const scored = merged.filter((v) => v.safetyScore !== null && v.safetyScore !== undefined)
            const avgSafetyScore = scored.length
                ? scored.reduce((sum, v) => sum + v.safetyScore, 0) / scored.length
                : null
            const lowestScoringVehicle = scored.length
                ? scored.reduce((a,b) => (a.safetyScore < b.safetyScore ? a : b))
                : null

            setVehicles(merged)
            setSummary({
                totalVehicles: merged.length,
                avgSafetyScore,
                avgSafetyScoreDelta: null, //No endpoint i found for this yet
                activeTripsToday: merged.filter((v) => v.status ==='active').length, //it is currently active counts. not true trips today
                lowestScoringVehicle: lowestScoringVehicle
                    ? { id: lowestScoringVehicle.id, score: lowestScoringVehicle.safetyScore}
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
    }, [])

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

    const filtered = statusFilter === 'all' ? vehicles : vehicles.filter((vehicle) => vehicle.status === statusFilter)

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
        <option value="active">Moving</option>
        <option value="idle">Idle</option>
        <option value="offline">Offline</option>
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-fleet-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/>

        </div>
        </div>

        <VehicleSummaryCards summary={summary}/>

        <VehiclesTable
            vehicles={pageItems}
            page={page}
            totalPages={totalPages}
            totalVehicles={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            />
            </div>
    )
}