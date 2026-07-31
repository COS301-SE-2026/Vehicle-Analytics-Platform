import { useEffect, useState } from 'react'

import PropTypes from 'prop-types'

import {
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'

import { getScoreSeverity } from '@/utils/safetyScore'
import { getTripReplay } from '@/services/vehicleService'
import GreenDrivingBreakdown from './GreenDrivingBreakdown'
import EventTimeline from './EventTimeline'
import RouteMap from './RouteMap'

const PAGE_SIZE = 10

function formatDate(dateStr){
    return new Date(dateStr).toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

function formatEventLabel(type){
    if (type === 'trip_started'){
        return 'Trip Started'
    }

    if (type == 'trip_ended'){
        return 'End of Trip'
    }

    return type
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

export default function TripHistoryList({ trips, overallScore}){
    const [page, setPage] = useState(1)
    const [expandedTripId, setExpandedTripId] = useState(null)
    const [tripEvents, setTripEvents] = useState([])
    const [tripRoute, setTripRoute] = useState([])

    useEffect(() => {
        if (!expandedTripId) {
            return
        }

        let cancelled = false
        getTripReplay(expandedTripId).then((replay) => {
            if(cancelled){
                return
            }

            setTripRoute(
                (replay.points || []).map((p) => ({
                    lat: p.latitude,
                    lng: p.longitude,
                    colour: p.colour,
                }))
            )

            setTripEvents(
                (replay.events || []).map((e) => ({
                    type: e.type,
                    label: formatEventLabel(e.type),
                    timestamp: e.time,
                    latitude: e.latitude,
                    longitude: e.longitude,
                }))
            )
        }).catch((err) => {
            if(!cancelled){
                console.error('Trip replay fetch error:', err)
            }
        })

        return() => {cancelled = true}
    }, [expandedTripId])

    const totalPages = Math.max(1, Math.ceil(trips.length / PAGE_SIZE))
    const pageItems = trips.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const start = trips.length === 0 ? 0 : (page-1) * PAGE_SIZE + 1
    const end = Math.min(page * PAGE_SIZE,trips.length)


    function toggleExpanded(tripId){
        setExpandedTripId((current) => (current === tripId ? null : tripId))
    }

    if (trips.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-fleet-border p-8 text-center">
                <p className="text-sm text-fleet-secondary">No trip history available.</p>
            </div>
        )
    }


    return (
        <div className="bg-white rounded-xl border border-fleet-border overflow-hidden">
            <div className="grid grid-cols-6 gap-2 px-4 py-3 border-b border-fleet-border text-xs font-medium text-fleet-secondary">
                <span>DATE</span>
                <span>START TIME</span>
                <span>END TIME</span>
                <span>DISTANCE</span>
                <span>SAFETY SCORE</span>
                <span></span>
            </div>

            {pageItems.map((trip) => {
                const severity = getScoreSeverity(trip.safetyScore)
                const isExpanded = expandedTripId === trip.id


                return (
                    <div key={trip.id} className="border-b border-fleet-border last:border-0">
                        <button 
                            type="button"
                            data-testid={`trip-row-${trip.id}`}
                            onClick={() => toggleExpanded(trip.id)}
                            className="w-full grid grid-cols-6 gap-2 px-4 py-3 text-sm text-left hover:bg-gray-50">
                                <span className="text-fleet-text">{formatDate(trip.date)}</span>
                                <span className="text-fleet-secondary">{trip.startTime}</span>
                                <span className="text-fleet-secondary">{trip.endTime}</span>
                                <span className="text-fleet-secondary">{trip.distanceKm} km</span>
                                <span className={`font-semibold ${severity.textClass}`}>{trip.safetyScore}/100</span>
                                <span className="flex justify-end">
                                    {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-fleet-secondary"/>
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-fleet-secondary"/>
 
                                    )}
                                </span>
                            </button>


                            {isExpanded && (
                                <div className="px-4 pb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <RouteMap
                                        routePoints={trip.id === expandedTripId ? tripRoute : []}
                                        routeLabel={trip.routeLabel}
                                    />
                                <div className="space-y-4">
                                    <GreenDrivingBreakdown
                                        harshBrakingCount={trip.harshBrakingCount}
                                        harshAccelerationCount={trip.harshAccelerationCount}
                                        harshCorneringCount={trip.harshCorneringCount}
                                    />
                                    <EventTimeline events={trip.id === expandedTripId ? tripEvents : []}/>
                                </div>
                                </div>
                            )}
                            </div>
                )
            })}

            <div className="flex items-center justify-between px-4 py-3 text-xs text-fleet-secondary border-b border-fleet-border">
                <span>Showing {start}-{end} of {trips.length}</span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        data-testid="trips-page-prev"
                        disabled={page === 1}
                        onClick={() => setPage((prev) => prev-1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md border border-fleet-border disabled:opacity-40">
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        {Array.from({ length: totalPages }, (_ , i) => i+ 1).map((pageNumber) => (
                            <button 
                                key={pageNumber}
                                type="button"
                                data-testid={`trips-page-${pageNumber}`}
                                onClick={()=> setPage(pageNumber)}
                                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium ${
                                    pageNumber === page ? 'bg-fleet-blue text-white' : 'border border-fleet-border text-fleet-text'
                                }`}>
                                
                                {pageNumber}
                                </button>
                        ))}

                        <button 
                            type="button"
                            data-testid="trips-page-next"
                            disabled={page === totalPages}
                            onClick={() => setPage((prev) => prev +1)}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-fleet-border disabled:opacity-40">
                                <ChevronRight className="w-3.5 h-3.5"/>
                            </button>
                </div>
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-medium text-fleet-secondary">OVERALL AVERAGE SAFETY SCORE</span>
                <span className="text-lg font-bold text-fleet-text">{overallScore}/100</span>
            </div>
        </div>
    )
}

TripHistoryList.propTypes = {
    trips: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            date: PropTypes.string.isRequired,
            startTime: PropTypes.string.isRequired,
            endTime: PropTypes.string.isRequired,
            distanceKm: PropTypes.number.isRequired,
            safetyScore: PropTypes.number.isRequired,
        })
    ).isRequired,

    overallScore: PropTypes.number,
}