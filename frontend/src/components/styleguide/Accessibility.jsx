import { Badge } from "@/components/ui/badge"

const ACCESSIBILITY_ITEMS = [
    { area: "Colour contrast", status: "Implemented", note: "Every foreground/background pairing checked against WCAG 2.2 AA — see Contrast Ratios table under Colour Palette." },
    { area: "Keyboard navigation", status: "Implemented", note: "focus-visible ring applied on Button, Input, Badge and Sidebar; tab order follows DOM order." },
    { area: "Icon-only labels", status: "Partial", note: "aria-label present on Sidebar, the user modals, and auth forms. Not yet applied to every icon-only control." },
    { area: "Toast announcements", status: "Implemented", note: "Built on Sonner, which ships its own ARIA live-region handling." },
    { area: "Reduced motion", status: "Not yet implemented", note: "prefers-reduced-motion is not currently handled for the 100ms / 200ms motion tokens." },
    { area: "Loading state (aria-busy)", status: "Not yet implemented", note: "Async/loading states are not yet exposed to assistive tech." },
]

const STATUS_VARIANT = {
    "Implemented": "default",
    "Partial": "secondary",
    "Not yet implemented": "outline",
}

export default function Accessibility(){
    return (
        <div>
            <h2 className="font-display font-bold text-2xl text-fleet-text mb-2">
                Accessibility
            </h2>
            <p className="text-fleet-secondary mb-8">
                V.A.P.O.R. targets WCAG 2.2 AA as the conformance floor across the system.
            </p>

            <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden mb-3">
                <thead className="bg-fleet-panel">
                    <tr>
                        <th className="text-left p-2">Area</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Note</th>
                    </tr>
                </thead>
                <tbody className="text-fleet-text">
                    {ACCESSIBILITY_ITEMS.map((item) => (
                        <tr key={item.area} className="border-t border-fleet-border">
                            <td className="p-2 font-mono text-xs">{item.area}</td>
                            <td className="p-2">
                                <Badge variant={STATUS_VARIANT[item.status]}>{item.status}</Badge>
                            </td>
                            <td className="p-2 text-xs text-fleet-secondary">{item.note}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <p className="text-xs text-fleet-secondary mt-2">
                Score pending.. run lighthouse
            </p>
        </div>
    )
}