export const RADIUS = [
    {name: 'sm', value: 'calc(0.75rem - 4px)', px: '8px', usage: 'Small elements like badges, chips'},
    {name: 'md', value: 'calc(0.75rem - 2px)', px: '10px', usage: 'Inputs, buttons'},
    {name: 'lg', value: '0.75rem (--radius)', px: '12px', usage: 'Cards, panels, modals'},
]

export const SHADOWS = [
    { name: 'shadow-sm', usage: 'Dashboard cards like the StatCard, DonutChart, the map tile'},
    { name: 'shadow-lg', usage: 'Modals to deactivate user, edit user and future confirmation dialogs'},
]

export const DURATIONS = [
    {ms: '100ms', note: 'Micro interactions like hover, toggle, small state changes'},
    {ms: '200ms', note: 'Larger movements in the panel and sidebar transitions'},
]

export const BREAKPOINTS =[
    {name: 'sm', px: '640px'},
    {name: 'md', px: '768px'},
    {name: 'lg', px: '1024px'},
    {name: 'xl', px: '1280px'},
    {name: '2xl', px: '1536px'},
]

export default function DesignTokens(){
    return (
        <div>
            <h2 className="font-display font-bold text-2xl text-fleet-text mb-2">Design Tokens</h2>
            <p className="text-fleet-secondary mb-8">
                A token is a name for a decision. Once named, it is referenced consistently rather than redecided on every screen. We apply the same contract to colour, spacing, radius, shadow and motion.
            </p>

            {/*RADIUS*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Border Radius</h3>
                <p className="text-xs text-fleet-secondary mb-2">
                Built on a single CSS variable, <code>--radius: 0.75rem</code> - <code>sm</code> and{' '}
                <code>md</code> derive from it, so a single value change updated every corner in the system at once.
                </p>
            <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden">
                <thead className="bg-fleet-panel">
                    <tr>
                        <th className="text-left p-2">Token</th>
                        <th className="text-left p-2">Value</th>
                        <th className="text-left p-2">Approximate Pixels</th>
                        <th className="text-left p-2">Usage</th>
                    </tr>
                </thead>
                <tbody className="text-fleet-text">
                    {RADIUS.map((r) => (
                        <tr key={r.name} className="border-t border-fleet-border">
                            <td className="p-2 font-mono text-xs">{r.name}</td>
                            <td className="p-2 font-mono text-xs">{r.value}</td>
                            <td className="p-2 font-mono text-xs">{r.px}</td>
                            <td className="p-2 text-xs text-fleet-secondary">{r.usage}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/*SHADOW*/}
        <div className="mb-8">
            <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Shadow</h3>
            <p className="text-xs text-fleet-secondary mb-2">
                Two elevation levels, applied by role: <code>shadow-sm</code> for cards and dashboard tiles, <code>shadow-lg</code> for modals and anything that needs to visually sit above the page.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="bg-white rounded-lg p-4 shadow-sm text-center text-xs text-fleet-secondary">shadow-sm</div>
                <div className="bg-white rounded-lg p-4 shadow-lg text-center text-xs text-fleet-secondary">shadow-lg</div>
            </div>

            <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden">
                <thead className="bg-fleet-panel">
                    <tr>
                        <th className="text-left p-2">Token</th>
                        <th className="text-left p-2">Usage</th>
                    </tr>
                </thead>

                <tbody className="text-fleet-text">
                    {SHADOWS.map((s) => (
                        <tr key={s.name} className="border-t border-fleet-border">
                            <td className="p-2 font-mono text-xs">{s.name}</td>
                            <td className="p-2 text-xs text-fleet-secondary">{s.usage}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/*MOTION*/}
        <div className="mb-8">
            <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Motion</h3>
            <div className="mb-3 bg-fleet-panel rounded-lg p-4">
                <p className="text-xs text-fleet-text">
                    <strong>100ms</strong> is the standard duration for micro-interactions like states, hover, toggles and small transitions. <strong>200ms</strong> is used for larger movements like panel expansion, sidebar collapse. A decided two-value scale,
                    rather than wider range to keep the feeling deliberate instead of all over the place.
                </p>
            </div>

            <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden">
                <thead className="bg-fleet-panel">
                    <tr>
                        <th className="text-left p-2">Duration</th>
                        <th className="text-left p-2">Usage</th>
                    </tr>
                </thead>

                <tbody className="text-fleet-text">
                    {DURATIONS.map((d) => (
                        <tr key={d.ms} className="border-t border-fleet-border">
                            <td className="p-2 font-mono text-xs">{d.ms}</td>
                            <td className="p-2 text-xs text-fleet-secondary">{d.note}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/*BREAKPOINTS*/}
        <div>
            <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Breakpoints</h3>
            <p className="text-xs text-fleet-secondary mb-2">
                Desktop is the primary target. We understand fleet managers work from a workstation monitoring live vehicle data, so the layout was designed and tested there first. The breakpoint scale below still governs how that layout adapts to smaller viewports to allow the interface to reflow rather than breaking outside the desktop context.
            </p>
            <table className="w-full text-sm border-fleet-border rounded-lg overflow-hidden">
                <thead className="bg-fleet-panel">
                    <tr>
                        <th className="text-left p-2">Token</th>
                        <th className="text-left p-2">Min Width</th>
                    </tr>
                </thead>
                <tbody className="text-fleet-text">
                    {BREAKPOINTS.map((b) => (
                        <tr key={b.name} className="border-t border-fleet-border">
                            <td className="p-2 font-mono text-xs">{b.name}</td>
                            <td className="p-2 font-mono text-xs">{b.px}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
     </div>

    )
}