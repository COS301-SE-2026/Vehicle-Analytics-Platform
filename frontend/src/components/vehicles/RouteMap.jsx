import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import PropTypes from 'prop-types'

import { 
    Play,
    Rewind,
    FastForward,
    Maximize2
} from 'lucide-react'

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
    <div>
        <div className="relative h-64 rounded-lg overflow-hidden">
            <div ref={mapContainer} style={{width: '100%', height: '100%'}}/>
            <div className="absolute top-3 left-3 bg-white rounded-md px-3 py-1.5 text-xs font-medium text-fleet-text shadow-sm">
                {routeLabel}
            </div>
            </div>
            <div className="mt-2 bg-fleet-panel rounded-lg px-3 py-2 flex items-center gap-3">
                {/*REWIND*/}
                <button type="button" className="w-7 h-7 flex items-center justify-center text-fleet-text hover:text-fleet-blue">
                    <Rewind className="w-4 h-4"/>
                </button>
                {/*PLAY*/}
                <button type="button" className="w-8 h-8 rounded-full bg-fleet-blue flex items-center justify-center shrink-0">
                    <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5"/>
                </button>
                {/*FAST FORWARD*/}
                <button type="button" className="w-7 h-7 flex items-center justify-center text-fleet-text hover:text-fleet-blue">
                    <FastForward className="w-4 h-4"/>
                </button>
                <div className="flex-1 h-1 bg-fleet-border rounded-full overflow-hidden">
                    <div className="h-full bg-fleet-blue rounded-full" style={{ width: '0%'}}/>
                </div>
                <span className="text-xs text-fleet-secondary shrink-0">0.00</span>
                <button type="button" className="w-7 h-7 flex items-center justify-center text-fleet-text hover:text-fleet-blue">
                    <Maximize2 className="w-4 h-4" />
                </button>
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