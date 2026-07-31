import {
    X,
    AlertTriangle,
    Truck,
    MapPin,
    Clock,
    Waypoints,
    Zap,
    Power,
    PlayCircle,
    LayoutDashboard,
    Map,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Users,
    RefreshCw,
    Car
} from 'lucide-react'

import newLogo from '@/assets/newLogo.png'

const APP_ICONS = [
    X,
    AlertTriangle,
    Truck,
    MapPin,
    Clock,
    Waypoints,
    Zap,
    Power,
    PlayCircle,
    LayoutDashboard,
    Map,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Users,
    RefreshCw,
    Car  
]

export default function LogoIconography(){
    return (
        <div>
            <h2 className="font-display font-bold text-2xl text-fleet-text mb-2">
                Logo & Iconography
            </h2>
            <p className="text-fleet-secondary mb-8">
                The V.A.P.O.R. wordmark and icon system, as well as the rules that keep them consistent everywhere they appear.
            </p>

            {/*PRIMARY LOGO*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">
                    Primary Logo
                </h3>
                <p className="text-fleet-text mb-4 text-sm">
                    The V.A.P.O.R. wordmark, with the tagline "Vehicle Analytics, Processing and Operations in Real-time" beneath it.
                    The O incorporates a smoke graphic representing vapor caught by the O from a vehicle's tire braking harshly.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border border-fleet-border rounded-lg p-6 flex items-center justify-center">
                        <img src={newLogo} alt="V.A.P.O.R. logo" className="max-w-[220px]" />

                    </div>
                    <div className="bg-fleet-panel border border-fleet-border rounded-lg p-6 flex items-center justify-center">
                        <img src={newLogo} alt="V.A.P.O.R. logo" className="max-w-[220px]" />


                    </div>
                    <div className="bg-fleet-blue border border-fleet-border rounded-lg p-6 flex items-center justify-center">
                        <img src={newLogo} alt="V.A.P.O.R. logo" className="max-w-[220px]" />


                    </div>
                </div>

                <p className="text-xs text-fleet-secondary mt-2">Left to right: logo on white, on light grey and on primary backgrounds. These are backgrounds used in the system.</p>
                <p className="text-xs text-fleet-secondary mt-1">
                    Contrast (orange #ff6200 against each background): white 3.00:1, light grey 2.47:1, navy
                    4.47:1. Passes the WCAG AA large-text/graphics threshold (3:1) on white and navy; falls
                    short on light grey. Logos are generally exempt from WCAG text-contrast requirements, so
                    this is a legibility note rather than a compliance failure.
                </p>
            </div>

            {/*ADDITIONAL FORMATS*/}


            {/* USAGE RULES */}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">
                    Logo Usage Rules
                </h3>
                <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden">
                    <thead className="bg-fleet-panel">
                        <tr>
                            <th className="text-left p-2">Rule</th>
                            <th className="text-left p-2">Guideline</th>
                        </tr>
                    </thead>
                    <tbody className="text-fleet-text">
                        <tr className="border-t border-fleet-border">
                            <td className="p-2 font-medium">Minimum size</td>
                            <td className="p-2">120px wide</td>
                        </tr>
                        <tr className="border-t border-fleet-border">
                            <td className="p-2 font-medium">Clear space</td>
                            <td className="p-2">Padding equal to height of the "V" on all sides</td>
                        </tr>
                        <tr className="border-t border-fleet-border">
                            <td className="p-2 font-medium">Background</td>
                            <td className="p-2">White, light grey, or primary brand colour only</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/*Forbidden treatments*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Forbidden Treatments</h3>
                <ul className="list-disc list-inside text-fleet-text space-y-1 text-sm">
                    <li>Do not stretch, squash, or change the logo's aspect ratio</li>
                    <li>Do not rotate the logo at any angle</li>
                    <li>Do not recolour the logo outside of the approved formats above</li>
                    <li>Do not add drop shadows, glows, bevels, or other effects to the logo</li>
                    <li>Do not place on busy photography or on low contrast backgrounds</li>
                </ul>
            </div>

            {/*ICONOGRAPHY*/}
            <div>
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Iconography</h3>
                <p className="text-fleet-text text-sm mb-3">
                    V.A.P.O.R. uses <strong>Lucide React</strong> as its icon library.
                </p>
                <ul className="list-disc list-inside text-fleet-text space-y-1 text-sm mb-4">
                    <li>Consistent sizes: 16px (inline text), 20px (buttons), 24px (feature icons)</li>
                    <li><code className="text-xs bg-fleet-panel px-1 rounded">currentColor</code> for stroke, so icons inherit surrounding text colour</li>
                    <li>Stroke width of 2 across all usage</li>
                    <li>Never filled, unless the specific Lucide icon is an explicitly filled variant</li>
                </ul>
                <div className="flex items-center gap-6 bg-fleet-panel rounded-lg p-4">
                    {[16, 20, 24].map((size) => (
                        <div key={size} className="flex flex-col items-center gap-2">
                            <Truck className="text-fleet-blue" style={{ width: size, height: size }} strokeWidth={2} />
                            <span className="text-xs font-mono text-fleet-secondary">{size}px</span>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap gap-5 bg-fleet-panel rounded-lg p-4">
                    {APP_ICONS.map((Icon) => (
                        <div key={Icon.displayName || Icon.name} className="flex flex-col items-center gap-1.5">
                            <Icon className="w-5 h-5 text-fleet-blue" strokeWidth={2}/>
                            <span className="text-[10px] font-mono text-fleet-secondary">
                                {Icon.displayName || Icon.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}