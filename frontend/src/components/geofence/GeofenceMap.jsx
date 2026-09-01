import { useRef, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import mapboxgl from "mapbox-gl"
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { getGeofencesGeoJSON } from "@/services/geofenceServices";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DEFAULT_CENTER = [28.2293, -25.75456]; //maps fallsback if geolocation fails
const ZONES_SOURCE_ID = "existing-geofences";

// refreshToken: bump this (e.g. a counter) whenever a zone is created,
// edited, or deleted elsewhere in the app, and this layer refetches.
export default function GeofenceMap({ onZoneDrawn, refreshToken }) {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const draw = useRef(null);
    const [center, setCenter] = useState(null);
    const [locationStatus, setLocationStatus] = useState("locating");

    useEffect(() => {
        if(!navigator.geolocation) {
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
            {
                enableHighAccuracy: true,
                timeout:5000
            }
        );
    }, []);

    useEffect(() => {
        if(map.current || !center) return;
        if (!mapboxgl.accessToken) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center,
            zoom: 12
        });

        map.current.addControl(
            new mapboxgl.NavigationControl({ showCompass: false }),
            "top-right"
        );

        draw.current = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                polygon: true,
                trash: true
            }
        });

        map.current.on("load", () => {
            // Empty source now, populated by the zones-loading effect below.
            // Added on "load" so it's always ready before the fetch resolves,
            // regardless of fetch timing relative to map init.
            map.current.addSource(ZONES_SOURCE_ID, {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });
            map.current.addLayer({
                id: `${ZONES_SOURCE_ID}-fill`,
                type: "fill",
                source: ZONES_SOURCE_ID,
                paint: { "fill-color": "#3b82f6", "fill-opacity": 0.15 },
            });
            map.current.addLayer({
                id: `${ZONES_SOURCE_ID}-outline`,
                type: "line",
                source: ZONES_SOURCE_ID,
                paint: { "line-color": "#3b82f6", "line-width": 2 },
            });
        });

        map.current.addControl(draw.current, "top-left");

        function handleDrawChange(){
            const data = draw.current.getAll();
            const shape = data.features[0] ?? null;
            onZoneDrawn?.(shape);
        }

        map.current.on("draw.create", handleDrawChange);
        map.current.on("draw.update", handleDrawChange);
        map.current.on("draw.delete", handleDrawChange);


        return () => {
            map.current?.remove();
            map.current = null;
        };

    }, [center ]);

    // Load / refresh existing zones. Separate from map init so a
    // refreshToken bump doesn't tear down and rebuild the whole map --
    // it just re-populates the one source.
    useEffect(() => {
        if (!map.current) return;

        let cancelled = false;

        function loadZones() {
            getGeofencesGeoJSON()
                .then((featureCollection) => {
                    if (cancelled) return;
                    const source = map.current?.getSource(ZONES_SOURCE_ID);
                    if (source) source.setData(featureCollection);
                })
                .catch((err) => {
                    console.error("Failed to load existing zones:", err);
                });
        }

        if (map.current.isStyleLoaded()) {
            loadZones();
        } else {
            map.current.once("load", loadZones);
        }

        return () => { cancelled = true; };
    }, [center, refreshToken]);

    return(
    <div className="relative w-full h-full">
        <div ref={mapContainer} className="w-full h-full">
            {locationStatus === "locating" && (
                <div className="absolute inset-0 flex items-center justify-center bg-fleet-bg/60 z-10">
                    <div className="flex flex-col items-center gap-2 bg-fleet-surface px-6 py-4 rounded-lg shadow">
                        <Loader2 className="text-sm text-fleet-blue animate-spin"/>
                        <p className="text-sm text-fleet-text">Locating you...</p>
                    </div>
                </div>
            )}
        </div>
    </div>
    );
}
