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

// Playback tuning.
//
// This is a jitter buffer, deliberately. Markers lag slightly behind the
// newest data in exchange for continuous motion -- the previous approach
// chased the latest position and produced move-then-freeze, because it
// restarted animation from scratch on every poll and discarded whatever
// was mid-flight.
const PLAYBACK = {
  // A segment's duration comes from the REAL gap between its two points,
  // so motion is proportional to actual vehicle speed. Clamped only to
  // survive outliers.
  //
  // MAX is above the ~7s ping interval on purpose: at 5s the previous code
  // clamped every single segment, animating ~40% faster than reality and
  // then idling until the next poll.
  minSegmentMs: 250,
  maxSegmentMs: 12000,
  // Used for the very first segment, when there's no previous timestamp
  // to measure a gap against.
  firstSegmentMs: 1200,
  // Hard cap on unplayed points. Without it a backlog (tab backgrounded,
  // slow render, a burst of data) grows without bound and the marker falls
  // further behind forever.
  maxQueue: 40,
  // Above this backlog, segments play at double speed to catch up rather
  // than accumulating lag.
  catchUpAt: 12,
}

// Appends genuinely-new points to a vehicle's queue.
//
// Filtering by timestamp is what stops the marker rewinding: every poll
// returns the whole trailing window, most of which has already been played.
// The old code prepended the marker's current position to the FULL buffer
// and animated through all of it, so each poll snapped the marker back to
// where the vehicle was 30 seconds ago.
function enqueuePoints(entry, coordinates, times) {
  if (!coordinates?.length || !times?.length) return;

  for (let i = 0; i < coordinates.length; i++) {
    const t = new Date(times[i]).getTime();
    if (Number.isNaN(t)) continue;
    if (entry.lastEnqueuedT !== null && t <= entry.lastEnqueuedT) continue;

    entry.queue.push({ lng: coordinates[i][0], lat: coordinates[i][1], t });
    entry.lastEnqueuedT = t;
  }

  // Drop from the FRONT when over capacity -- the oldest unplayed points
  // are the least interesting, and keeping them would only deepen the lag.
  if (entry.queue.length > PLAYBACK.maxQueue) {
    entry.queue.splice(0, entry.queue.length - PLAYBACK.maxQueue);
  }
}

// One continuous rAF loop per vehicle, running only while its queue has
// something in it. Critically it is NOT restarted per poll: new points
// append to the queue the running loop is already consuming.
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

// buffer: GeoJSON FeatureCollection, one LineString per vehicle, each with
// a properties.times array parallel to geometry.coordinates. Drives both
// the fading trail and marker playback, so what the marker does always
// matches what the trail shows it having done.
export default function FleetMap({ vehicles = [], buffer = EMPTY_FC, onVehicleClick, minimal = false }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markers = useRef({})
  const lastTrailStamp = useRef(null)

  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
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

  // Trail line. Skipped when the payload hasn't changed -- setData forces a
  // full re-tessellation, which is wasted work when the poll returned the
  // same window.
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

  // Feed the playback queues. This does NOT move markers directly -- it
  // hands points to the animation loop, which owns position entirely.
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

  // Marker lifecycle and status colour only. Position is never set here
  // after creation -- that belongs to the playback loop.
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

  // Unmount cleanup.
  //
  // marker.remove() is essential, not just tidy: React StrictMode runs
  // effects mount -> unmount -> mount in development. Clearing
  // markers.current WITHOUT removing the markers left them on the map
  // untracked, and the remount then created a second full set -- two
  // markers per vehicle, one of them frozen forever because nothing held
  // a reference to animate it.
  useEffect(() => () => {
    Object.values(markers.current).forEach((e) => {
      if (e.raf) cancelAnimationFrame(e.raf);
      e.marker.remove();
    });
    markers.current = {};
  }, [])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}

FleetMap.propTypes = {
  vehicles: PropTypes.array,
  buffer: PropTypes.object,
  onVehicleClick: PropTypes.func,
  minimal: PropTypes.bool,
}