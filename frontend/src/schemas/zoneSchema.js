import { z } from 'zod'

export const zoneSchema = z.object({
    name: z.string().min(1, "Zone name is required"),
    triggerType: z.enum(["entry", "exit", "both"], {
        required_error: "Select a trigger type",
    }),
});
