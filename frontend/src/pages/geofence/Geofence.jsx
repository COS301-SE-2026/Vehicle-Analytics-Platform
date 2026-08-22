import { useState, useCallback } from "react";
import { ZoneDetails } from "@/components/geofence/ZoneDetails";
import { ExistingZones } from "@/components/geofence/ExistingZones";
import { ZoneAlerts } from "@/components/geofence/ZoneAlerts";
import GeofenceMap  from "@/components/geofence/GeofenceMap";

export default function Geofence() {
    const [ drawnShape, setDrawnShape] = useState(null);
    // Bumped whenever a zone is created, edited, or deleted anywhere on
    // this page. ExistingZones and GeofenceMap both refetch when it
    // changes -- previously a newly created zone never appeared in the
    // table or on the map without a full page reload.
    const [ zonesVersion, setZonesVersion ] = useState(0);
    const bumpZonesVersion = useCallback(() => setZonesVersion((v) => v + 1), []);

    const handleZoneDrawn = useCallback((shape) => {
        setDrawnShape(shape);
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* left column: map + existing zone table */}
                <div className="space-y-6">
                    <div className="border rounded-lg h-96 flex items-center justify-center text-muted-foreground">
                        <GeofenceMap onZoneDrawn={handleZoneDrawn} refreshToken={zonesVersion} />
                    </div>

                    <div className="border rounded-lg bg-fleet-surface p-4">
                        <ExistingZones refreshToken={zonesVersion} onZonesChanged={bumpZonesVersion} />
                    </div>
                </div>

                {/* Right column: Zone details + alerts */}
                <div className="space-y-6">
                    <div className="border rounded-lg bg-fleet-surface p-4">
                        <h2 className="font-display font-medium text-lg mb-4 text-fleet-text">Zone Details</h2>
                        <ZoneDetails
                            drawnShape={drawnShape}
                            onZoneCreated={() => {
                                setDrawnShape(null);
                                bumpZonesVersion();
                            }}
                        />
                    </div>
                    <ZoneAlerts/>
                </div>
            </div>
        </div>
    )
}
