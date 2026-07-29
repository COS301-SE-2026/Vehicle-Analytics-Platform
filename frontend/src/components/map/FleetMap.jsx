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

// Replaces the old frame-by-frame playVehicle() replay. That approach made
// sense when `buffer` was an array of historical {lat,lng,time} frames to
// step through. Now that the backend hands back a ready GeoJSON LineString
// per vehicle (see trail rendering below), the marker only ever needs one
// target -- its current position -- so a straight tween is simpler and has
// nothing left to desync (no frame filtering, no "anti-teleport" bookkeeping).
function easeMarkerTo(entry, targetLngLat, durationMs = 900) {
  if (entry.animationFrame) cancelAnimationFrame(entry.animationFrame);

  const start = entry.marker.getLngLat();
  const [targetLng, targetLat] = targetLngLat;

  if (start.lng === targetLng && start.lat === targetLat) return;

  let startTime = null;
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / durationMs, 1);

    entry.marker.setLngLat([
      start.lng + (targetLng - start.lng) * progress,
      start.lat + (targetLat - start.lat) * progress,
    ]);

    if (progress < 1) {
      entry.animationFrame = requestAnimationFrame(step);
    } else {
      entry.animationFrame = null;
    }
  }
  entry.animationFrame = requestAnimationFrame(step);
}

// buffer: a GeoJSON FeatureCollection of per-vehicle LineStrings (from
// getVehiclePositionBuffer), rendered as fading trails -- NOT the old
// {vehicleId: [frames]} shape. See vehicleService.jsx.
export default function FleetMap({ vehicles = [], buffer = EMPTY_FC, onVehicleClick, minimal = false }) {
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

    map.current.on('load', () => {
      // Geofences: context layer, read-only here (editing happens on the
      // dedicated Geofence page's GeofenceMap). Fetched once on load --
      // zones change rarely enough that a live-tracking view doesn't need
      // to poll for them.
      map.current.addSource(GEOFENCE_SOURCE_ID, { type: 'geojson', data: EMPTY_FC });
      map.current.addLayer({
        id: `${GEOFENCE_SOURCE_ID}-fill`,
        type: 'fill',
        source: GEOFENCE_SOURCE_ID,
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.10 },
      });
      map.current.addLayer({
        id: `${GEOFENCE_SOURCE_ID}-outline`,
        type: 'line',
        source: GEOFENCE_SOURCE_ID,
        paint: { 'line-color': '#3b82f6', 'line-width': 1.5 },
      });

      getGeofencesGeoJSON()
        .then((fc) => {
          const source = map.current?.getSource(GEOFENCE_SOURCE_ID);
          if (source) source.setData(fc);
        })
        .catch((err) => console.error('FleetMap: failed to load geofences', err));

      // Fading trails. lineMetrics: true is required for line-gradient --
      // it's what lets Mapbox compute ["line-progress"] (0 at the start of
      // the line, 1 at the end) to interpolate opacity along its length.
      // One color for all trails rather than per-vehicle-status gradients:
      // line-gradient is a single expression per layer, and mixing it with
      // data-driven per-feature colors would mean splitting into one
      // source/layer per status -- not worth the complexity for a trail
      // that's already color-coded via the marker itself.
      map.current.addSource(TRAIL_SOURCE_ID, {
        type: 'geojson',
        lineMetrics: true,
        data: EMPTY_FC,
      });
      map.current.addLayer({
        id: `${TRAIL_SOURCE_ID}-line`,
        type: 'line',
        source: TRAIL_SOURCE_ID,
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

  // Trail data. Guarded the same way GeofenceMap guards its zones load --
  // buffer can update before the map/style is ready.
  useEffect(() => {
    if (!map.current) return;

    function setTrailData() {
      const source = map.current?.getSource(TRAIL_SOURCE_ID);
      if (source) source.setData(buffer ?? EMPTY_FC);
    }

    if (map.current.isStyleLoaded()) {
      setTrailData();
    } else {
      map.current.once('load', setTrailData);
    }
  }, [buffer])

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

        if (Number.isFinite(vehicle.lng) && Number.isFinite(vehicle.lat)) {
          easeMarkerTo(existingEntry, [vehicle.lng, vehicle.lat]);
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

  }, [vehicles, minimal, onVehicleClick])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}

FleetMap.propTypes = {
  vehicles: PropTypes.array,
  buffer: PropTypes.object, // GeoJSON FeatureCollection of per-vehicle trail LineStrings
  onVehicleClick: PropTypes.func,
  minimal: PropTypes.bool,
}
