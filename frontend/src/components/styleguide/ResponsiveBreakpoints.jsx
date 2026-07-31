const GRID_USAGE =[
    {cols: 'grid-cols-1', note: 'Base layout: The smallest breakpoint and up'},
    {cols: 'grid-cols-2', note: 'Paired Content, form fields'},
    {cols: 'grid-cols-3', note: 'KPI rows, logo/colour swatches'},
    {cols: 'grid-cols-4', note: 'Dense grids: shadow scale, icon sets'},
]

const SPACING = [
    {token: '1', px: '4px'},
    {token: '2', px: '8px'},
    {token: '3', px: '12px'},
    {token: '4', px: '16px'},
    {token: '6', px: '24px'},
    {token: '8', px: '32px'},
]

export default function ResponsiveBreakpoints(){
    return (
        <div>
            <h2 className="font-display font-bold text-2xl text-fleet-text mb-2">
                Layout &amp; Spacing
            </h2>
            <p className="text-fleet-secondary mb-8">
                How space is structured across the interface and how the grid changes shape as the viewport changes.

                This is structured from the 4px base unit up. Breakpoint token values are documented under Design Tokens.
            </p>

            {/*GRID*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Grid System</h3>
                <div className="mb-3 bg-fleet-panel rounded-lg p-4">
                    <p className="text-xs text-fleet-text">
                        Layouts use a flexible column system instead of a fixed 12 column grid. Each section takes the column count its content actually needs, from 1 to 4. The unprefixed class applies at the smallest breakpoint and up.
                        A <code>md:</code>or <code> lg:</code> prefix overrides it once the viewport crosses that width. That way a section adapts from a single column on a narrow window to multiple columns once there's room.
                    </p>
                </div>
                <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden">
                    <thead className="bg-fleet-panel">
                        <tr>
                            <th className="text-left p-2">Class</th>
                            <th className="text-left p-2">Usage</th>
                        </tr>
                    </thead>
                    <tbody className="text-fleet-text">
                        {GRID_USAGE.map((g) => (
                            <tr key={g.cols} className="border-t border-fleet-border">
                                <td className="p-2 font-mono text-xs">{g.cols}</td>
                                <td className="p-2 text-xs text-fleet-secondary">{g.note}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* SPACING*/}
            <div>
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Spacing Scale</h3>
                <p className="text-xs text-fleet-secondary mb-3">
                    Every spacing value in the system is a multiple of the 4px base unit.
                </p>
                <div className="flex items-end gap-3 mb-3">
                    {SPACING.map((s) => (
                        <div key={s.token} className="flex flex-col items-center gap-1">
                            <div className="bg-fleet-blue" style={{width: s.px, height: s.px}}/>
                            <span className="text-[10px] font-mono text-fleet-secondary">{s.px}</span>
                        </div>
                    ))}
                </div>

                <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden">
                    <thead className="bg-fleet-panel">
                        <tr>
                            <th className="text-left p-2">Token</th>
                            <th className="text-left p-2">Value</th>
                        </tr>
                    </thead>
                    <tbody className="text-fleet-text">
                        {SPACING.map((s) => (
                            <tr key={s.token} className="border-t border-fleet-border">
                                <td className="p-2 font-mono text-xs">p-{s.token} / gap-{s.token} / m-{s.token}</td>
                                <td className="p-2 font-mono text-xs">{s.px}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}