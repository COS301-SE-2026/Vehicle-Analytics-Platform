import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import PropTypes from 'prop-types'
import { getGeofencesGeoJSON } from '@/services/geofenceServices'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const STATUS_COLORS = {
  active: '#2d6a4f',
  idle: '#f59e0b',
  offline: '#9ca3af',
}

const EMPTY_FC = { type: 'FeatureCollection', features: [] }
const GEOFENCE_SOURCE_ID = 'fleetmap-geofences'
const TRAIL_SOURCE_ID = 'fleetmap-trails'


const PLAYBACK = {

  minSegmentMs: 250,
  maxSegmentMs: 12000,
  firstSegmentMs: 1200,
  maxQueue: 40,
  catchUpAt: 12,
}

function enqueuePoints(entry, coordinates, times) {
  if (!coordinates?.length || !times?.length) return;

  for (let i = 0; i < coordinates.length; i++) {
    const t = new Date(times[i]).getTime();
    if (Number.isNaN(t)) continue;
    if (entry.lastEnqueuedT !== null && t <= entry.lastEnqueuedT) continue;

    entry.queue.push({ lng: coordinates[i][0], lat: coordinates[i][1], t });
    entry.lastEnqueuedT = t;
  }

  if (entry.queue.length > PLAYBACK.maxQueue) {
    entry.queue.splice(0, entry.queue.length - PLAYBACK.maxQueue);
  }
}

function ensureAnimating(entry) {
  if (entry.raf) return;

  let from = null;
  let to = null;
  let startedAt = 0;
  let duration = 0;

  function step(ts) {
    if (!to) {
      if (entry.queue.length === 0) {
        entry.raf = null;   // idle until more data arrives
        return;
      }
      const cur = entry.marker.getLngLat();
      from = { lng: cur.lng, lat: cur.lat };
      to = entry.queue.shift();

      const gap = entry.lastPlayedT !== null
        ? to.t - entry.lastPlayedT
        : PLAYBACK.firstSegmentMs;

      duration = Math.min(Math.max(gap, PLAYBACK.minSegmentMs), PLAYBACK.maxSegmentMs);
      if (entry.queue.length > PLAYBACK.catchUpAt) {
        duration = Math.max(PLAYBACK.minSegmentMs, duration / 2);
      }
      startedAt = ts;
    }

    const p = Math.min((ts - startedAt) / duration, 1);
    entry.marker.setLngLat([
      from.lng + (to.lng - from.lng) * p,
      from.lat + (to.lat - from.lat) * p,
    ]);

    if (p >= 1) {
      entry.lastPlayedT = to.t;
      to = null;          // next segment picked up on the following frame
    }

    entry.raf = requestAnimationFrame(step);
  }

  entry.raf = requestAnimationFrame(step);
}

