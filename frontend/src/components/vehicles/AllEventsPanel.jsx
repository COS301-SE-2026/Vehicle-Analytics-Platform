import { useState } from "react";

import PropTypes from 'prop-types'

import {
    AlertTriangle,
    TrendingUp,
    MapPin,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet'

const EVENT_ICONS = {
    harsh_braking: AlertTriangle,
    harsh_acceleration: TrendingUp,
    harsh_cornering: TrendingUp,
    speeding: MapPin,
    crash_detection: AlertTriangle,
}

const PAGE_SIZE = 8

function formatEventLabel(type) {
    return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatDateHeading(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    })
}

export default function AllEventsPanel({ open, onOpenChange, vehicleId, events }) {
    const [page, setPage] = useState(1)

    const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE))
    const pageItems = events.slice((page-1) * PAGE_SIZE, page * PAGE_SIZE)
    const start = events.length === 0 ? 0 : (page - 1) * PAGE_SIZE +1
    const end = Math.min(page*PAGE_SIZE, events.length)
    const dateHeading = events[0] ? formatDateHeading(events[0].timestamp) : ''

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>All Events: {dateHeading}</SheetTitle>
                    <SheetDescription>Vehicle: {vehicleId}</SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-4 space-y-3">
                    {pageItems.length === 0 && (
                        <p className="text-sm text-fleet-secondary">No events recorded yet today.</p>
                    )}
                    {pageItems.map((event) => {
                        const Icon = EVENT_ICONS[event.type] ?? AlertTriangle
                        return (
                            <div key={`${event.type}-${event.timestamp}`} className="flex items-start gap-3">
                                <Icon className="w-4 h-4 text-fleet-alert mt-0.5"></Icon>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-fleet-text">{formatEventLabel(event.type)}</p>
                                    <p className="text-xs text-fleet-secondary">
                                        {event.speed ? `${event.speed} KM/H \u2022 ` : ''}
                                        {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                                    </p>
                                </div>
                                <span className="text-xs text-fleet-secondary">{formatTime(event.timestamp)}</span>
                                </div>
                        )
                    })}
                </div>
                <div className="flex items-center justify-between px-4 pb-4 text-xs text-fleet-secondary">
                    <span>Showing {start}-{end} of {events.length}</span>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            data-testid="events-page-prev"
                            disabled={page === 1}
                            onClick={() => setPage((prev) => prev-1)}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-fleet-border disabled:opacity-40">

                                <ChevronLeft className="w-3.5 h-3.5"/>
                            </button>

                            {Array.from({ length: totalPages}, (_,i) => i+1).map((pageNumber) => (
                                <button
                                    key={pageNumber}
                                    type="button"
                                    data-testid={`events-page-${pageNumber}`}
                                    onClick={()=> setPage(pageNumber)}
                                    className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium ${
                                        pageNumber === page ? 'bg-fleet-blue text-white' : 'border border-fleet-border text-fleet-text'
                                    }`}>
                                        {pageNumber}
                                    </button>
                            ))}

                        <button
                            type="button"
                            data-testid="events-page-next"
                            disabled={page === totalPages}
                            onClick={() => setPage((prev) => prev+1)}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-fleet-border disabled:opacity-40">

                                <ChevronRight className="w-3.5 h-3.5"/>
                            </button>

                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

AllEventsPanel.propTypes = {
    open: PropTypes.bool.isRequired,
    onOpenChange: PropTypes.func.isRequired,
    vehicleId: PropTypes.string.isRequired,
    events: PropTypes.arrayOf(
        PropTypes.shape({
            type: PropTypes.string.isRequired,
            speed: PropTypes.number,
            latitude: PropTypes.number.isRequired,
            longitude: PropTypes.number.isRequired,
            timestamp: PropTypes.string.isRequired,
        })
    ).isRequired,
}