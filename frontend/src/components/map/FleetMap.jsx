import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import PropTypes from 'prop-types'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const STATUS_COLORS = {
  active: '#2d6a4f',
  idle: '#f59e0b',
  offline: '#9ca3af',
}

export default function FleetMap({ vehicles = [], onVehicleClick, minimal = false }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markers = useRef({})

  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [28.0473, -26.2041],
      zoom: minimal ? 9 : 10,
    })

    if (!minimal) {
      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        'top-right'
      )
    }
  }, [])

  useEffect(() => {
    if (!map.current) return

    Object.values(markers.current).forEach(m => m.remove())
    markers.current = {}

    vehicles.forEach(vehicle => {
      const el = document.createElement('div')
      el.className = 'vehicle-marker'

      Object.assign(el.style, {
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: STATUS_COLORS[vehicle.status] || STATUS_COLORS.offline,
        border: '2px solid white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: '1',
        pointerEvents: 'auto',
        transition: 'box-shadow 0.15s',
      })

      const svgNamespace = 'http://www.w3.org/2000/svg'
      const icon = document.createElementNS(svgNamespace, 'svg')
      icon.setAttribute('width', '14')
      icon.setAttribute('height', '14')
      icon.setAttribute('viewBox', '0 0 24 24')
      icon.setAttribute('fill', 'white')

      const path = document.createElementNS(svgNamespace, 'path')
      path.setAttribute(
        'd',
        'M20 8h-3L14.5 3h-5L7 8H4c-1.1 0-2 .9-2 2v6h2v2h2v-2h8v2h2v-2h2v-6c0-1.1-.9-2-2-2zm-9.5-3h3l1.5 3h-6l1.5-3zM6 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z'
      )

      icon.appendChild(path)
      el.appendChild(icon)
      
      el.addEventListener('mouseenter', () => {
        el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)'
        el.style.width = '36px'
        el.style.height = '36px'
      })

      el.addEventListener('mouseleave', () => {
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'
        el.style.width = '32px'
        el.style.height = '32px'
      })

      if (!minimal && onVehicleClick) {
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onVehicleClick(vehicle)
        })
      }

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([vehicle.lng, vehicle.lat])
        .addTo(map.current)

      markers.current[vehicle.id] = marker
    })
  }, [vehicles, minimal, onVehicleClick])

  return (
    <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
  )
}

FleetMap.propTypes = {
  vehicles:       PropTypes.array,
  onVehicleClick: PropTypes.func,
  minimal:        PropTypes.bool,
}