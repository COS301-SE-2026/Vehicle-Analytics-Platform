import { useState } from "react";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZoneActivityDrawer } from "./ZoneActivityDrawer";

// mock data 
const mockAlerts = [
    {
        id: 1,
        type: "alert",
        message: "TRK-2024-X1 entered Pretoria Depot",
        time: "Today, 14:22:05"
    },
    {
        id: 2,
        type: "notification",
        message: "TRK-552-Z exit Durban Depot",
        time: "Today, 11:45:05" 
    },
    {
        id: 3,
        type: "notification",
        message: "TRK-881-A entered Durban Depot",
        time: "Today, 09:22:05"
    },
];

const iconByType = {
    alert: AlertTriangle,
    notification: Bell,
};

export function ZoneAlerts({ alerts = mockAlerts, onViewAll }) {
    const [drawerOpen, setDrawerOpen ] = useState(false);

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
                            : alert.red
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