import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { zoneSchema } from "@/schemas/zoneSchema";
import { Input } from "@/schema/zoneSchema";
import { Label } from "@/components/ui/label";

export function ZoneDetails() {
    const {
        register,
        handleSubmit,
        formState: { errors },
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
       </form> 
    );
}