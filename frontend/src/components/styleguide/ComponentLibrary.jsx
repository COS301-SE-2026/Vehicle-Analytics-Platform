import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog"

import { Badge } from "@/components/ui/badge"

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card"

import {
    Alert,
    AlertTitle,
    AlertDescription
} from "@/components/ui/alert"

import { toast } from "sonner"


const BUTTON_VARIANTS = [
    {name: "default", usage: "Primary action" },
    {name: "outline", usage: "Secondary action alongside a primary" },
    {name: "secondary", usage: "Lower-emphasis alternate action" },
    {name: "ghost", usage: "Toolbar/icon actions, dialog close" },
    {name: "destructive", usage: "Deactivate user, delete, irreversible actions" },
    {name: "link", usage: "Inline text-styled actions" },
]

const BUTTON_SIZES = [
    {name: "xs", note: "h-6, compact contexts" },
    {name: "sm", note: "h-7" },
    {name: "default", note: "h-8 - standard" },
    {name: "lg", note: "h-9" },
    {name: "icon / icon-xs / icon-sm /icon-lg", note: "Square, icon only" },
]

const BADGE_VARIANTS = [ "default", "secondary", "destructive", "outline", "ghost", "link"]

export default function ComponentLibrary(){

    const [dialogOpen, setDialogOpen] = useState(false)
    return (
        <div>
            <h2 className="font-display font-bold text-2xl text-fleet-text mb-2">
                Component Library
            </h2>
            <p className="text-fleet-secondary mb-8">
                Reuseable UI primitives from <code>src/components/ui/</code>. These include variants, sizes and states for each.
            </p>


            {/*BUTTON*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Button</h3>
                <div className="mb-3 rounded-lg p-4 flex flex-wrap gap-2">
                    <Button variant="default">Default</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Deactivate</Button>
                    <Button variant="link">Link</Button>
                    <Button variant="disable">Disable</Button>
                </div>

                <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden mb-3">
                    <thead className="bg-fleet-panel">
                        <tr>
                            <th className="text-left p-2">Variant</th>
                            <th className="text-left p-2">Usage</th>
                        </tr>
                    </thead>
                    <tbody className="text-fleet-text">
                        {BUTTON_VARIANTS.map((v) => (
                            <tr ey={v.name} className="border-t border-fleet-border">
                                <td className="p-2 font-mono text-xs">{v.name}</td>
                                <td className="p-2 text-xs text-fleet-secondary">{v.usage}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden mb-3">
                    <thead className="bg-fleet-panel">
                        <tr>
                            <th className="text-left p-2">Size</th>
                            <th className="text-left p-2">Note</th>
                        </tr>
                    </thead>
                    <tbody className="text-fleet-text">
                        {BUTTON_SIZES.map((s) => (
                            <tr ey={s.name} className="border-t border-fleet-border">
                                <td className="p-2 font-mono text-xs">{s.name}</td>
                                <td className="p-2 text-xs text-fleet-secondary">{s.note}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <p className="text-xs text-fleet-secondary mt-2">
                    States: hover (variant-specific fill shift), active (1px press translation),
                    focus-visible (ring), disabled (50% opacity, pointer-events off), aria invalid (destructive-tinted border and ring).
                </p>
            </div>

            {/*INPUT*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Input</h3>
                <div className="mb-3 bg-fleet-panel rounded-lg p-4 flex flex-col gap-3 max-w-sm">
                    <Input placeholder="Default"></Input>
                    <Input placeholder="Disabled" disabled></Input>
                    <Input placeholder="Invalid" aria-invalid="true"></Input>
                </div>

                <p className="text-xs text-fleet-secondary">
                    Single input primitive, no variant pop. State is ontrolled entirely through native/ARIA attributes: <code>disabled</code> dims and blocks interaction, <code> aria-invalid</code> switches the border and focus ring to the destructive token.
                </p>
            </div>


            {/*SELECT*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Select</h3>
                <div className="mb-3 bg-fleet-panel rounded-lg p-4 mx-w-xs">
                    <Select defaultValue="active">
                        <SelectTrigger>
                            <SelectValue placeholder="Status"></SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="idle">Idle</SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <p className="text-xs text-fleet-secondary">
                    Trigger has a <code>size</code> prop (<code>default</code> / <code>sm</code>). Selected state shown with a check mark in the item; open/close is animated at the 100ms micro-interaction duration.
                </p>
            </div>

            {/*DIALOG*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Dialog (Modal)</h3>
                <div className="mb-3 bg-fleet-panel rounded-lg p-4">
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="destructive">Deactivate user</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Deactivate this user?</DialogTitle>
                                <DialogDescription>
                                    They will lose access immediately. This can be reverserd later.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                <Button variant="destructive" onClick={() => setDialogOpen(false)}>Deactivate</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <p className="text-xs text-fleet-secondary">
                    Used for destructive confirmations (deactivate/edit user). It matches <code>shadow-lg</code>{" "} from Design Tokens. Close button in the corner reuses <code>Button</code> at{" "}
                    <code>variant="ghost" size="icon-sm"</code> rather than a separate control.
                </p>
            </div>

            {/*TOAST*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Toast</h3>
                <div className="mb-3 bg-fleet-panel rounded-lg flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => toast.success("Saved")}>Success</Button>
                    <Button variant="outline" onClick={() => toast.error("Couldn't load vehicles. Try again")}>Success</Button>
                    <Button variant="outline" onClick={() => toast.warning("Fuel level low")}>Warning</Button>
                    <Button variant="outline" onClick={() => toast.info("15 active, 0 offline")}>Info</Button>
                </div>
                <p className="text-xs text-fleet-secondary">
                    Five states, each with a dedicated icon: success, info, warning, error, loading (spinner). 
                </p>
            </div>

            {/*BADGE*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Badge</h3>
                <div className="mb-3 bg-fleet-panel rounded-lg p-4 flex flex-wrap gap-2">
                    {BADGE_VARIANTS.map((v) => (
                        <Badge ey={v} variant={v}>{v}</Badge>
                    ))}
                </div>

                <p className="text-xs text-fleet-secondary">
                    Six variants at a fixed height. Status badges (active/idle/offline) should pair the{" "} <code>default</code> / <code>secondary</code> shape with the semantic Colour Paletter, not a dedicated badge colour prop.
                </p>
            </div>

            {/*CARD*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Card</h3>
                <div className="mb-3 bg-fleet-panel rounded-lg p-4 max-w-xs">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Vehicles</CardTitle>
                            <CardDescription>Currently in motion</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="font-display text-2xl text-fleet-text">42</p>
                        </CardContent>
                        <CardFooter>
                            <p className="text-xs text-fleet-secondary">Updated every 5s</p>
                        </CardFooter>
                    </Card>
                </div>
                <p className="text-xs text-fleet-secondary">
                    <code>size</code> prop (<code>default</code> / <code>sm</code>)
                    Backs every dashboard tile per Design Principle....
                </p>
            </div>

            {/*ALERT*/}
            <div>
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Alert</h3>
                <div className="mb-3 bg-fleet-panel rounded-lg p-4 flex flex-col gap-3">
                    <Alert>
                        <AlertTitle>Nothing to show yet</AlertTitle>
                        <AlertDescription>No telemetry has been recorder for this vehicle.</AlertDescription>
                    </Alert>
                    <Alert variant="destrictive">
                        <AlertTitle>Couldn't load vehicles</AlertTitle>
                        <AlertDescription>Try again.</AlertDescription>
                    </Alert>
                </div>
                <p className="text-xs text-fleet-secondary">
                    Two variants: <code>default</code> and <code>destructive</code>.
                </p>
            </div>
        </div>
    )
}