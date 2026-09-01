import PropTypes from 'prop-types'
import FleetMap from '../map/FleetMap'

export default function LiveTrackingMap({ vehicle }) {
    const vehicleAsArray = vehicle ? [vehicle] : []
    return (
        <div className="relative h-64 rounded-lg overflow-hidden">
            <FleetMap vehicles = {vehicleAsArray} minimal></FleetMap>
        </div>
    )
}

LiveTrackingMap.propTypes = {
    vehicle: PropTypes.shape({
        id: PropTypes.string.isRequired,
        lat: PropTypes.number.isRequired,
        lng: PropTypes.number.isRequired,
        status: PropTypes.string,
    }),
}