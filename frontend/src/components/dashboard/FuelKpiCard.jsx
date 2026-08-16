/* NOSONAR */

import {useState, useEffect} from 'react'

import {Fuel} from 'lucide-react'

import {getFuelDashboard} from '../../services/fuelService'



export default function FuelKpiCard() {

    const [data, setData] = useState(null)

    const [loading, setLoading] = useState(true)


    
    useEffect(() => {
    
        async function fetchData() {
    
            try {
    
                const result = await getFuelDashboard()
    
                setData(result)
    
            } catch (err) {
    
                console.error('Failed to fetch fuel data:', err)
    
            } finally {
    
                setLoading(false)
    
            }
    
        }
    
        fetchData()
    
        const interval = setInterval(fetchData, 30000)
    
        return () => clearInterval(interval)
    

    }, [])


    
    if(loading){

    
        return <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>
    
    }


    
    return(
        
    
    <div className="bg-white rounded-lg shadow p-4 border border-fleet-border hover:shadow-lg transition-all duration-300">
    
            <div className="flex items-center justify-between">
    
                <div className="flex items-center gap-2">
    
                    <Fuel className="w-5 h-5 text-fleet-green" />
    
                    <h3 className="text-sm font-medium text-gray-500">Fuel Efficiency</h3>
    
                </div>
    
                <span className={`text-xs px-2 py-0.5 rounded-full ${
    
    (data?.avg_fleet_efficiency_km_l || 0) > 12 ? 'bg-green-100 text-green-700' :
    
    (data?.avg_fleet_efficiency_km_l || 0) > 8 ? 'bg-yellow-100 text-yellow-700' :
    
    'bg-red-100 text-red-700'
    
    }`}>
    
                    {(data?.avg_fleet_efficiency_km_l || 0) > 12 ? 'Excellent' :
    
    (data?.avg_fleet_efficiency_km_l || 0) > 8 ? 'Good' : 'Needs Improvement'}
    
                </span>
    
            </div>
    
            <div className="mt-2">
    
                <p className="text-2xl font-bold text-fleet-text">
    
                    {data?.avg_fleet_efficiency_km_l || 0} <span className="text-sm font-normal text-gray-500">km/L</span>
    
                </p>
    
                <p className="text-xs text-gray-500">Fleet Average</p>
    
            </div>
    
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
    
                <div>
    
                    <span className="text-gray-500">Fuel Today:</span>
    
                    <span className="ml-1 font-semibold text-fleet-text">
    
                        {data?.total_fuel_consumed_liters || 0} L
    
                    </span>
    
                </div>
    
                <div>
    
                    <span className="text-gray-500">Distance:</span>
    
                    <span className="ml-1 font-semibold text-fleet-text">
    
                        {data?.total_distance_km || 0} km
    
                    </span>
    
                </div>
    
            </div>
    
            <div className="mt-2 text-xs text-gray-400">
    
                {data?.vehicles_tracked || 0} vehicles tracked today
    
            </div>
    
        </div>
    
)
}


