import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { zoneSchema } from "@/schemas/zoneSchema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function ZoneDetails() {
    const {
        register,
        handleSubmit,
        handleCancel,
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
        console.log("Zone saved:", values);
    }

    return (
       <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Zone Name</Label>
                <Input
                    id="name"
                    placeholder="e.g. Pretoria Depot"
                    {...register("name")} 
                 />
                 {errors.name && (
                    <p className="text-sm text-fleet-alert">{errors.name.message}</p>
                 )}
            </div>

            <div className="space-y-2">
                <label>Trigger Type</label>
                <Controller
                    name="triggerType"
                    control={control}
                    render={({ field }) => (
                    <ToggleGroup
                        type="single"
                        value={field.value}
                        onValueChange={field.onChange}
                        className="justify-start"
                    >
                        <ToggleGroupItem value="entry">Entry</ToggleGroupItem>
                        <ToggleGroupItem value="exit">Exit</ToggleGroupItem>
                        <ToggleGroupItem value="both">Both</ToggleGroupItem>
                    </ToggleGroup>
                    )}
                />
                {errors.triggerType && (
                    <p className="text-sm text-fleet-alert">{errors.triggerType.message}</p>
                )}
            </div>

            <div className="space-y-2 pt-2">
                <button type="submit" className="w-full" disable={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Zone"}
                </button>
                <button type="button" variant="ghost" className="w-full" onClickCapture={handleCancel}>
                    Cancel
                </button>
            </div>
       </form> 
    );
}