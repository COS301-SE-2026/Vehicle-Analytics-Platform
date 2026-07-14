import { ZoneDetails } from "@/components/geofence/ZoneDetails";
import { ExistingZones } from "@/components/geofence/ExistingZones";
import { ZoneAlerts } from "@/components/geofence/ZoneAlerts";

export default function Geofence() {
    return (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* left column: map + existing zone table */}
                <div className="space-y-6">
                    <div className="border rounded-lg h-96 flex items-center justify-center text-muted-foreground">
                        Place Map here
                    </div>

                    <div className="border rounded-lg bg-fleet-surface p-4">
                        <ExistingZones/>
                    </div>
                </div>

                {/* Right column: Zone details + alerts */}
                <div className="space-y-6">
                    <div className="border rounded-lg bg-fleet-surface p-4">
                        <h2 className="font-display font-medium text-lg mb-4 text-fleet-text">Zone Details</h2>
                        <ZoneDetails/>
                    </div>
                    <ZoneAlerts/>   
                </div>
            </div>
        </div>
    )
}