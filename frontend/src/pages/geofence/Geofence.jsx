import { useState, useCallback, useEffect } from "react";
import { Layers, Car } from "lucide-react";
import { ZoneDetails } from "@/components/geofence/ZoneDetails";
import { ExistingZones } from "@/components/geofence/ExistingZones";
import { ZoneAlerts } from "@/components/geofence/ZoneAlerts";
import GeofenceMap from "@/components/geofence/GeofenceMap";
import { Button } from "@/components/ui/button";

const LAYER_MODES = [
    { key: "all",     label: "All" },
    { key: "zones",   label: "Zones" },
    { key: "hazards", label: "Hazards" },
];

export default function Geofence() {
    const [ drawnShape, setDrawnShape ] = useState(null);
    const [ layerMode, setLayerMode ] = useState("all");
    const [ showVehicles, setShowVehicles ] = useState(true);
    const [ selectedZone, setSelectedZone ] = useState(null);
    const [ focusZoneId, setFocusZoneId ] = useState(null);
    const [zonesLoadedAt, setZonesLoadedAt] = useState(0);

    const [ zonesVersion, setZonesVersion ] = useState(0);
    const bumpZones = useCallback(() => setZonesVersion((v) => v + 1), []);

    const handleZoneDrawn = useCallback((shape) => {
        setDrawnShape(shape);
    }, []);

    const handleZoneSelected = useCallback((properties) => {
        setSelectedZone(properties);
        setFocusZoneId(properties?.id ?? null);
    }, []);

    // Row click in the table: zoom the map AND open the detail card.
    const handleZoneFocus = useCallback((zone) => {
        setSelectedZone(zone);
        setFocusZoneId(zone.id);

        const source = zone.source ?? "user";
        const visible =
            layerMode === "all" ||
            (layerMode === "zones" && source === "user") ||
            (layerMode === "hazards" && source !== "user");
        if (!visible) setLayerMode("all");
    }, [layerMode]);

    const handleAlertFocus = useCallback((alert) => {
        setSelectedZone({ id: alert.geofence_id });
        setFocusZoneId(alert.geofence_id);

        const isHazard = alert.kind === "security" || alert.kind === "hotspot";
        const wouldBeHidden =
            (layerMode === "zones" && isHazard) ||
            (layerMode === "hazards" && !isHazard);
        if (wouldBeHidden) setLayerMode("all");
    }, [layerMode]);

    const clearSelection = useCallback(() => {
        setSelectedZone(null);
        setFocusZoneId(null);
    }, []);

    useEffect(() => {
        const url = new URL(window.location.href);
        const zoneId = url.searchParams.get("zoneId");
        if (!zoneId) return;

        setSelectedZone({ id: zoneId });
        setFocusZoneId(zoneId);
        setLayerMode("all");

        url.searchParams.delete("zoneId");
        const next = `${url.pathname}${url.search ? `?${url.searchParams.toString()}` : ""}${url.hash}`;
        window.history.replaceState({}, "", next);
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* left column: map + existing zone table */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div
                            className="flex items-center gap-1"
                            role="group"
                            aria-label="Map layers"
                        >
                            <Layers className="h-4 w-4 text-fleet-secondary mr-1" />
                            {LAYER_MODES.map((mode) => {
                                const isActive = layerMode === mode.key;
                                return (
                                    <Button
                                        key={mode.key}
                                        type="button"
                                        size="sm"
                                        variant={isActive ? "brand" : "brandOutline"}
                                        aria-pressed={isActive}
                                        onClick={() => setLayerMode(mode.key)}
                                    >
                                        {mode.label}
                                    </Button>
                                );
                            })}
                        </div>

                        <Button
                            type="button"
                            size="sm"
                            variant={showVehicles ? "brand" : "brandOutline"}
                            aria-pressed={showVehicles}
                            onClick={() => setShowVehicles((v) => !v)}
                        >
                            <Car className="h-4 w-4 mr-1" />
                            Vehicles
                        </Button>
                    </div>

                    {/* Legend. The map colours by SOURCE, so without this the
                        amber/red distinction is unexplained. */}
                    <div className="flex items-center gap-4 text-xs text-fleet-secondary">
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded-sm bg-[#3b82f6]" /> Zone
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded-sm bg-[#f59e0b]" /> Hazard
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded-sm bg-[#ef4444]" /> Security
                        </span>
                    </div>

                    <div className="border rounded-lg h-96 flex items-center justify-center text-muted-foreground">
                        <GeofenceMap
                            onZoneDrawn={handleZoneDrawn}
                            refreshToken={zonesVersion}
                            onZoneSelected={handleZoneSelected}
                            onZonesLoaded={() => setZonesLoadedAt(Date.now())}
                            zonesLoadedAt={zonesLoadedAt}
                            focusZoneId={focusZoneId}
                            selectedZone={selectedZone}
                            layerMode={layerMode}
                            showVehicles={showVehicles}
                        />
                    </div>

                    <div className="border rounded-lg bg-fleet-surface p-4">
                        <ExistingZones
                            refreshToken={zonesVersion}
                            onZonesChanged={bumpZones}
                            selectedZone={selectedZone}
                            onClearSelection={clearSelection}
                            onZoneFocus={handleZoneFocus}
                        />
                    </div>
                </div>

                {/* Right column: Zone details + alerts */}
                <div className="space-y-6">
                    <div className="border rounded-lg bg-fleet-surface p-4">
                        <h2 className="font-display font-medium text-lg mb-4 text-fleet-text">
                            Zone Details
                        </h2>
                        <ZoneDetails
                            drawnShape={drawnShape}
                            onZoneCreated={() => {
                                setDrawnShape(null);
                                bumpZones();
                            }}
                        />
                    </div>
                    <ZoneAlerts
                        refreshToken={zonesVersion}
                        onAlertFocus={handleAlertFocus}
                    />
                </div>
            </div>
        </div>
    );
}