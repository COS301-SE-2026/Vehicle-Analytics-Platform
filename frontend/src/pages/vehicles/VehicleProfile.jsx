import {
    useEffect, 
    useState
} from 'react'

import { 
    useParams,
    useNavigate
} from 'react-router-dom'

import { 
    ChevronLeft,
    RefreshCw
} from 'lucide-react'

import { getVehicleById, getVehicleSafetyScore, getVehicleSafetyScoreTrend, getVehicleTrips } from '@/services/vehicleService'

import CurrentTripTab from '@/components/vehicles/CurrentTripTab'
import VehicleStatusBadge from '@/components/vehicles/VehicleStatusBadge'
import TripHistoryList from '@/components/vehicles/TripHistoryList'
import SafetyScoreTrendChart from '@/components/vehicles/SafetyScoreTrendChart'
import OverallStatsFooter from '@/components/vehicles/OverallStatsFooter'
import { getScoreSeverity } from '@/utils/safetyScore'


const TABS = [
    {id: 'current', label: 'Current Trip'},
    {id: 'history', label: 'History'},
]

export default function VehicleProfile(){
    const {id} = useParams()
    const navigate = useNavigate()

    const [detail, setDetail] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState ('current')
    const [trips, setTrips] = useState([])
    const [overallStats, setOverallStats] = useState(null)
    const [dailyScores, setDailyScores] = useState([])

    useEffect(() => {
        let cancelled = false

        async function fetchDetail() {
            try {
                const [result, safety] = await Promise.all([
                    getVehicleById(id),
                    getVehicleSafetyScore(id),
                ])
                if (cancelled) return
                if (!result){
                    setError('Vehicle not found')
                }else {
                    setDetail({
                        ...result,
                        vehicle: {
                            ...result.vehicle,
                            todaySafetyScore: safety.safety_score,
                        },
                })
                setError(null)
            }
            }catch (err){
                if (cancelled) {
                    return
                }
                console.error('VehicleProfile fetch error:', err)
                setError('Failed to load vehicle details')
            }finally{
                if (!cancelled){
                    setLoading(false)
                }
            }
        }

            fetchDetail()
            return () => {
                cancelled = true
            }
        }, [id])

        useEffect(() => {
            let cancelled = false

            async function fetchHistory(){
                try{
                    const [result, trend] = await Promise.all([
                        getVehicleTrips(id),
                        getVehicleSafetyScoreTrend(id, 30),
                    ])

                    if(cancelled) return

                    setDailyScores(
                        trend.trend.map((t) => ({
                            date: t.date,
                            score: Number(t.safety_score) || 0,
                        }))
                    )
                    const mappedTrips = result.trips.map((t) => ({
                        id: String(t.id),
                        date: t.date,
                        startTime: t.start_time
                            ? new Date(t.start_time).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit'})
                            : '-',
                        endTime: t.end_time
                            ? new Date(t.end_time).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit'})
                            : '-',
                        distanceKm: Number(t.distance) || 0,
                        safetyScore: t.safety_score ?? 0,
                        routeLabel: `Trip #${t.id}`, //No route label yet
                        harshBrakingCount: t.harsh_brakes ?? 0,
                        harshAccelerationCount: t.harsh_accelerations ?? 0,
                        harshCorneringCount: t.harsh_cornering ?? 0,
                    }))

                    setTrips(mappedTrips)
                    // OverallStatsFooter destructures overallRating,
                    // incidentsPer100Km and activeDays and marks them
                    // required -- none were being supplied, so the footer
                    // rendered "undefined / 100km" and "undefined Days".
                    // Derived here from the trips already fetched.
                    const totalKm = Number(result.stats.total_distance) || 0
                    const totalIncidents = mappedTrips.reduce((sum, t) => sum + (t.harshBrakingCount + t.harshAccelerationCount + t.harshCorneringCount), 0)
                    const activeDays = new Set(mappedTrips.map((t) => new Date(t.date).toDateString())).size

                    setOverallStats({
                        overallSafetyScore: Number(result.stats.safety_rating) || 0,
                        overallRating: getScoreSeverity(Number(result.stats.safety_rating) || 0).label,

                        totalDistanceKm: totalKm,
                        totalTrips: Number(result.stats.trips_recorded) || 0,
                        incidentsPer100Km: totalKm > 0 ? Math.round((totalIncidents / totalKm) * 100 * 10) / 10 : 0,
                        activeDays: activeDays,
                    })

                } catch (err) {
                    if(cancelled) return
                    console.error('VehicleProfile history fetch error:', err)
                }
            }

            fetchHistory()
            return () => { cancelled = true}
        }, [id])

        if (loading){
            return (
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-6 h-6 text-fleet-secondary animate-spin" />
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

        const { vehicle, recent_events: recentEvents} = detail

        return (
            <div className="space-y-4">
                <button
                    type = "button"
                    data-testid="back-to-vehicles"
                    onClick={() => navigate('/vehicles')}
                    className="inline-flex items-center gap-1 text-sm text-fleet-secondary hover:text-fleet-text">
                        <ChevronLeft className="w-4 h-4" />
                        Back to Vehicles
                    </button>

                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-fleet-text">{vehicle.id}</h1>
                        <VehicleStatusBadge status={vehicle.status}/>
                    </div>

                    <div className="flex items-center gap-1 border-b border-fleet-border">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                data-testid={`vehicle-tab-${tab.id}`}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                                    activeTab === tab.id
                                        ? 'border-fleet-blue text-fleet-text'
                                        : 'border-transparent text-fleet-secondary hover:text-fleet-text'}`
                                    }>
                                        {tab.label}
                                    </button>
                                    
                                
                        ))}
                    </div>

                    {activeTab === 'current' && (
                        <CurrentTripTab vehicle={vehicle} recentEvents={recentEvents}></CurrentTripTab>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-4">
                            <SafetyScoreTrendChart dailyScores={dailyScores} trips={trips}/>
                        <TripHistoryList
                            trips={trips}
                            overallScore={overallStats?.overallSafetyScore}>
                        </TripHistoryList>
                        {overallStats && <OverallStatsFooter stats={overallStats} /> }
                    </div>
                    )}
            </div>
        )
}