import { useState, useEffect } from "react";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZoneActivityDrawer } from "./ZoneActivityDrawer";
import { getGeofenceEvents } from "@/services/geofenceServices";

const iconByType = {
    alert: AlertTriangle,
    notification: Bell,
};

export function ZoneAlerts({ onViewAll }) {
    const [ drawerOpen, setDrawerOpen ] = useState(false);
    const [ alerts, setAlerts ] = useState([]);
    const [ isLoading, setIsLoading ] = useState(true);

    useEffect(() => {
        getGeofenceEvents().then((result) => {
            setAlerts(result.events ?? []);
            setIsLoading(false);
        })
        .catch((err) => {
            console.error("Failed to fetch alerts: ", err);
            setIsLoading(false);
        });
    }, []);

    if (isLoading) {
        return <p className="text-fleet-secondary">Loading alerts...</p>;
    }

    const handleViewAll = () => {
        setDrawerOpen(true);
        onViewAll?.();
    };

  return (
    <div className="border border-fleet-border bg-fleet-surface rounded-lg p-6">
        <h2 className="font-display font-medium text-lg mb-4 text-fleet-text">
            Zone Alerts
        </h2>

        <div className="space-y-3">
            {alerts.map((alert) => {
                const Icon = iconByType[alert.type] ?? Bell;
                const isUrgent = alert.type === "alert";

                return (
                    <div
                        key={alert.id}
                        className={`flex items-start justify-between gap-3 rounded-md p-3 ${
                            isUrgent
                            ? "bg-fleet-alert/10"
                            : alert.read
                            ? "opacity-50"
                            : ""
                        }`}
                    >
                        <div className="flex items-start gap-2">
                            <Icon
                                className={`h-4 w-4 mt-0.5 shrink-0 ${
                                    isUrgent ? "text-fleet-alert" : "text-fleet-secondary"
                                }`}
                            />
                            <div>
                                <p
                                    className={`text-sm font-medium ${
                                        isUrgent ? "text-fleet-alert" : "text-fleet-text"
                                    }`}
                                >
                                    {alert.message}
                                </p>
                                <p className="text-xs text-fleet-secondary mt-0.5">
                                    {alert.time}
                                </p>
                            </div>
                        </div>

                        <CheckCircle2 className="h-4 w-4 text-fleet-secondary shrink-0 mt-0.5"/>
                    </div>
                );
            })}
        </div>

        <div className="mt-2 pt-2 border-t border-fleet-border text-center">
            <Button
                type="button"
                variant="link"
                className="text-fleet-secondary text-sm"
                onClick={handleViewAll}
            >
                View All Activity
            </Button>
        </div>

        <ZoneActivityDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  ); 
}