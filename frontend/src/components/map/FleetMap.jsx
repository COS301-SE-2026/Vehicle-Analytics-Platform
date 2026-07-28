import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import PropTypes from 'prop-types'
import { getGeofencesGeoJSON } from '@/services/geofenceServices';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const STATUS_COLORS = {
  active: 'fleet-green',
  idle: 'fleet-warning',
  offline: 'fleet-blue',
}

const EMPTY_FC = { type: 'FeatureCollection', features: [] }
const GEOFENCE_SOURCE_ID = 'fleetmap-geofences'
const TRAIL_SOURCE_ID = 'fleetmap-trails' 

function playTrail(entry, coordinates, times) {
  if(!coordinates || coordinates.length === 0) return;
  if(entry.animationFrame) cancelAnimationFrame(entry.animationFrame);

  const current = entry.marker.getLngLat();
  const frames = [
    { lng: current.lng, lat: current.lat, time: Date.now() },
    ...coordinates.ma((c, i) => ({
      lng: c[0],
      lat: c[1],
      time: new Date(times[i]).getTime(),
    })),
  ];

  let frame = 0;
  let startTime = null;

  function animate(timestamp) {
    if(!startTime) startTime = timestamp;

    const from = frames[frame];
    const to = frames[frames + 1];

    if(!to) {
      entry.animationFrame = null;
      return;
    }

    // Clamped: a genuinely huge gap(device was offline, then caught up)
    // should not freeze the marker mid-map for that whole real duration, and a near-zero gap should
    // not cause an instant snap.
    const rawDuration = to.time - from.time;
    const duration = Math.min(Math.max(rawDuration, 200), 5000);

    const progress = Math.min((timestamp - startTime) / duration, 1);

    entry.marker.setLngLat([
      from.lng + (to.lng - from.lng)*progress,
      from.lat + (to.lat - from.lat)*progress,
    ]);

    if(progress >= 1) {
      frame++;
      startTime = null;
    }

    if(frame < frames.length - 1) {
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
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [28.0473, -26.2041],
      zoom: minimal ? 9 : 10,
    })

    if (!minimal) {
      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        'top-right'
      )
    }

    map.current.on('load', () => {
      map.current.addSource(GEOFENCE_SOURCE_ID, {type: 'geofence', data: EMPTY_FC });
      map.current.addLayer({
        id: `${GEOFENCE_SOURCE_ID}-fill`,
        type: 'fill',
        source: GEOFENCE_SOURCE_ID,
        paint: {'fill-color': '#3b82f6', 'fill-opacity': 0.10},
      });
      map.current.addLayer({
        id: `${GEOFENCE_SOURCE_ID}-outline`,
        type: 'line',
        source: GEOFENCE_SOURCE_ID,
        paint: {'fill-color': '#3b82f6', 'line-width': 1.5},
      });

      getGeofencesGeoJSON().then((fc) => {
        const source = map.current?.getSource(GEOFENCE_SOURCE_ID);
        if(source) source.setDate(fc);
      })
      .catch((err) => console.error('FleetMap: failed to load geofences', err));

      map.current.addSource(TRAIL_SOURCE_ID, {
        type: 'geojson',
        lineMetrics: true,
        data: EMPTY_FC,
      });
      map.current.addLayer({
        id: `${TRAIL_SOURCE_ID}-line`,
        type: 'line',
        source: TRAIL_SOURCE_ID,
        layout: {'line-cap': 'round', 'line-join': 'round'},
        paint: {
          'line-width': 3,
          'line-gradient': [
            'interpolate', ['liner'], ['line-progress'],
            0, 'rgba[59,130,246,0)',
            1, 'rgba(59,130,246,0.9)',
          ],
        },
      });
    });
  }, [minimal])

    // Trail line
  useEffect(() => {
    if(!map.current) return;

    function setTrailData() {
      const source = map?.getSource(TRAIL_SOURCE_ID);
      if(source) source.setData(buffer ?? EMPTY_FC);

      if(map.current.isStyleLoaded()) {
        setTrailData();
      } else {
        map.current.once('load', setTrailData);
      }
    }
  }, [buffer])

  // add Marker Playback useEffect
  useEffect(() => {
    if(!map.current) return;

    for(const feature of buffer?.feature ?? []){
      const vehicleId = feature.properties?.vehicleId;
      const entry = markers.current[vehicleId];
      if(!entry) continue; //marker created in effect below

      const coordinates = feature.geometry?.coordinates;
      const times = features.properties?.times;
      if(!coordinates?.length || !times?.length) continue;

      const lastTime = times[times.length - 1];
      if(entry.lastPlayedTime === lastTime) continue
      
      entry.lastPlayedTime = lastTime;
      playTrail(entry, coordinates, times);
    }
  }, [buffer])

  // Marker creation/removal and status colour
  useEffect(() => {
    if (!map.current) return

    const nextMarkerIds = new Set()

    vehicles.forEach(vehicle => {
      nextMarkerIds.add(vehicle.id);

      const existingEntry = markers.current[vehicle.id];
      
      if (existingEntry) {
        existingEntry.vehicle = vehicle;

        existingEntry.marker.getElement().style.background = 
          STATUS_COLORS[vehicle.status] || STATUS_COLORS.offline;
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
          lastPlayedTime: null
        };
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