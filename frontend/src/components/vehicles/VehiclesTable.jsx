import {
    AlertCircle,
    ChevronRight,
    ChevronLeft,
} from 'lucide-react'

import PropTypes from 'prop-types'

import {
    useNavigate
} from 'react-router-dom'

import VehicleStatusBadge from './VehicleStatusBadge'

import SafetyScoreRing from './SafetyScoreRing'

const columns = ['VEHICLE ID', 'STATUS', 'ZONE', 'ALERTS', 'SAFETY SCORE', 'LAST UPDATED', 'ACTIONS']

export default function VehiclesTable({ vehicles, page, totalPages, totalVehicles, pageSize, onPageChange }){
    const navigate = useNavigate()
    const start = (page-1)* pageSize + 1
    const end = Math.min(page *pageSize, totalVehicles)

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
                            <td className={`px-4 py-3 ${vehicle.stale ? 'text-fleet-alert' : 'text-fleet-secondary'}`}>{vehicle.lastUpdated}</td>
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
                    data-testid={`vehicles-page-next}`}
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