import { useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import PropTypes from 'prop-types'
import { getGeofencesGeoJSON } from '@/services/geofenceServices'
import { useFleetRiskLookup, tierRing, tierLabel } from '@/components/risk/FleetRiskMarkers'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DEFAULT_CENTER = [28.2293, -25.75456];
const DEFAULT_ZOOM = 12;

const STATUS_COLORS = {
  active: '#2d6a4f',
  idle: '#f59e0b',
  offline: '#9ca3af',
}

const EMPTY_FC = { type: 'FeatureCollection', features: [] }
const GEOFENCE_SOURCE_ID = 'fleetmap-geofences'
const TRAIL_SOURCE_ID = 'fleetmap-trails'

const SOURCE_COLOR = [
  'match', ['get', 'source'],
  'user', '#3b82f6',
  'auto_hotspot', '#f59e0b',
  'security_marker', '#ef4444',
  '#9ca3af',
]

const PLAYBACK = {
  minSegmentMs: 250,
  maxSegmentMs: 12000,
  firstSegmentMs: 1200,
  maxQueue: 40,
  catchUpAt: 12,
}

function isLikelyLand(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat === 0 && lng === 0) return false
  if (lat < -35.0 || lat > -22.0) return false
  if (lng < 16.0 || lng > 33.0) return false
  return true
}

function enqueuePoints(entry, coordinates, times) {
  if (!coordinates?.length || !times?.length) return;
  for (let i = 0; i < coordinates.length; i++) {
    const t = new Date(times[i]).getTime();
    if (Number.isNaN(t)) continue;
    if (entry.lastEnqueuedT !== null && t <= entry.lastEnqueuedT) continue;
    entry.lastEnqueuedT = t;

    const [lng, lat] = coordinates[i];
    if (!isLikelyLand(lat, lng)) {
      console.debug(
        `FleetMap: discarding off-map trail point for vehicle ${entry.vehicle?.id}`,
        lat,
        lng
      );
      continue;
    }
    entry.queue.push({ lng, lat, t });
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
        entry.raf = null;
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
      to = null;
    }
    entry.raf = requestAnimationFrame(step);
  }
  entry.raf = requestAnimationFrame(step);
}

// ---------- Marker helpers (extracted for cognitive complexity) ----------

// Mapbox positions a marker by writing `transform` on the element it is
// given, every frame. So that element (the wrapper) must never be styled,
// transformed or transitioned, or markers lag and drift while the map moves.
// All visuals, hover effects and highlight animations live on the inner element.
function markerInner(marker) {
  return marker.getElement().querySelector('.vehicle-marker-inner');
}

// The highlight class goes on the wrapper: index.css styles
// `.vehicle-marker.vehicle-marker-highlighted .vehicle-marker-inner`,
// so the pulse and scale apply to the inner element only.
function wrapMarkerElement(inner, isHighlighted) {
  const wrapper = document.createElement('div');
  wrapper.className = 'vehicle-marker';
  wrapper.classList.toggle('vehicle-marker-highlighted', !!isHighlighted);
  wrapper.appendChild(inner);
  return wrapper;
}

function applyMarkerStyle(el, vehicle, ringColour) {
  el.style.backgroundColor = STATUS_COLORS[vehicle.status] || STATUS_COLORS.offline;
  el.style.boxShadow = ringColour
    ? `0 0 0 3px ${ringColour}`
    : '0 2px 4px rgba(0,0,0,0.4)';
}

function applyMarkerBadge(el, risk, ringColour) {
  const badge = el.querySelector('.risk-tier-badge');
  if (!badge) return;
  if (!risk) {
    badge.style.display = 'none';
    return;
  }
  badge.textContent = tierLabel(risk.tier);
  badge.style.backgroundColor = ringColour;
  badge.style.display = 'block';
}

function selfHealPosition(entry, vehicle) {
  if (entry.queue.length > 0 || entry.raf) return;
  if (!Number.isFinite(vehicle.lat) || !Number.isFinite(vehicle.lng)) return;
  if (!isLikelyLand(vehicle.lat, vehicle.lng)) return;

  const current = entry.marker.getLngLat();
  const drifted =
    Math.abs(current.lat - vehicle.lat) > 0.0005 ||
    Math.abs(current.lng - vehicle.lng) > 0.0005;
  if (drifted) {
    entry.marker.setLngLat([vehicle.lng, vehicle.lat]);
  }
}

function updateExistingMarker(existing, vehicle, risk, ringColour, isHighlighted) {
  existing.vehicle = vehicle;
  existing.risk = risk;
  existing.highlighted = isHighlighted;

  selfHealPosition(existing, vehicle);

  const el = markerInner(existing.marker);
  applyMarkerStyle(el, vehicle, ringColour);
  existing.marker.getElement().classList.toggle('vehicle-marker-highlighted', !!isHighlighted);
  applyMarkerBadge(el, risk, ringColour);
  return el;
}

