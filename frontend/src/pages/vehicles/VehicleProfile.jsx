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

import { getVehicleById } from '@/services/mockTripData'
import CurrentTripTab from '@/components/vehicles/CurrentTripTab'
import VehicleStatusBadge from '@/components/vehicles/VehicleStatusBadge'

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

    useEffect(() => {
        let cancelled = false

        async function fetchDetail() {
            try {
                const result = await getVehicleById(id)
                if (cancelled) return
                if (!result){
                    setError('Vehicle not found')
                }else {
                    setDetail(result)
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
                                        ? 'border-fleet-green text-fleet-text'
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
                        <div className="flex items-center justify-center h-64">
                            <p className="text-fleet-secondary text-sm">History tab coming soon...</p>
                        </div>
                    )}
            </div>
        )
}