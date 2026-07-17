import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import PropTypes from 'prop-types'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const STATUS_COLORS = {
  active: '#2d6a4f',
  idle: '#f59e0b',
  offline: '#9ca3af',
}

function playVehicle(entry, incomingFrames) {
  if (!incomingFrames || incomingFrames.length === 0) return;

  if (entry.animationFrame) {
    cancelAnimationFrame(entry.animationFrame);
  }

  // 1. ANTI-JUMP: Filter out old historical frames we've already animated past
  let newFrames = incomingFrames;
  if (entry.lastAnimatedTime) {
    newFrames = incomingFrames.filter(f => new Date(f.time).getTime() > entry.lastAnimatedTime);
  }

  if (newFrames.length === 0) return;

  // 2. ANTI-TELEPORT: Get the EXACT physical location the marker is sitting at right now
  const currentPos = entry.marker.getLngLat();
  
  // Create a smooth transition array combining current screen location + new target path
  const frames = [
    {
      latitude: currentPos.lat,
      longitude: currentPos.lng,
      time: new Date().getTime() // Fake timestamp placeholder for the current moment
    },
    ...newFrames
  ];

  let frame = 0;
  let startTime = null;

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;

    const from = frames[frame];
    const to = frames[frame + 1];

    if (!to) {
      entry.animationFrame = null;
      return;
    }

    const fromTime = typeof from.time === 'number' ? from.time : new Date(from.time).getTime();
    const toTime = new Date(to.time).getTime();
    
    let duration = Math.max(toTime - fromTime, 1000); 

    if (duration > 5000 || duration <= 0) { 
      duration = 2000; 
    }

    const progress = Math.min((timestamp - startTime) / duration, 1);

    const lat = from.latitude + (to.latitude - from.latitude) * progress;
    const lng = from.longitude + (to.longitude - from.longitude) * progress;

    entry.marker.setLngLat([lng, lat]);

    if (progress >= 1) {
      frame++;
      startTime = null; 
      
      // Mark this timestamp as completely visited so we never jump backwards to it
      entry.lastAnimatedTime = toTime;
    }

    if (frame < frames.length - 1) {
      entry.animationFrame = requestAnimationFrame(animate);
    } else {
      entry.animationFrame = null;
    }
  }
  
  entry.animationFrame = requestAnimationFrame(animate);
}

export default function FleetMap({ vehicles = [], buffer = {}, onVehicleClick, minimal = false }) {
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
  }, [minimal])

  useEffect(() => {
    if (!map.current) return

    const nextMarkerIds = new Set()

    vehicles.forEach(vehicle => {
      nextMarkerIds.add(vehicle.id);

      const existingEntry = markers.current[vehicle.id];
      const frames = buffer?.[vehicle.id];
      
      if (existingEntry) {
        existingEntry.vehicle = vehicle;

        existingEntry.marker.getElement().style.background = 
          STATUS_COLORS[vehicle.status] || STATUS_COLORS.offline;

        if (frames && frames.length >= 2) {
          const lastFrameTime = frames[frames.length - 1].time;
          if (existingEntry.lastTime !== lastFrameTime) {
            existingEntry.lastTime = lastFrameTime;
            playVehicle(existingEntry, frames);
          }
        }
      } else {
        const el = document.createElement('div')
        el.className = 'vehicle-marker'
        el.style.width = '32px'
        el.style.height = '32px'
        el.style.borderRadius = '50%'
        el.style.backgroundColor = STATUS_COLORS[vehicle.status] || STATUS_COLORS.offline
        el.style.border = '2px solid white'
        el.style.cursor = 'pointer'
        el.style.display = 'flex'
        el.style.alignItems = 'center'
        el.style.justifyContent = 'center'
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4)'
        el.style.transition = 'box-shadow 0.2s'

        el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20 8h-3L14.5 3h-5L7 8H4c-1.1 0-2 .9-2 2v6h2v2h2v-2h8v2h2v-2h2v-6c0-1.1-.9-2-2-2zm-9.5-3h3l1.5 3h-6l1.5-3zM6 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>`

        el.addEventListener('mouseenter', () => {
          el.style.boxShadow = '0 0 0 4px rgba(255,255,255,0.3)'
        })
        el.addEventListener('mouseleave', () => {
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4)'
        })

        if (!minimal && onVehicleClick) {
          el.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            onVehicleClick(markers.current[vehicle.id].vehicle);
          }
        }

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([vehicle.lng, vehicle.lat])
          .addTo(map.current)

        markers.current[vehicle.id] = {
          marker, 
          vehicle, 
          animationFrame: null, 
          lastTime: frames && frames.length > 0 ? frames[frames.length - 1].time : null
        };

        if (frames) playVehicle(markers.current[vehicle.id], frames);
      }
    })

    // Cleanup old markers
    Object.entries(markers.current).forEach(([vehicleId, entry]) => {
      if (!nextMarkerIds.has(vehicleId)) {
        if (entry.animationFrame) cancelAnimationFrame(entry.animationFrame);
        entry.marker.remove();
        delete markers.current[vehicleId]
      }
    });

  }, [vehicles, buffer, minimal, onVehicleClick])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}

FleetMap.propTypes = {
  vehicles: PropTypes.array,
  buffer: PropTypes.object,
  onVehicleClick: PropTypes.func,
  minimal: PropTypes.bool,
}