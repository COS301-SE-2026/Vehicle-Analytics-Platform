import { useState } from 'react'

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
}from 'recharts'

import { getScoreSeverity } from '@/utils/safetyScore'

import PropTypes from 'prop-types'

function formatDateLabel(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short',
    })
}

function CustomToolTip({ active, payload, label }){
    if(!active || !payload || payload.length === 0){
        return null
    }

    const score = payload[0].value
    const severity = getScoreSeverity(score)

    return (
        <div className="bg-white norder border-fleet-border rounded-lg px-3 py-2 text-xs shdow-sm">
            <p className="text-fleet-secondary mb-1">{label}</p>
            <p className={`font-semibold ${severity.textClass}`}>Safety Score: {score}</p>
        </div>
    )
}

CustomToolTip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.array,
    label: PropTypes.string,
}

export default function SafetyScoreTrendChart({ dailyScores, trips }) {
    const [view, setView] = useState('day')

    const dayData = dailyScores.map((entry) => ({
        label: formatDateLabel(entry.date),
        score: entry.score,
    }))

    const tripData = [...trips]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((trip) => ({
        label: trip.routeLabel,
        score: trip.safetyScore,
    }))

    const chartData = view === 'day' ? dayData : tripData

    return (
        <div className="bg-white rounded-xl border border-fleet-border p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-fleet-text text-base">
                    Safety Score Trend
                </h2>

                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        data-testid="trend-view-day"
                        onClick={()=> setView('day')}
                        className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                            view === 'day'
                            ? 'border-fleet-blue text-fleet-blue'
                            : 'border-fleet-border text-fleet-secondary hover:text-fleet-text'
                        }`}>
                            Per Day
                        </button>

                        <button
                            type="button"
                            data-testid="trend-view-trip"
                            onClick={() => setView('trip')}
                            className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                                view === 'trip'
                                ? 'border-fleet-blue text-fleet-blue'
                                : 'border-fleet-border text-fleet-secondary hover:text-fleet-text'
                            }`}>
                                Per Trip
                        </button>
                </div>
            </div>


            {chartData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-fleet-secondary text-sm">
                    No safety score data available
                </div>
            ) : (
                <ResponsiveContainer width="100%" height = {200}>
                    <LineChart
                        data={chartData}
                        margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#D9D8D2"
                            ></CartesianGrid>


                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: '#6B6B63'}}
                                axisLine={false}
                                tickLine={false}
                            />

                            <YAxis
                                tick={{ fontSize: 11, fill: '#6B6B63'}}
                                axisLine={false}
                                tickLine={false}
                                domain={[0,100]}
                            />

                            <Tooltip content={<CustomToolTip/>}/>

                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#14304F"
                                strokeWidth={2}
                                dot={{fill: '#14304F', r: 3}}
                            />
                        </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}

SafetyScoreTrendChart.propTypes ={
    dailyScores: PropTypes.arrayOf(
        PropTypes.shape({
            date: PropTypes.string.isRequired,
            score: PropTypes.number.isRequired,
        })
    ).isRequired,
    trips: PropTypes.arrayOf(
        PropTypes.shape({
            date: PropTypes.string.isRequired,
            routeLabel: PropTypes.string.isRequired,
            safetyScore: PropTypes.number.isRequired,
        })
    ).isRequired,
}

