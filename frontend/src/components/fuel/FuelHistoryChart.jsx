
import React, { useState, useEffect } from 'react';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { getVehicleFuelHistory } from '../../services/fuelService';



const FuelHistoryChart = ({ vehicleId }) => {

    const [history, setHistory] = useState([]);

    const [period, setPeriod] = useState('week');

    const [loading, setLoading] = useState(true);


    
    useEffect(() => {
    
        fetchHistory();
    
    }, [vehicleId, period]);


    
    const fetchHistory = async () => {
    
        setLoading(true);
    
        try {
    
            const data = await getVehicleFuelHistory(vehicleId, period);
    
            setHistory(data || []);
    
        } catch (error) {
    
            console.error('Error fetching fuel history:', error);
    
            setHistory([]);
    
        }
    
        setLoading(false);
    
    };


    
    if (loading) {
    
        return <div className="text-center py-8 text-gray-500">Loading fuel history...</div>;
    
    }


    
    if (!history || history.length === 0) {
    
        return <div className="text-center py-8 text-gray-500">No fuel history data available</div>;
    
    }


    
    const totalDistance = history.reduce((sum, h) => sum + Number(h.total_distance || 0), 0);
    
    const totalFuel = history.reduce((sum, h) => sum + Number(h.total_fuel || 0), 0);
    
    const avgEfficiency = totalDistance > 0 && totalFuel > 0 ? totalDistance / totalFuel : 0;
    
    const totalTrips = history.reduce((sum, h) => sum + Number(h.trip_count || 0), 0);


    
    return (
    
    <div className="space-y-6">
    
            <div className="flex justify-between items-center">
    
                <h3 className="font-semibold text-gray-800">Fuel Efficiency History</h3>
    
                <div className="flex gap-2">
    
                    <select
    
    value={period}
    
    onChange={(e) => setPeriod(e.target.value)}
    
    className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
    
    >
    
                        <option value="day">Daily</option>
    
                        <option value="week">Weekly</option>
    
                        <option value="month">Monthly</option>
    
                    </select>
    
                </div>
    
            </div>



            <div className="bg-white rounded-lg shadow-sm p-4">

                <h4 className="text-sm text-gray-500 mb-2">Summary</h4>

                <div className="grid grid-cols-4 gap-4">

                    <div>

                        <p className="text-xs text-gray-400">Avg Efficiency</p>

                        <p className="text-lg font-bold text-purple-600">

                            {avgEfficiency.toFixed(2)} km/L

                        </p>

                    </div>

                    <div>

                        <p className="text-xs text-gray-400">Total Distance</p>

                        <p className="text-lg font-bold text-green-600">

                            {totalDistance.toFixed(1)} km

                        </p>

                    </div>

                    <div>

                        <p className="text-xs text-gray-400">Total Fuel</p>

                        <p className="text-lg font-bold text-yellow-600">

                            {totalFuel.toFixed(1)} L

                        </p>

                    </div>

                    <div>

                        <p className="text-xs text-gray-400">Total Trips</p>

                        <p className="text-lg font-bold text-blue-600">

                            {totalTrips}

                        </p>

                    </div>

                </div>

            </div>



            <div className="grid grid-cols-2 gap-4">

                <div className="bg-white rounded-lg shadow-sm p-4">

                    <h4 className="text-sm text-gray-500 mb-2">Total Distance</h4>

                    <ResponsiveContainer width="100%" height={150}>

                        <BarChart data={history}>

                            <XAxis dataKey="period_start" hide />

                            <YAxis />

                            <Tooltip />

                            <Bar dataKey="total_distance" fill="#10B981" name="Distance (km)" />

                        </BarChart>

                    </ResponsiveContainer>

                </div>

                <div className="bg-white rounded-lg shadow-sm p-4">

                    <h4 className="text-sm text-gray-500 mb-2">Total Fuel</h4>

                    <ResponsiveContainer width="100%" height={150}>

                        <BarChart data={history}>

                            <XAxis dataKey="period_start" hide />

                            <YAxis />

                            <Tooltip />

                            <Bar dataKey="total_fuel" fill="#F59E0B" name="Fuel (L)" />

                        </BarChart>

                    </ResponsiveContainer>

                </div>

            </div>

        </div>

);

};



export default FuelHistoryChart;


