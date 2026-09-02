import { useRef, useEffect, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { getGeofencesGeoJSON } from "@/services/geofenceServices";
import { getVehicleLocations } from "@/services/vehicleService";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DEFAULT_CENTER = [28.2293, -25.75456];
const ZONES_SOURCE_ID = "existing-geofences";

export const LAYER_FILTERS = {
  all: null,
  zones: ["==", ["get", "source"], "user"],
  hazards: ["in", ["get", "source"], ["literal", ["auto_hotspot", "security_marker"]]],
};

const SOURCE_COLOUR = [
  "match", ["get", "source"],
  "user", "#3b82f6", 
  "auto_hotspot", "#f59e0b",
  "security_marker", "#ef4444", 
  /* fallback */ "#9ca3af",
];

const STATUS_COLOUR = {
  active:  "#2d6a4f",
  idle:    "#f59e0b",
  offline: "#9ca3af",
};

export default function GeofenceMap({
  onZoneDrawn,
  refreshToken,
  onZoneSelected,
  onZonesLoaded,
  zonesLoadedAt,
  focusZoneId,
  selectedZone,
  layerMode = "all",
  showVehicles = true,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const draw = useRef(null);
  const markers = useRef({});
  const zoneData = useRef({ type: "FeatureCollection", features: [] });
  const [center, setCenter] = useState(null);
  const [locationStatus, setLocationStatus] = useState("locating");

  function animateMarker(entry, endLng, endLat, duration = 900) {
    if (!entry?.marker) return;

    if (entry.animationFrame) {
      cancelAnimationFrame(entry.animationFrame);
      entry.animationFrame = null;
    }

    const start = entry.marker.getLngLat();
    const fromLng = start.lng;
    const fromLat = start.lat;
    const deltaLng = endLng - fromLng;
    const deltaLat = endLat - fromLat;

    if (Math.abs(deltaLng) < 1e-7 && Math.abs(deltaLat) < 1e-7) return;

    let startTime = null;

    function step(ts) {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);

      entry.marker.setLngLat([
        fromLng + deltaLng * progress,
        fromLat + deltaLat * progress,
      ]);

      if (progress < 1) {
        entry.animationFrame = requestAnimationFrame(step);
      } else {
        entry.animationFrame = null;
      }
    }

    entry.animationFrame = requestAnimationFrame(step);
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      setCenter(DEFAULT_CENTER);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter([position.coords.longitude, position.coords.latitude]);
        setLocationStatus("found");
      },
      (error) => {
        console.warn("Geolocation failed:", error.message);
        setLocationStatus("denied");
        setCenter(DEFAULT_CENTER);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  useEffect(() => {
    if (map.current || !center) return;
    if (!mapboxgl.accessToken) return;   

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 12,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: false },
    });

    map.current.on("load", () => {
      map.current.addSource(ZONES_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.current.addLayer({
        id: `${ZONES_SOURCE_ID}-fill`,
        type: "fill",
        source: ZONES_SOURCE_ID,
        paint: { "fill-color": SOURCE_COLOUR, "fill-opacity": 0.15 },
      });
      map.current.addLayer({
        id: `${ZONES_SOURCE_ID}-outline`,
        type: "line",
        source: ZONES_SOURCE_ID,
        paint: { "line-color": SOURCE_COLOUR, "line-width": 2 },
      });
      map.current.addLayer({
        id: `${ZONES_SOURCE_ID}-highlight`,
        type: "line",
        source: ZONES_SOURCE_ID,
        paint: {
          "line-color": SOURCE_COLOUR,
          "line-width": 4,
          "line-opacity": 0.9,
        },
        filter: ["==", ["get", "id"], -1],
      });
    });

    map.current.addControl(draw.current, "top-left");

    // Scoped container variable avoids SonarQube `this` rule flags
    let controlContainer = null;

    const liveMapControl = {
      onAdd() {
        controlContainer = document.createElement("div");
        controlContainer.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Full Map";
        button.title = "Open Live Map";
        button.style.width = "auto";
        button.style.padding = "0 10px";
        button.style.fontSize = "12px";
        button.style.fontWeight = "600";
        button.style.lineHeight = "30px";
        button.onclick = () => {
          const view = map.current;
          if (!view) {
            window.location.assign("/map");
            return;
          }

          const c = view.getCenter();
          const z = view.getZoom();
          const params = new URLSearchParams({
            lat: String(c.lat),
            lng: String(c.lng),
            zoom: String(z),
          });

          window.location.assign(`/map?${params.toString()}`);
        };

        controlContainer.appendChild(button);
        return controlContainer;
      },
      onRemove() {
        controlContainer?.remove();
        controlContainer = null;
      },
    };
    map.current.addControl(liveMapControl, "top-left");

    function handleDrawChange() {
      const data = draw.current.getAll();
      const shape = data.features[0] ?? null;
      onZoneDrawn?.(shape);
    }

    map.current.on("draw.create", handleDrawChange);
    map.current.on("draw.update", handleDrawChange);
    map.current.on("draw.delete", handleDrawChange);

    return () => {
      Object.values(markers.current).forEach((entry) => {
        if (entry.animationFrame) cancelAnimationFrame(entry.animationFrame);
        entry.marker.remove();
      });
      markers.current = {};
      map.current?.remove();
      map.current = null;
    };
  }, [center, onZoneDrawn]);

  useEffect(() => {
    if (!map.current || !onZoneSelected) return;

    function handleZoneClick(e) {
      const feature = e.features?.[0];
      if (!feature) return;
      onZoneSelected(feature.properties);
    }

    function showPointer() { map.current.getCanvas().style.cursor = "pointer"; }
    function hidePointer() { map.current.getCanvas().style.cursor = ""; }

    const layer = `${ZONES_SOURCE_ID}-fill`;

    function bind() {
      map.current.on("click", layer, handleZoneClick);
      map.current.on("mouseenter", layer, showPointer);
      map.current.on("mouseleave", layer, hidePointer);
    }

    if (map.current.getLayer(layer)) bind();
    else map.current.once("load", bind);

    return () => {
      if (!map.current) return;
      map.current.off("click", layer, handleZoneClick);
      map.current.off("mouseenter", layer, showPointer);
      map.current.off("mouseleave", layer, hidePointer);
    };
  }, [center, onZoneSelected]);

  useEffect(() => {
    if (!map.current) return;

    function applyFilter() {
      const filter = LAYER_FILTERS[layerMode] ?? null;
      ["fill", "outline"].forEach((suffix) => {
        const id = `${ZONES_SOURCE_ID}-${suffix}`;
        if (map.current.getLayer(id)) map.current.setFilter(id, filter);
      });
    }

    if (map.current.isStyleLoaded()) applyFilter();
    else map.current.once("load", applyFilter);
  }, [center, layerMode]);

  useEffect(() => {
    if (!map.current) return;

    let cancelled = false;

    function loadZones() {
      getGeofencesGeoJSON()
        .then((featureCollection) => {
          if (cancelled) return;
          zoneData.current = featureCollection;
          const source = map.current?.getSource(ZONES_SOURCE_ID);
          if (source) source.setData(featureCollection);
          onZonesLoaded?.();
        })
        .catch((err) => {
          console.error("Failed to load existing zones:", err);
        });
    }

    if (map.current.isStyleLoaded()) loadZones();
    else map.current.once("load", loadZones);

    return () => { cancelled = true; };
  }, [center, refreshToken, onZonesLoaded]);

  useEffect(() => {
    if (!map.current || !selectedZone?.id) return;

    function zoomToZone() {
      const feature = zoneData.current.features.find(
        (f) => String(f.properties?.id) === String(selectedZone.id)
      );
      if (!feature?.geometry) return;

      const rings =
        feature.geometry.type === "MultiPolygon"
          ? feature.geometry.coordinates.flat(1)
          : feature.geometry.coordinates;

      const bounds = new mapboxgl.LngLatBounds();
      rings.flat(1).forEach(([lng, lat]) => {
        if (Number.isFinite(lng) && Number.isFinite(lat)) bounds.extend([lng, lat]);
      });

      if (bounds.isEmpty()) return;

      map.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 16,
        duration: 800,
      });
    }

    if (zoneData.current.features.length > 0) zoomToZone();
  }, [selectedZone?.id, refreshToken, zonesLoadedAt]);

  useEffect(() => {
    if (!map.current || focusZoneId === null || focusZoneId === undefined) return;

    function focus() {
      const fc = zoneData.current;
      if (!fc) return;

      const feature = fc.features.find(
        (f) => String(f.properties?.id) === String(focusZoneId)
      );
      if (!feature) return;

      const bounds = new mapboxgl.LngLatBounds();
      const geom = feature.geometry;

      const rings =
        geom.type === "MultiPolygon" ? geom.coordinates.flat() : geom.coordinates;

      rings.forEach((ring) => ring.forEach((coord) => bounds.extend(coord)));

      if (bounds.isEmpty()) return;

      map.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 16,
        duration: 800,
      });

      const highlight = `${ZONES_SOURCE_ID}-highlight`;
      if (map.current.getLayer(highlight)) {
        map.current.setFilter(highlight, ["==", ["get", "id"], feature.properties.id]);
      }
    }

    if (map.current.isStyleLoaded()) focus();
    else map.current.once("load", focus);
  }, [focusZoneId, refreshToken, onZonesLoaded]);

  // Clear the highlight when nothing is focused.
  useEffect(() => {
    if (!map.current) return;
    if (focusZoneId !== null && focusZoneId !== undefined) return;

    const highlight = `${ZONES_SOURCE_ID}-highlight`;
    if (map.current.getLayer(highlight)) {
      map.current.setFilter(highlight, ["==", ["get", "id"], -1]);
    }
  }, [focusZoneId]);

  const syncVehicles = useCallback((vehicles) => {
    if (!map.current) return;
    const seen = new Set();

    vehicles.forEach((v) => {
      const lng = Number(v.lng ?? v.longitude);
      const lat = Number(v.lat ?? v.latitude);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      seen.add(v.id);
      const existing = markers.current[v.id];

      if (existing) {
        animateMarker(existing, lng, lat);
        existing.marker.getElement().style.backgroundColor =
          STATUS_COLOUR[v.status] ?? STATUS_COLOUR.offline;
        return;
      }

      const el = document.createElement("div");
      Object.assign(el.style, {
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        border: "2px solid white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
        backgroundColor: STATUS_COLOUR[v.status] ?? STATUS_COLOUR.offline,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "box-shadow 0.2s",
      });

      el.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20 8h-3L14.5 3h-5L7 8H4c-1.1 0-2 .9-2 2v6h2v2h2v-2h8v2h2v-2h2v-6c0-1.1-.9-2-2-2zm-9.5-3h3l1.5 3h-6l1.5-3zM6 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>';

      el.addEventListener("mouseenter", () => {
        el.style.boxShadow = "0 0 0 4px rgba(255,255,255,0.3)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.4)";
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng, lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(
            `<strong>${v.id}</strong><br/>${v.status ?? "unknown"}` +
            (v.speed != null ? `<br/>${v.speed} km/h` : "") +
            (v.display_name || v.road ? `<br/>${v.display_name ?? v.road}` : "")
          )
        )
        .addTo(map.current);

      markers.current[v.id] = { marker, animationFrame: null };
    });

    Object.entries(markers.current).forEach(([id, entry]) => {
      if (!seen.has(id)) {
        if (entry.animationFrame) cancelAnimationFrame(entry.animationFrame);
        entry.marker.remove();
        delete markers.current[id];
      }
    });
  }, []);

  useEffect(() => {
    if (!map.current) return;

    if (!showVehicles) {
      Object.values(markers.current).forEach((entry) => {
        if (entry.animationFrame) cancelAnimationFrame(entry.animationFrame);
        entry.marker.remove();
      });
      markers.current = {};
      return;
    }

    let cancelled = false;

    function load() {
      getVehicleLocations()
        .then((result) => {
          if (cancelled) return;
          const vehicles = result.vehicles ?? [];
          if (vehicles.length === 0) {
            console.warn("GeofenceMap: no vehicles returned");
          }
          syncVehicles(vehicles);
        })
        .catch((err) => console.error("Failed to load vehicles:", err));
    }

    load();
    const interval = setInterval(load, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [center, showVehicles, syncVehicles]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full">
        {locationStatus === "locating" && (
          <div className="absolute inset-0 flex items-center justify-center bg-fleet-bg/60 z-10">
            <div className="flex flex-col items-center gap-2 bg-fleet-surface px-6 py-4 rounded-lg shadow">
              <Loader2 className="text-sm text-fleet-blue animate-spin" />
              <p className="text-sm text-fleet-text">Locating you...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}