export default function FleetMap({ vehicles = [], buffer = EMPTY_FC, onVehicleClick, minimal = false }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markers = useRef({})
  const lastTrailStamp = useRef(null)

  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [28.0473, -26.2041],
      zoom: minimal ? 9 : 10,
    })

    if (!minimal) {
      map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    }

    map.current.on('load', () => {
      map.current.addSource(GEOFENCE_SOURCE_ID, { type: 'geojson', data: EMPTY_FC });
      map.current.addLayer({
        id: `${GEOFENCE_SOURCE_ID}-fill`, type: 'fill', source: GEOFENCE_SOURCE_ID,
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.10 },
      });
      map.current.addLayer({
        id: `${GEOFENCE_SOURCE_ID}-outline`, type: 'line', source: GEOFENCE_SOURCE_ID,
        paint: { 'line-color': '#3b82f6', 'line-width': 1.5 },
      });

      getGeofencesGeoJSON()
        .then((fc) => map.current?.getSource(GEOFENCE_SOURCE_ID)?.setData(fc))
        .catch((err) => console.error('FleetMap: failed to load geofences', err));

      // lineMetrics enables ['line-progress'], which is what makes the
      // gradient fade along the line's length rather than across the map.
      map.current.addSource(TRAIL_SOURCE_ID, {
        type: 'geojson', lineMetrics: true, data: EMPTY_FC,
      });
      map.current.addLayer({
        id: `${TRAIL_SOURCE_ID}-line`, type: 'line', source: TRAIL_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': 3,
          'line-gradient': [
            'interpolate', ['linear'], ['line-progress'],
            0, 'rgba(59,130,246,0)',
            1, 'rgba(59,130,246,0.9)',
          ],
        },
      });
    });
  }, [minimal])

  useEffect(() => {
    if (!map.current) return;

    function apply() {
      const stamp = buffer?.timestamp ?? null;
      if (stamp && stamp === lastTrailStamp.current) return;
      lastTrailStamp.current = stamp;
      map.current?.getSource(TRAIL_SOURCE_ID)?.setData(buffer ?? EMPTY_FC);
    }

    if (map.current.isStyleLoaded()) apply();
    else map.current.once('load', apply);
  }, [buffer])

  useEffect(() => {
    if (!map.current) return;

    for (const feature of buffer?.features ?? []) {
      const id = feature.properties?.vehicleId;
      const entry = markers.current[id];
      if (!entry) continue;   // marker not created yet; next vehicles tick

      enqueuePoints(entry, feature.geometry?.coordinates, feature.properties?.times);
      ensureAnimating(entry);
    }
  }, [buffer])

  useEffect(() => {
    if (!map.current) return

    const seen = new Set()

    vehicles.forEach(vehicle => {
      seen.add(vehicle.id);
      const existing = markers.current[vehicle.id];

      if (existing) {
        existing.vehicle = vehicle;
        existing.marker.getElement().style.backgroundColor =
          STATUS_COLORS[vehicle.status] || STATUS_COLORS.offline;
        return;
      }

      if (!Number.isFinite(vehicle.lng) || !Number.isFinite(vehicle.lat)) return;

      const el = document.createElement('div')
      el.className = 'vehicle-marker'
      Object.assign(el.style, {
        width: '32px', height: '32px', borderRadius: '50%',
        backgroundColor: STATUS_COLORS[vehicle.status] || STATUS_COLORS.offline,
        border: '2px solid white', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.4)', transition: 'box-shadow 0.2s',
      })
      el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20 8h-3L14.5 3h-5L7 8H4c-1.1 0-2 .9-2 2v6h2v2h2v-2h8v2h2v-2h2v-6c0-1.1-.9-2-2-2zm-9.5-3h3l1.5 3h-6l1.5-3zM6 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>`

      el.addEventListener('mouseenter', () => { el.style.boxShadow = '0 0 0 4px rgba(255,255,255,0.3)' })
      el.addEventListener('mouseleave', () => { el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.4)' })

      if (!minimal && onVehicleClick) {
        el.onclick = (e) => {
          e.preventDefault(); e.stopPropagation();
          onVehicleClick(markers.current[vehicle.id]?.vehicle);
        }
      }

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([vehicle.lng, vehicle.lat])
        .addTo(map.current)

      markers.current[vehicle.id] = {
        marker,
        vehicle,
        queue: [],
        lastEnqueuedT: null,   // newest point accepted into the queue
        lastPlayedT: null,     // newest point actually animated to
        raf: null,
      };
    })

    Object.entries(markers.current).forEach(([id, entry]) => {
      if (!seen.has(id)) {
        if (entry.raf) cancelAnimationFrame(entry.raf);
        entry.marker.remove();
        delete markers.current[id];
      }
    });
  }, [vehicles, minimal, onVehicleClick])

  useEffect(() => () => {
    Object.values(markers.current).forEach((e) => {
      if (e.raf) cancelAnimationFrame(e.raf);
      e.marker.remove();
    });
    markers.current = {};
  }, [])

  useEffect(() => {
    if(!map.current || !minimal || vehicles.length !== 1){
      return
    }

    const {lat , lng} = vehicles[0]
    if(!Number.isFinite(lat) || !Number.isFinite(lng)){
      return
    }

    const recenter = () => map.current.easeTo({center: [lng, lat], zoom: 15, duration: 800})

    if(map.current.isStyleLoaded()){
      recenter()
    }else{
      map.current.once('load', recenter)
    }
  }, [minimal, vehicles[0]?.lat, vehicles[0]?.lng])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}

FleetMap.propTypes = {
  vehicles: PropTypes.array,
  buffer: PropTypes.object,
  onVehicleClick: PropTypes.func,
  minimal: PropTypes.bool,
}