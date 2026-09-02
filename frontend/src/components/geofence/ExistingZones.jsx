import { useState, useEffect, useCallback } from "react";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash, ArrowLeft, MapPin } from "lucide-react";
import DeleteZoneModal from "@/components/geofence/DeleteZoneModal";
import { EditZoneModal } from "@/components/geofence/EditZoneModal";
import { Pagination } from "@/components/ui/pagination";
import { getGeofences, deleteGeofence, updateGeofence } from "@/services/geofenceServices";

const triggerStyles = {
    entry: "bg-fleet-blue/10 text-fleet-blue",
    both:  "bg-fleet-green/10 text-fleet-green",
    exit:  "bg-fleet-idle/10 text-fleet-secondary",
    none:  "bg-fleet-secondary/10 text-fleet-secondary",
};

// Matches the map's colour coding so a zone reads the same in both places.
const sourceStyles = {
    user: { label: "Zone", className: "bg-fleet-blue/10 text-fleet-blue" },
    auto_hotspot: { label: "Hazard", className: "bg-amber-500/10 text-amber-600" },
    security_marker: { label: "Security", className: "bg-fleet-alert/10 text-fleet-alert" },
};

export function ExistingZones({
    refreshToken,
    onZonesChanged,
    selectedZone,
    onClearSelection,
    onZoneFocus,
}) {
    const PAGE_SIZE = 10;
    const [ zones, setZones ] = useState([]);
    const [ isLoading, setIsLoading ] = useState(true);
    const [ zoneToDelete, setZoneToDelete ] = useState(null);
    const [ zoneToEdit, setZoneToEdit ] = useState(null);
    const [ page, setPage ] = useState(1);

    const loadZones = useCallback(() => {
        setIsLoading(true);
        return getGeofences()
            .then((result) => {
                setZones(result.geofences);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch zones:", err);
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        void Promise.resolve().then(loadZones);
    }, [loadZones, refreshToken]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(zones.length / PAGE_SIZE));
        if (page > totalPages) setPage(totalPages);
    }, [zones, page]);

    function handleConfirmDelete(zone) {
        setZoneToDelete(null);

        if (String(selectedZone?.id) === String(zone.id)) {
            onClearSelection?.();
        }

        deleteGeofence(zone.id)
            .then(() => {
                loadZones();
                onZonesChanged?.();
            })
            .catch((err) => {
                console.error("Failed to delete zone:", err);
                loadZones();
            });
    }

    function handleSaveEdit(zone) {
        updateGeofence(zone.id, {
            name: zone.name,
            trigger_type: zone.triggerType,
        })
            .then(() => {
                setZoneToEdit(null);
                loadZones();
                onZonesChanged?.();
            })
            .catch((err) => console.error("Failed to update zone:", err));
    }

    if (isLoading) {
        return <p className="text-fleet-secondary">Loading zones..</p>;
    }

    // ---- Detail view -------------------------------------------------
    if (selectedZone) {
        const full = zones.find((z) => String(z.id) === String(selectedZone.id));

        if (!full && !selectedZone.name) {
            return (
                <div className="bg-fleet-surface">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display font-medium text-lg text-fleet-text">
                            Zone Detail
                        </h2>
                        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            All zones
                        </Button>
                    </div>
                    <p className="text-sm text-fleet-secondary">
                        This zone no longer exists. It may have been deleted after
                        the alert was recorded.
                    </p>
                </div>
            );
        }

        const zone = full ?? selectedZone;
        const source = zone.source ?? "user";
        const meta = sourceStyles[source] ?? sourceStyles.user;
        const isAuto = source !== "user";

        return (
            <div className="bg-fleet-surface">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-medium text-lg text-fleet-text">
                        Zone Detail
                    </h2>
                    <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        All zones
                    </Button>
                </div>

                <div className="space-y-3">
                    <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1 shrink-0 text-fleet-secondary" />
                        <p className="text-fleet-text font-medium">{zone.name}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Badge className={`uppercase text-xs font-bold rounded-md ${meta.className}`}>
                            {meta.label}
                        </Badge>
                        <Badge
                            className={`uppercase text-xs font-bold rounded-md ${
                                triggerStyles[zone.trigger_type] ?? triggerStyles.none
                            }`}
                        >
                            {zone.trigger_type}
                        </Badge>
                        {zone.hotspot_kind && (
                            <Badge className="uppercase text-xs font-bold rounded-md bg-fleet-secondary/10 text-fleet-secondary">
                                {String(zone.hotspot_kind).replaceAll("_", " ")}
                            </Badge>
                        )}
                    </div>

                    <dl className="text-sm space-y-1">
                        {zone.vehicle_id && (
                            <div className="flex justify-between">
                                <dt className="text-fleet-secondary">Vehicle</dt>
                                <dd className="text-fleet-text">{zone.vehicle_id}</dd>
                            </div>
                        )}
                        {zone.created_at && (
                            <div className="flex justify-between">
                                <dt className="text-fleet-secondary">Created</dt>
                                <dd className="text-fleet-text">
                                    {new Date(zone.created_at).toLocaleString()}
                                </dd>
                            </div>
                        )}
                    </dl>

                    {isAuto ? (
                        <p className="text-xs text-fleet-secondary border-t border-fleet-border pt-3">
                            Detected automatically from vehicle events. Not editable —
                            it will be recreated if the pattern recurs.
                        </p>
                    ) : (
                        <div className="flex gap-2 border-t border-fleet-border pt-3">
                            <Button type="button" variant="outline" size="sm"
                                    onClick={() => setZoneToEdit(zone)}>
                                <Pencil className="h-3 w-4 mr-1" />
                                Edit
                            </Button>
                            <Button type="button" variant="outline" size="sm"
                                    onClick={() => setZoneToDelete(zone)}>
                                <Trash className="h-4 w-4 mr-1 text-fleet-alert" />
                                Delete
                            </Button>
                        </div>
                    )}
                </div>

                <DeleteZoneModal
                    open={!!zoneToDelete}
                    onOpenChange={(isOpen) => !isOpen && setZoneToDelete(null)}
                    zone={zoneToDelete}
                    onConfirm={handleConfirmDelete}
                />
                <EditZoneModal
                    open={!!zoneToEdit}
                    onOpenChange={(isOpen) => !isOpen && setZoneToEdit(null)}
                    zone={zoneToEdit}
                    onConfirm={handleSaveEdit}
                />
            </div>
        );
    }

    // ---- List view ---------------------------------------------------
    const totalPages = Math.max(1, Math.ceil(zones.length / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE;
    const pageZones = zones.slice(start, start + PAGE_SIZE);

    return (
        <div className="bg-fleet-surface min-w-0">
            <h2 className="font-display font-medium text-lg mb-4 text-fleet-text">
                Existing Zones
            </h2>

            <Table className="table-fixed w-full">
                <TableHeader>
                    <TableRow className="border-fleet-border">
                        <TableHead className="text-fleet-secondary w-[40%]">Zone Name</TableHead>
                        <TableHead className="text-fleet-secondary w-[22%]">Type</TableHead>
                        <TableHead className="text-fleet-secondary w-[20%]">Trigger</TableHead>
                        <TableHead className="text-fleet-secondary text-right w-[18%]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pageZones.map((zone) => {
                        const source = zone.source ?? "user";
                        const meta = sourceStyles[source] ?? sourceStyles.user;
                        const isAuto = source !== "user";

                        return (
                            <TableRow
                                key={zone.id}
                                className="border-fleet-border cursor-pointer hover:bg-fleet-bg/40"
                                onClick={() => onZoneFocus?.(zone)}
                            >
                                <TableCell className="text-fleet-text font-medium">
                                    <span className="block truncate" title={zone.name}>{zone.name}</span>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    <Badge className={`uppercase text-xs font-bold rounded-md ${meta.className}`}>
                                        {meta.label}
                                    </Badge>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    <Badge
                                        className={`uppercase text-xs font-bold rounded-md ${
                                            triggerStyles[zone.trigger_type] ?? triggerStyles.none
                                        }`}
                                    >
                                        {zone.trigger_type}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                    {isAuto ? (
                                        <span className="text-xs text-fleet-secondary pr-2">auto</span>
                                    ) : (
                                        <>
                                            <Button type="button" variant="ghost" size="icon"
                                                    onClick={(e) => { e.stopPropagation(); setZoneToEdit(zone); }}>
                                                <Pencil className="h-3 w-4 text-fleet-secondary" />
                                            </Button>
                                            <Button type="button" variant="ghost" size="icon"
                                                    onClick={(e) => { e.stopPropagation(); setZoneToDelete(zone); }}>
                                                <Trash className="h-4 w-4 text-fleet-alert" />
                                            </Button>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}

                    {pageZones.length < PAGE_SIZE &&
                        Array.from({ length: PAGE_SIZE - pageZones.length }).map((_, i) => (
                            <TableRow key={`filler-${i}`} className="border-fleet-border/40">
                                <TableCell colSpan={4} className="h-[41px]" />
                            </TableRow>
                        ))}
                </TableBody>
            </Table>

            <div className="mt-4 space-y-2">
                <p className="text-xs text-fleet-secondary text-center">
                    Showing {zones.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, zones.length)} of {zones.length}
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>

            <DeleteZoneModal
                open={!!zoneToDelete}
                onOpenChange={(isOpen) => !isOpen && setZoneToDelete(null)}
                zone={zoneToDelete}
                onConfirm={handleConfirmDelete}
            />
            <EditZoneModal
                open={!!zoneToEdit}
                onOpenChange={(isOpen) => !isOpen && setZoneToEdit(null)}
                zone={zoneToEdit}
                onConfirm={handleSaveEdit}
            />
        </div>
    );
}