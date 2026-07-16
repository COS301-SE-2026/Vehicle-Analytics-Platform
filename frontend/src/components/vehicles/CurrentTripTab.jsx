import PropTypes from 'prop-types'
import {
    AlertTriangle,
    TrendingUp,
    MapPin
} from 'lucide-react'

import LiveTrackingMap from './LiveTrackingMap'
import { getScoreSeverity} from '@/utils/safetyScore'

const EVENT_ICONS = {
    harsh_braking: AlertTriangle,
    harsh_acceleration: TrendingUp,
    harsh_cornering: TrendingUp,
    speeding: MapPin,
    crash_detection: AlertTriangle,    
}

function formatEventLabel(type) {
    return type
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

function formatTime(timestamp){
    return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default function CurrentTripTab({ vehicle, recentEvents }){
    const severity = getScoreSeverity(vehicle.todaySafetyScore)
    const isSpeeding = vehicle.speed > vehicle.speedLimit
    const previewEvents = recentEvents.slice(0,3)

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Live Tracking Map */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-fleet-border p-4">
                    <h2 className="text-sm font-semibold text-fleet-text mb-3">Live Tracking</h2>
                    <LiveTrackingMap
                        vehicle={{ id: vehicle.id, lat: vehicle.latitude, lng: vehicle.longitude, status: vehicle.status}}>
                    </LiveTrackingMap>
                    <p className="text-xs text-fleet-secondary mt-3 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5"></MapPin>
                        Current Location: {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
                    </p>
                </div>
                {/*SPEED AND SAETY SCORE*/}
                <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-xl border border-fleet-border p-4">
                        <div className="relative flex items-center justify-center w-[88px] h-[88px] mx-auto">
                        <svg width="88" height="88" className="-rotate-90">
                            <circle cx="44" cy="44" r="38" fill="none" stroke="#E5E7EB" strokeWidth="6"/>
                            <circle
                                cx="44" cy="44" r="38" fill="none"
                                stroke={severity.ringColour} strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={2*Math.PI*38}
                                strokeDashoffset={2*Math.PI*38* (1- (vehicle.todaySafetyScore ?? 0) / 100)}>

                                </circle>
                        </svg>
                        <span className="absolute text-2xl font-bold text-fleet-text">{vehicle.todaySafetyScore ?? '-'}</span>
</div>

                        <p className="text-xs text-fleet-secondary mt-3 text-center">Today's Safety Score</p>
                        <p className="text-xs text-fleet-secondary text-center">Resets daily at midnight</p>
                    </div>

                    <div className="bg-white rounded-xl border border-fleet-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-fleet-secondary">
                                CURRENT SPEED
                            </span>
                            {isSpeeding && (
                                <span className="text-xs font-semibold text-fleet-alert bg-red-50 rounded-full px-2 py-0.5">
                                    SPEEDING
                                </span>
                            )}
                        </div>
                        

                        <p className={`text-xl font-bold ${isSpeeding ? 'text-fleet-alert' : 'text-fleet-text'}`}>
                            {vehicle.speed} KM/H
                        </p>


                        <div className="border-t border-fleet-border pt-3">
                            <span className="text-xs font-medium text-fleet-secondary">
                                TRIP TIME
                            </span>
                            <p className="text-xl font-bold text-fleet-text">


                                {formatTripDuration(vehicle.tripStartTime)}


                            </p>
                        </div>
                    </div>
                </div>
            </div>


            {/*LIVE EVENT FEED */}
            <div className="bg-white rounded-xl border border-fleet-border p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-fleet-text">
                        Live Event Feed
                    </h2>

                    <button type="button" className="text-xs font-medium text-fleet-green hover:underline">
                        View All
                    </button>
                </div>

                <div className="space-y-3">
                    {previewEvents.length === 0 && (
                        <p className="text-sm text-fleet-secondary">No events recorded yet today.</p>


                    )}
                    {previewEvents.map((event) => {
                        const Icon = EVENT_ICONS[event.type] ?? AlertTriangle
                        return(
                            <div key={`${event.type}-${event.timestamp}`} className="flex items-start gap-3">
                                <Icon className="w-4 h-4 text-fleet-alert mt-0.5"></Icon>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-fleet-text">{formatEventLabel(event.type)}</p>
                                    <p className="text-xs text-fleet-secondary">
                                        {event.speed ? `${event.speed} KM/H \u2022 ` : ''}
                                        {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                                    </p>
                                    </div>
                        <span className="text-xs text-fleet-secondary">
                            {formatTime(event.timestamp)}
                        </span>
                        </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function formatTripDuration(tripStartTime) {
    if (!tripStartTime) return '-'
    const elapsedMs = Date.now() - new Date(tripStartTime).getTime()
    const hours = Math.floor(elapsedMs / 3600000)
    const minutes = Math.floor((elapsedMs % 3600000) / 60000)
    const seconds = Math.floor((elapsedMs % 60000) / 1000)
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

CurrentTripTab.propTypes = {
    vehicle: PropTypes.shape({
        id: PropTypes.string.isRequired,
        status: PropTypes.string.isRequired,
        latitude: PropTypes.number.isRequired,
        longitude: PropTypes.number.isRequired,
        speed: PropTypes.number,
        speedLimit: PropTypes.number,
        todaySafetyScore: PropTypes.number,
        tripStartTime: PropTypes.string,
    }).isRequired,
    recentEvents: PropTypes.arrayOf(
        PropTypes.shape({
            type: PropTypes.string.isRequired,
            speed: PropTypes.number,
            latitude: PropTypes.number.isRequired,
            longitude: PropTypes.number.isRequired,
            timestamp: PropTypes.string.isRequired,
        })
    ).isRequired,
}