import { useState } from "react";
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

// mock data
const mockZones = [
    { id: 1, name: "Pretoria Depot", triggerType: "entry"},
    { id: 2, name: "Durban Port", triggerType: "both"},
    { id: 3, name:  "Johannesburg Port", triggerType: "exit" },
];

const triggerStyles = {
    entry: "bg-fleet-blue/10 text-fleet-blue",
    both: "bg-fleet-green/10 text-fleet-green",
    exit: "bg-fleet-idle/10 text-fleet-secondary",
};

export function ExistingZones({ zone = mockZones, onEdit, onDelete }){
    const [ zoneToDelete, setZoneToDelete ] = useState(null);
    const [ zoneToEdit, setZoneToEdit ] = useState(null);

    function handleConfirmDelete(zone) {
        onDelete?.(zone);
        setZoneToDelete(null);
    }

    function handleSaveEdit(zone) {
        onEdit?.(zone);
        setZoneToEdit(null);
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
                    {zone.map((zone) => (
                      <TableRow key={zone.id} className="border-fleet-border">
                        <TableCell className="text-fleet-text font-medium">
                            {zone.name}
                        </TableCell>
                        <TableCell>
                            <Badge
                                className={`uppercase text-xs font-bold rounded-md ${triggerStyles[zone.triggerType]}`}
                            >
                                {zone.triggerType}
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
                onConfrim={handleConfirmDelete}
            />
            <EditZoneModal
                open={!!zoneToEdit}
                onOpenChange={(isOpen) => !isOpen && setZoneToEdit(null)}
                zone={zoneToEdit}
                onSave={handleSaveEdit}
            />
        </div>
    );
}
