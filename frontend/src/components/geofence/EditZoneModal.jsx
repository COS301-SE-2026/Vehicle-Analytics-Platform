import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { zoneSchema } from "@/schemas/zoneSchema";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function EditZoneModal({open, onOpenChange, zone, onConfirm }) {
     const {
        register,
        handleSubmit,
        control,
        formState: {errors},
     } = useForm({
        resolver : zodResolver(zoneSchema),
        defaultValues: {
            name: zone?.name ?? "",
            triggerType: zone?.triggerType ?? undefined,
        },
     });

     function onSubmit(values) {
        onSave?.({ ...zone, ...values });
        onOpenChange(false);
     }

     return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="bg-fleet-surface">
             <form onSubmit={handleSubmit(onSubmit)}>
              <AlertDialogHeader>
                 <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-fleet-idle/20">
                    <Pencil className="h-8 w-8 text-fleet-disabled"/>
                 </div>
                 <AlertDialogTitle className="text-center text-fleet-text font-bold">
                    Edit Zone
                 </AlertDialogTitle>
                 <AlertDialogDescription className="text-fleet-secondary">
                    Update the parameters for the{" "}
                    <span className="font-medium text-fleet-text">{zone?.name}</span>{" "}
                    geofence.
                 </AlertDialogDescription>
              </AlertDialogHeader>
              
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-fleet-text"  htmlFor="edit-name" >
                            Zone Name
                        </Label>
                        <Input
                            id="edit name"
                            className="border-fleet-border bg-fleet-surface text-fleet-text"
                            {...register("name")}
                        />
                        {errors.name && (<p className="text-sm text-fleet-alert">{errors.name.message}</p>)}
                    </div>

                    <div className="flex flex-col gap-4 bg-fleet-surface">
                     <Label className="text-fleet-text">Triggger Type</Label>
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
                            >   
                             Entry
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="exit"
                                className="rounder-md border border-fleet-border text-fleet-text data-[state=on]:bg-fleet-blue data-[state=on]:text-white"
                            >   
                            Exit
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="both"
                                className="rounder-md border border-fleet-border text-fleet-text data-[state=on]:bg-fleet-blue data-[state=on]:text-white"
                            >
                            Both
                            </ToggleGroupItem>
                            </ToggleGroup>
                          )}
                        />
                        {errors.triggerType && (
                        <p className="text-sm text-fleet-alert">{errors.triggerType.message}</p>
                        )}
                    </div>
                </div>

              <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
                <Button 
                        type="submit"
                        className="w-full h-8 bg-fleet-blue text-white hover:bg-fleet-blue/90" 
                    >
                    Save Changes
                    </Button>
                    <Button 
                        type="button"
                        variant="outline" 
                        className="w-full h-8 text-fleet-secondary hover:bg-fleet-panel" 
                        onClick={() => onOpenChange(false)}
                    >
                    Cancel
                    </Button>
              </AlertDialogFooter>
             </form>
            </AlertDialogContent>
        </AlertDialog>
     );
}