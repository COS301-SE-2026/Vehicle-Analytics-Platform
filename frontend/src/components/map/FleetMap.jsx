import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

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
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    }
  }, [])

  // Add/update vehicle markers whenever vehicles change
  useEffect(() => {
    if (!map.current) return

    // Remove old markers
    Object.values(markers.current).forEach(m => m.remove())
    markers.current = {}

    vehicles.forEach(vehicle => {
      // Create marker element
      const el = document.createElement('div')
      el.className = 'vehicle-marker'
      el.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${STATUS_COLORS[vehicle.status] || STATUS_COLORS.offline};
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s;
      `
      el.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M20 8h-3L14.5 3h-5L7 8H4c-1.1 0-2 .9-2 2v6h2v2h2v-2h8v2h2v-2h2v-6c0-1.1-.9-2-2-2zm-9.5-3h3l1.5 3h-6l1.5-3zM6 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
        </svg>
      `

      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

      if (!minimal && onVehicleClick) {
        el.addEventListener('click', () => onVehicleClick(vehicle))
      }

      const marker = new mapboxgl.Marker(el)
        .setLngLat([vehicle.lng, vehicle.lat])
        .addTo(map.current)

      markers.current[vehicle.id] = marker
    })
  }, [vehicles, minimal, onVehicleClick])

  return (
    <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
  )
}