import { useEffect, useState } from 'react'
import { AlertCircle, ChevronRight, ChevronLeft, } from 'lucide-react'

import PropTypes from 'prop-types'

import {
    useNavigate
} from 'react-router-dom'

import VehicleStatusBadge from './VehicleStatusBadge'
import SafetyScoreRing from './SafetyScoreRing'


const columns = ['VEHICLE ID', 'STATUS', 'ZONE', 'ALERTS', 'SAFETY SCORE', 'LAST UPDATED', 'ACTIONS']

function parseTimestamp(value) {
    if (!value) return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? null : parsed
    }
    return null
}

function formatRelativeTime(value, nowMs) {
    if (!value) return 'Unknown'
    const parsed = parseTimestamp(value)
    if (!parsed) {
        return typeof value === 'string' ? value : 'Unknown'
    }

    const diffMs = Math.max(0, nowMs - parsed.getTime())
    const minutes = Math.floor(diffMs / 60000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

    const days = Math.floor(hours /  24)
    return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function VehiclesTable({ vehicles, page, totalPages, totalVehicles, pageSize, onPageChange }){
    const navigate = useNavigate()
    const [nowMs, setNowMs] = useState(() => Date.now())
    const start = (page-1)* pageSize + 1
    const end = Math.min(page *pageSize, totalVehicles)

    useEffect(() => { const interval = setInterval(() => setNowMs(Date.now()), 30000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="bg-white rounded-xl border border-fleet-border overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-fleet-border">
                        {columns.map((col) =>(
                            <th key={col} className="text-left text-xs font-medium text-fleet-secondary px-4 py-3">{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {vehicles.map((vehicle) => (
                        <tr
                        key={vehicle.id}
                        data-testid={`vehicle-row-${vehicle.id}`}
                        onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                        className="border-b border-fleet-border last:border-0 hover:bg-gray-50 cursor-pointer">
                            <td className="px-4 py-3 font-medium text-fleet-text">{vehicle.id}</td>
                            <td className="px-4 py-3"><VehicleStatusBadge status={vehicle.status}></VehicleStatusBadge></td>
                            <td className="px-4 py-3 text-fleet-secondary">{vehicle.zone ?? '-'}</td>
                            <td className="px-4 py-3">{vehicle.hasAlert ? <AlertCircle className="w-4 h-4 text-fleet-alert"></AlertCircle> : <span className="text-fleet-secondary">-</span>}</td>
                            <td className="px-4 py-3"><SafetyScoreRing score={vehicle.safetyScore}></SafetyScoreRing></td>
                            <td className={`px-4 py-3 ${vehicle.stale ? 'text-fleet-alert' : 'text-fleet-secondary'}`}>
                                {formatRelativeTime(vehicle.lastUpdated, nowMs)}
                            </td>
                            <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-fleet-secondary"></ChevronRight></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex items-center justify-between px-4 py-3 text-xs text-fleet-secondary">
                <span>Showing {start} to {end} of {totalVehicles} vehicles</span>
                <div className="flex items-center gap-1">
                    <button
                    type="button"
                    data-testid="vehicles-page-prev"
                    disabled={page===1}
                    onClick={() => onPageChange(page - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-fleet-border disabled:opacity-40">
                        <ChevronLeft className="w-3.5 h-3.5"></ChevronLeft>
                    </button>
                    {Array.from({ length: totalPages}, (_,i) => i+1).map((p) => (
                        <button
                        key={p}
                        type="button"
                        data-testid={`vehicles-page-${p}`}
                        onClick={() => onPageChange(p)}
                        className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium ${p === page ? 'bg-fleet-blue text-white' : 'border border-fleet-border text-fleet-text'}`}>
                            {p}
                        </button>
                    ))}
                    <button
                    type="button"
                    data-testid="vehicles-page-next"
                    disabled={page === totalPages}
                    onClick={() => onPageChange(page+1)}
                    className="w-7 h-7 flex items-center justify-center rounded-md border border-fleet-border disabled:opacity-40">
                        <ChevronRight className="w-3.5 h-3.5"></ChevronRight>
                    </button>
                </div>
            </div>
        </div>
    )
}

VehiclesTable.propTypes = {
    vehicles: PropTypes.array.isRequired,
    page: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    totalVehicles: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    onPageChange: PropTypes.func.isRequired,
}
