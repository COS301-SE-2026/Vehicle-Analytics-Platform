import PropTypes from 'prop-types'

import FleetMap from '../map/FleetMap'

//I will be passing a vehicle as a single vehicle array to isolate the car selected from the vehicles page
//It will be read only as well
export default function LiveTrackingMap({ vehicle }) {
    const vehicleAsArray = vehicle ? [vehicle] : []

    return (
        <div className="h-64 rounded-lg overflow-hidden">
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