import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

const CHANGELOG = [
    {
        title: "Changed primary brand colour (Green to Blue)",
        description: "In Demo 1, fleet-green was used for all UI chrome (buttons, links, active states). This has been swapped to fleet-blue. Green is now reserved strictly for semantic meaning, such as high safety scores or active statuses.",
        rationale: "Using green for interactive elements diluted its impact as a positive status indicator. Separating brand identity from status signals ensures the interface can be read accurately at a glance.",
    },
    {
        title: "Updated WCAG target to 2.2 AA",
        description: "All contrast ratios, focus rings, and screen-reader targets now meet WCAG 2.2 AA standards instead of 2.1 AA.",
        rationale: "WCAG 2.2 is the current accessibility standard. The system should not be built against outdated specifications.",
    },
    {
        title: "Simplified shadow scale (4 levels to 2)",
        description: "The None/Low/Medium/High elevation scale from Demo 1 has been removed. The system now exclusively uses shadow-sm and shadow-lg.",
        rationale: "Four levels introduced inconsistency in a data-dense interface. Two roles (shadow-sm for cards, shadow-lg for modals) effectively cover all layout requirements.",
    },
    {
        title: "Reduced motion scale durations",
        description: "The 3-step scale (150/250/400ms) was removed. The system now uses a strict 100ms duration for micro-interactions and 200ms for larger layout shifts.",
        rationale: "The wider range made interactions feel inconsistent. A two-value scale keeps the interface feeling deliberate and responsive.",
    },
    {
        title: "Removed standalone Design Principles page",
        description: "The dedicated page for design principles has been removed from the documentation.",
        rationale: "These principles have been folded directly into the Brand Foundation in the Values section so they function as actionable rules rather than isolated guidelines.",
    },
]

export default function ChangeLog() {
    return (
        <div className="max-w-3xl">
            <div className="mb-8">
                <h2 className="font-display font-bold text-2xl text-fleet-text mb-2">
                    Changelog
                </h2>
                <p className="text-fleet-secondary">
                    What changed between the Demo 1 and Demo 2 style guides, and why.
                </p>
            </div>

            <div className="space-y-6">
                {CHANGELOG.map((item) => (
                    <Card key={item.title} className="shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg text-fleet-text">{item.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-fleet-secondary text-sm mb-4 leading-relaxed">
                                {item.description}
                            </p>
                            <div className="bg-fleet-blue/10 rounded-md p-3 text-sm">
                                <span className="font-semibold text-fleet-blue mr-2">Why?</span>
                                <span className="text-fleet-secondary">{item.rationale}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}