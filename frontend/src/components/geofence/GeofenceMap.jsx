import { useRef, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import mapboxgl from "mapbox-gl"
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const DEFAULT_CENTER = [28.2293, -25.75456]; //maps fallsback if geolocation fails

export default function GeofenceMap({ onZoneDrawn }) {
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
    
    }, [center, onZoneDrawn]);

    return(
    <div className="relative w-full h-full">
        <div ref={mapContainer} className="w-full h-full">
            {locationStatus === "locating" && (
                <div className="absolute inset-0 flex items-center justify-center bg-fleet-bg/60 z-10">
                    <div className="flex flex-col items-center gap-2 bg-fleet-surface px-6 py-4 rounded-lg shadow">
                        <Loader2 className="text-sm text-fleet-blue animate-spin"/>
                        <p className="text-sm text-fleet-text">Loacating you...</p>
                    </div>
                </div>
            )}
        </div>
    </div>    
    );
}