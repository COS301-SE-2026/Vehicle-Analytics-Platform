import { Component } from 'react'
import FleetMap from '../map/FleetMap'
import PropTypes from 'prop-types'

class MapErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-72 flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
          Map unavailable — Mapbox token not configured
        </div>
      )
    }
    return this.props.children
  }
}

export default function MapSection({ active, idle, offline, vehicles = [] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-700">Live Fleet Map</h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />
            {active} Moving
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            {idle} Idle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
            {offline} Offline
          </span>
        </div>
      </div>
      <MapErrorBoundary>
        <div className="h-72">
          <FleetMap
            vehicles={vehicles}
            minimal={true}
          />
        </div>
      </MapErrorBoundary>
    </div>
  )
}

MapSection.propTypes = {
  active:   PropTypes.number,
  idle:     PropTypes.number,
  offline:  PropTypes.number,
  vehicles: PropTypes.array,
}