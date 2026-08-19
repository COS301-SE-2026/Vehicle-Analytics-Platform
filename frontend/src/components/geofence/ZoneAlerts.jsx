import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Bell, ShieldAlert, MapPinned, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { ZoneActivityDrawer } from "./ZoneActivityDrawer";
import { getGeofenceEvents, deleteGeofenceEvents } from "@/services/geofenceServices";

const iconByKind = {
    security:  ShieldAlert,
    hotspot:   MapPinned,
    crossing:  AlertTriangle,
    other:     Bell,
};

const PAGE_SIZE = 6;

export function ZoneAlerts({ refreshToken, onAlertsCleared, onAlertFocus }) {
    const [ alerts, setAlerts ] = useState([]);
    const [ page, setPage ] = useState(1);
    const [ isLoading, setIsLoading ] = useState(true);
    const [ isClearing, setIsClearing ] = useState(false);
    const [ drawerOpen, setDrawerOpen ] = useState(false);

    const loadAlerts = useCallback(() => {
        setIsLoading(true);
        return getGeofenceEvents()
            .then((result) => {
                setAlerts(result.events);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch alerts: ", err);
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts, refreshToken]);

    useEffect(() => {
        setPage(1);
    }, [refreshToken]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(alerts.length / PAGE_SIZE));
        if (page > totalPages) setPage(totalPages);
    }, [alerts, page]);

    function handleClear() {
        setIsClearing(true);
        deleteGeofenceEvents()
            .then(() => {
                setAlerts([]);
                setPage(1);
                onAlertsCleared?.();
            })
            .catch((err) => console.error("Failed to clear alerts:", err))
            .finally(() => setIsClearing(false));
    }

    if (isLoading) {
        return <p className="text-fleet-secondary">Loading alerts...</p>;
    }

    const totalPages = Math.max(1, Math.ceil(alerts.length / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE;
    const pageAlerts = alerts.slice(start, start + PAGE_SIZE);

    return (
        <div className="border border-fleet-border bg-fleet-surface rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-medium text-lg text-fleet-text">
                    Zone Alerts
                </h2>
                {alerts.length > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        disabled={isClearing}
                        className="text-fleet-secondary hover:text-fleet-alert"
                        aria-label="Clear all alerts"
                    >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {isClearing ? "Clearing…" : "Clear"}
                    </Button>
                )}
            </div>

            {alerts.length === 0 ? (
                <p className="text-sm text-fleet-secondary">No alerts.</p>
            ) : (
                <div className="space-y-3">
                    {pageAlerts.map((alert) => {
                        const isSecurity = alert.kind === "security";
                        const Icon = iconByKind[alert.kind] ?? iconByKind.other;

                        const canFocus = Boolean(alert.geofence_id) && Boolean(onAlertFocus);

                        const body = (
                            <div className="flex items-start gap-2">
                                <Icon
                                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                                        isSecurity ? "text-fleet-alert" : "text-fleet-secondary"
                                    }`}
                                />
                                <div className="min-w-0">
                                    <p
                                        className={`text-sm font-medium break-words ${
                                            isSecurity ? "text-fleet-alert" : "text-fleet-text"
                                        }`}
                                    >
                                        {alert.message}
                                    </p>
                                    <p className="text-xs text-fleet-secondary mt-0.5">
                                        {alert.time}
                                    </p>
                                </div>
                            </div>
                        );

                        const base = `flex items-start justify-between gap-3 rounded-md p-3 w-full text-left ${
                            isSecurity ? "bg-fleet-alert/10" : ""
                        }`;

                        return canFocus ? (
                            <button
                                key={alert.id}
                                type="button"
                                onClick={() => onAlertFocus(alert)}
                                className={`${base} cursor-pointer hover:bg-fleet-bg/40 transition-colors`}
                                aria-label={`Show ${alert.message} on map`}
                            >
                                {body}
                            </button>
                        ) : (
                            <div key={alert.id} className={base}>
                                {body}
                            </div>
                        );
                    })}
                </div>
            )}

            {alerts.length > 0 && (
                <div className="mt-4 space-y-2">
                    <p className="text-xs text-fleet-secondary text-center">
                        Showing {start + 1}–{Math.min(start + PAGE_SIZE, alerts.length)} of {alerts.length}
                    </p>
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            )}

            <div className="mt-2 pt-2 border-t border-fleet-border text-center">
                <Button
                    type="button"
                    variant="link"
                    className="text-fleet-secondary text-sm"
                    onClick={() => setDrawerOpen(true)}
                >
                    View All Activity
                </Button>
            </div>

            <ZoneActivityDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
        </div>
    );
}