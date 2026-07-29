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
import { Button } from "@/components/ui/button"
import { Pencil, Trash } from "lucide-react";
import DeleteZoneModal from "@/components/geofence/DeleteZoneModal";
import { EditZoneModal } from "@/components/geofence/EditZoneModal";
import { getGeofences, deleteGeofence, updateGeofence } from "@/services/geofenceServices";

const triggerStyles = {
    entry: "bg-fleet-blue/10 text-fleet-blue",
    both: "bg-fleet-green/10 text-fleet-green",
    exit: "bg-fleet-idle/10 text-fleet-secondary",
};

// refreshToken: bump this from the parent whenever a zone is created
// elsewhere (e.g. drawn on the map), so this table stays in sync.
// onZonesChanged: called after this component itself changes a zone
// (edit/delete), so siblings like the map layer can refetch too.
export function ExistingZones({ refreshToken, onZonesChanged }){
    const [ zones, setZones ] = useState([]);
    const [ isLoading, setIsLoading ] = useState(true);
    const [ zoneToDelete, setZoneToDelete ] = useState(null);
    const [ zoneToEdit, setZoneToEdit ] = useState(null);

    const loadZones = useCallback(() => {
        setIsLoading(true);
        // 'user' excludes auto-generated hotspot and security-marker zones --
        // this table is for zones a person created and can edit or delete.
        return getGeofences('user')
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
        loadZones();
    }, [loadZones, refreshToken]);

    function handleConfirmDelete(zone) {
        deleteGeofence(zone.id)
            .then(() => {
                setZoneToDelete(null);
                loadZones();
                onZonesChanged?.();
            })
            .catch((err) => {
                console.error("Failed to delete zone:", err);
            });
    }

    // EditZoneModal's form uses camelCase (triggerType) per zoneSchema;
    // the API expects snake_case (trigger_type). Mapping happens here,
    // at the point where the service call is made.
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
            .catch((err) => {
                console.error("Failed to update zone:", err);
            });
    }

    if(isLoading) {
        return <p className="text-fleet-secondary">Loading zones..</p>
    }

    return (
        <div className="bg-fleet-surface">
            <h2 className="font-display font-medium text-lg mb-4 text-fleet-text">Existing Zones</h2>

            <Table>
                <TableHeader>
                    <TableRow className="border-fleet-border">
                        <TableHead className="text-fleet-secondary">Zone Name</TableHead>
                        <TableHead className="text-fleet-secondary">Trigger Type</TableHead>
                        <TableHead className="text-fleet-secondary text-right">
                            Actions
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {zones.map((zone) => (
                      <TableRow key={zone.id} className="border-fleet-border">
                        <TableCell className="text-fleet-text font-medium">
                            {zone.name}
                        </TableCell>
                        <TableCell>
                            <Badge
                                className={`uppercase text-xs font-bold rounded-md ${triggerStyles[zone.trigger_type]}`}
                            >
                                {zone.trigger_type}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setZoneToEdit?.(zone)}
                            >
                                <Pencil className="h-3 w-4 text-fleet-secondary" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setZoneToDelete?.(zone)}
                            >
                                <Trash className="h-4 w-4 text-fleet-alert"/>
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
            </Table>
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