function buildMarkerElement(vehicle, risk, ringColour) {
  const el = document.createElement('div');
  el.className = 'vehicle-marker-inner';
  Object.assign(el.style, {
    width: '32px', height: '32px', borderRadius: '50%',
    backgroundColor: STATUS_COLORS[vehicle.status] || STATUS_COLORS.offline,
    border: '2px solid white',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: ringColour ? `0 0 0 3px ${ringColour}` : '0 2px 4px rgba(0,0,0,0.4)',
    transition: 'box-shadow 0.2s, background-color 0.2s',
    position: 'relative',
    overflow: 'visible',
  });
  el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20 8h-3L14.5 3h-5L7 8H4c-1.1 0-2 .9-2 2v6h2v2h2v-2h8v2h2v-2h2v-6c0-1.1-.9-2-2-2zm-9.5-3h3l1.5 3h-6l1.5-3zM6 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>`;

  const badge = document.createElement('span');
  badge.className = 'risk-tier-badge';
  Object.assign(badge.style, {
    display: risk ? 'block' : 'none',
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translate(-50%, 4px)',
    padding: '1px 5px',
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    color: 'white',
    backgroundColor: ringColour || '#9ca3af',
    borderRadius: '8px',
    whiteSpace: 'nowrap',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    pointerEvents: 'none',
  });
  if (risk) badge.textContent = tierLabel(risk.tier);

  el.appendChild(badge);

  el.addEventListener('mouseenter', () => {
    el.style.boxShadow = `0 0 0 5px ${ringColour || 'rgba(255,255,255,0.3)'}`;
  });
  el.addEventListener('mouseleave', () => {
    if (!el.parentElement?.classList.contains('vehicle-marker-highlighted')) {
      el.style.boxShadow = ringColour
        ? `0 0 0 3px ${ringColour}`
        : '0 2px 4px rgba(0,0,0,0.4)';
    }
  });

  return el;
}

export default function FleetMap({
  vehicles = [],
  buffer = EMPTY_FC,
  onVehicleClick,
  minimal = false,
  initialView = null,
  onGeofenceClick,
  highlightVehicleId = null,
}) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markers = useRef({})
  const lastTrailStamp = useRef(null)
  const riskLookup = useFleetRiskLookup()
  const riskLookupRef = useRef(riskLookup)
  const lastFlewRef = useRef(null)

  useEffect(() => { riskLookupRef.current = riskLookup; }, [riskLookup])

  useEffect(() => {
    if (!mapContainer.current) return;
    const observer = new ResizeObserver(() => {
      if (map.current) map.current.resize();
    });
    observer.observe(mapContainer.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (map.current) return
    if (!mapboxgl.accessToken) {
      console.error('FleetMap: VITE_MAPBOX_TOKEN is not set - map disabled')
      return
    }

    let startCenter = DEFAULT_CENTER;
    if (initialView?.center?.length === 2) {
      const [lng, lat] = initialView.center;
      if (lng !== 0 && lat !== 0 && !Number.isNaN(lng) && !Number.isNaN(lat)) {
        startCenter = [lng, lat];
      }
    }

    const startZoom = initialView?.zoom || DEFAULT_ZOOM;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: startCenter,
      zoom: startZoom,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.current.on('load', () => {
      map.current.resize();

      map.current.addSource(GEOFENCE_SOURCE_ID, { type: 'geojson', data: EMPTY_FC });
      map.current.addLayer({
        id: `${GEOFENCE_SOURCE_ID}-fill`, type: 'fill', source: GEOFENCE_SOURCE_ID,
        paint: { 'fill-color': SOURCE_COLOR, 'fill-opacity': 0.15 },
      });
      map.current.addLayer({
        id: `${GEOFENCE_SOURCE_ID}-outline`, type: 'line', source: GEOFENCE_SOURCE_ID,
        paint: { 'line-color': SOURCE_COLOR, 'line-width': 2 },
      });
      getGeofencesGeoJSON()
        .then((fc) => map.current?.getSource(GEOFENCE_SOURCE_ID)?.setData(fc))
        .catch((err) => console.error('FleetMap: failed to load geofences', err));

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
  }, [])

  useEffect(() => {
    if (!map.current || !onGeofenceClick) return
    function handleGeofenceClick(e) {
      const feature = e.features?.[0]
      if (!feature) return
      onGeofenceClick(feature.properties || {})
    }
    function showPointer() { map.current.getCanvas().style.cursor = 'pointer' }
    function hidePointer() { map.current.getCanvas().style.cursor = '' }
    const layer = `${GEOFENCE_SOURCE_ID}-fill`
    function bind() {
      map.current.on('click', layer, handleGeofenceClick)
      map.current.on('mouseenter', layer, showPointer)
      map.current.on('mouseleave', layer, hidePointer)
    }
    if (map.current.getLayer(layer)) bind()
    else map.current.once('load', bind)
    return () => {
      if (!map.current) return
      map.current.off('click', layer, handleGeofenceClick)
      map.current.off('mouseenter', layer, showPointer)
      map.current.off('mouseleave', layer, hidePointer)
    }
  }, [onGeofenceClick])

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
      if (!entry) continue;
      enqueuePoints(entry, feature.geometry?.coordinates, feature.properties?.times);
      ensureAnimating(entry);
    }
  }, [buffer])

  // Marker sync — cognitive complexity reduced by extracting helpers above
  useEffect(() => {
    if (!map.current) return
    const seen = new Set()

    vehicles.forEach(vehicle => {
      seen.add(vehicle.id);
      const existing = markers.current[vehicle.id];
      const risk = riskLookupRef.current[vehicle.id];
      const ringColour = risk ? tierRing(risk.tier) : null;
      const isHighlighted = highlightVehicleId
        && String(vehicle.id) === String(highlightVehicleId);
      let el;

      if (existing) {
        el = updateExistingMarker(existing, vehicle, risk, ringColour, isHighlighted);
      } else {
        if (!Number.isFinite(vehicle.lng) || !Number.isFinite(vehicle.lat)) return;
        if (!isLikelyLand(vehicle.lat, vehicle.lng)) {
          console.debug(`FleetMap: skipping marker ${vehicle.id} — coordinate not on land`, vehicle.lat, vehicle.lng);
          return;
        }

        el = buildMarkerElement(vehicle, risk, ringColour);
        const marker = new mapboxgl.Marker({ element: wrapMarkerElement(el, isHighlighted), anchor: 'center' })
          .setLngLat([vehicle.lng, vehicle.lat])
          .addTo(map.current);

        markers.current[vehicle.id] = {
          marker,
          vehicle,
          risk,
          highlighted: isHighlighted,
          queue: [],
          lastEnqueuedT: null,
          lastPlayedT: null,
          raf: null,
        };
      }

      if (!minimal && onVehicleClick) {
        el.onclick = (e) => {
          e.preventDefault(); e.stopPropagation();
          onVehicleClick(markers.current[vehicle.id]?.vehicle);
        }
      } else {
        el.onclick = null;
      }
    })

    Object.entries(markers.current).forEach(([id, entry]) => {
      if (!seen.has(id)) {
        if (entry.raf) cancelAnimationFrame(entry.raf);
        entry.marker.remove();
        delete markers.current[id];
      }
    });
  }, [vehicles, minimal, onVehicleClick, riskLookup, highlightVehicleId])

  useEffect(() => {
    if (!map.current) return

    if (!highlightVehicleId) {
      lastFlewRef.current = null
      return
    }

    if (lastFlewRef.current === highlightVehicleId) return

    const target = (vehicles ?? []).find(
      (v) => String(v.id) === String(highlightVehicleId)
    )
    if (!target) return
    if (!Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return

    const doFly = () => {
      if (!map.current) return
      try {
        map.current.flyTo({
          center: [target.lng, target.lat],
          zoom: 16,
          duration: 1200,
          essential: true,
        })
        lastFlewRef.current = highlightVehicleId
      } catch (err) {
        console.warn('FleetMap: flyTo failed', err)
      }
    }

    const isReady = typeof map.current.loaded === 'function'
      ? map.current.loaded()
      : map.current.isStyleLoaded()

    if (isReady) doFly()
    else map.current.once('load', doFly)
  }, [highlightVehicleId, vehicles])

  useEffect(() => () => {
    Object.values(markers.current).forEach((e) => {
      if (e.raf) cancelAnimationFrame(e.raf);
      e.marker.remove();
    });
    markers.current = {};
  }, [])

  const singleVehicleLat = minimal && vehicles.length === 1 ? vehicles[0]?.lat : undefined
  const singleVehicleLng = minimal && vehicles.length === 1 ? vehicles[0]?.lng : undefined
  useEffect(() => {
    if (!map.current || !minimal || vehicles.length !== 1) {
      return
    }
    const { lat, lng } = vehicles[0]
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return
    }
    const recenter = () => map.current.easeTo({ center: [lng, lat], zoom: 15, duration: 800 })
    if (map.current.isStyleLoaded()) {
      recenter()
    } else {
      map.current.once('load', recenter)
    }
  }, [minimal, singleVehicleLat, singleVehicleLng])

  return (
    <div
      ref={mapContainer}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    />
  )
}

FleetMap.propTypes = {
  vehicles: PropTypes.array,
  buffer: PropTypes.object,
  onVehicleClick: PropTypes.func,
  minimal: PropTypes.bool,
  initialView: PropTypes.shape({
    center: PropTypes.arrayOf(PropTypes.number),
    zoom: PropTypes.number,
  }),
  onGeofenceClick: PropTypes.func,
  highlightVehicleId: PropTypes.string,
}