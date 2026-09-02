

import React from 'react';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';



export default function FuelHistoryChart({ data }) {

    if (!data || data.length === 0) {

        return (

<div className="bg-white rounded-2xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80">

        <p className="text-center text-gray-400 py-8">No fuel history data available</p>

      </div>

);

}



const chartData = data.map((item) => ({

    date: new Date(item.period_start || item.date).toLocaleDateString('en-ZA', { 

        day: 'numeric', 

        month: 'short' 

    }),

    efficiency: Number.parseFloat(item.avg_efficiency || item.efficiency || 0),

    distance: Number.parseFloat(item.total_distance || item.distance || 0)

}));



return (

<div className="bg-white rounded-2xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100/80">

      <h4 className="text-sm font-medium text-gray-700 mb-4">Fuel Efficiency Trend</h4>

      <div className="h-64">

        <ResponsiveContainer width="100%" height="100%">

          <LineChart data={chartData}>

            <XAxis 

dataKey="date" 

tick={{ fontSize: 11, fill: '#9CA3AF' }}

axisLine={{ stroke: '#E5E7EB' }}

tickLine={false}

/>

            <YAxis 

tick={{ fontSize: 11, fill: '#9CA3AF' }}

axisLine={{ stroke: '#E5E7EB' }}

tickLine={false}

label={{ value: 'km/L', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#9CA3AF' } }}

/>

            <Tooltip 

contentStyle={{ 

    backgroundColor: 'white', 

    border: '1px solid #E5E7EB',

    borderRadius: '12px',

    boxShadow: '0 4px 20px rgba(0,0,0,0.08)'

}}

formatter={(value) => [`${Number.parseFloat(value).toFixed(1)} km/L`, 'Efficiency']}

/>

            <Line 

type="monotone" 

dataKey="efficiency" 

stroke="#10B981" 

strokeWidth={2.5}

dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}

activeDot={{ r: 6 }}

/>

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>

);

}

