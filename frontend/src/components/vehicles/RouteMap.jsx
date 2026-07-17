import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import PropTypes from 'prop-types'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

export default function RouteMap({ routePoints, routeLabel}) {
    const mapContainer = useRef(null)
    const map = useRef(null)

    useEffect(() => {
        if (!mapContainer.current || routePoints.length === 0){
            return
        }

        const coordinates = routePoints.map((point) => [point.lng, point.lat])

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: coordinates[Math.floor(coordinates.length / 2)],
            zoom: 12,
        })

        map.current.on('load', () => {
            map.current.addSource('route', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates,
                    },
                },
            })

            map.current.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round'},
                paint: { 'line-color': '#14304F', 'line-width': 4},
            })


            new mapboxgl.Marker({ color: '#4D7C5F'}).setLngLat(coordinates[0]).addTo(map.current)
            new mapboxgl.Marker({ color: '#C0392B'}).setLngLat(coordinates[coordinates.length-1]).addTo(map.current)
        })

        return () => {
            map.current?.remove()
            map.current = null
        }
    }, [routePoints])

    return (
        <div className="relative h-64 rounded-lg overflow-hidden">
            <div ref={mapContainer} style={{width: '100%', height: '100%'}}/>
            <div className="absolute top-3 left-3 bg-white rounded-md px-3 py-1.5 text-xs font-medium text-fleet-text shadow-sm">
                {routeLabel}
            </div>
        </div>
    )
}

RouteMap.propTypes = {
    routePoints: PropTypes.arrayOf(
        PropTypes.shape({
            lat: PropTypes.number.isRequired,
            lng: PropTypes.number.isRequired,
        })
    ).isRequired,
    routeLabel: PropTypes.string.isRequired,
}