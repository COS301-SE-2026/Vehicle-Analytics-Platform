import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { zoneSchema } from "@/schemas/zoneSchema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { createGeofence } from "@/services/geofenceServices";

export function ZoneDetails({ drawnShape, onZoneCreated }) {
    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(zoneSchema),
        defaultValues: {
            name: "",
            triggerType: undefined,
        },
    });

    function onSubmit(values) {
        console.log("drawnShape at Sumbit time:", drawnShape);
        if (!drawnShape) {
            alert("Please draw a geofence on the map first")
        }
    
    const payload = {
        name: values.name,
        trigger_type: values.triggerType,
        boundary: drawnShape.geometry,
    };

    createGeofence(payload).then((result) => {
        console.log("Zone created:", result);
        reset();
        onZoneCreated?.(result.geofence);
    })
    .catch((err) => {
        console.error("Failed to create geofence:", err);
    });

}

function handleCancel(){
    reset();
}

    return (
       <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name" className="text-fleet-text">Zone Name</Label>
                <Input
                    id="name"
                    placeholder="e.g. Pretoria Depot"
                    className="border-fleet-border bg-fleet-surface text-fleet-text placeholder:text-fleet-secondary"
                    {...register("name")} 
                 />
                 {errors.name && (
                    <p className="text-sm text-fleet-alert">{errors.name.message}</p>
                 )}
            </div>

            <div className="flex flex-col gap-4 bg-fleet-surface">
                <label className="text-fleet-text">Trigger Type</label>
                <Controller
                    name="triggerType"
                    control={control}
                    render={({ field }) => (
                    <ToggleGroup
                        type="single"
                        value={field.value}
                        onValueChange={field.onChange}
                        className="justify-start gap-2"
                    >
                        <ToggleGroupItem 
                            value="entry"
                            className="rounded-md border border-fleet text-fleet-text data-[state=on]:bg-fleet-blue data-[state=on]:text-white"
                        >Entry
                        </ToggleGroupItem>

                        <ToggleGroupItem
                            value="exit"
                            className="rounder-md border border-fleet-border text-fleet-text data-[state=on]:bg-fleet-blue data-[state=on]:text-white"
                        >Exit
                        </ToggleGroupItem>

                        <ToggleGroupItem
                            value="both"
                            className="rounder-md border border-fleet-border text-fleet-text data-[state=on]:bg-fleet-blue data-[state=on]:text-white"
                        >Both
                        </ToggleGroupItem>
                    </ToggleGroup>
                    )}
                />
                {errors.triggerType && (
                    <p className="text-sm text-fleet-alert">{errors.triggerType.message}</p>
                )}
            </div>

            <div className="flex flex-col gap-4 pt-2">
                <Button 
                    type="submit"
                    className="w-full h-12 bg-fleet-blue text-white hover:bg-fleet-blue/90" 
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Saving..." : "Save Geofence"}
                </Button>

                <Button 
                    type="button"
                    variant="ghost" 
                    className="w-full h-12 text-fleet-secondary hover:bg-fleet-panel" 
                    onClickCapture={handleCancel}
                >
                    Cancel
                </Button>
            </div>
       </form> 
    );
}