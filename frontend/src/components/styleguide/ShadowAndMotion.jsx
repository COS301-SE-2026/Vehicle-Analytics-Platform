import { SHADOWS, DURATIONS} from "./DesignTokens"

export default function ShadowAndMotion(){
    return (
        <div>
            <h2 className="font-display font-bold text-2xl text-fleet-text mb-2">
                Shadow and Motion
            </h2>
            <p className="text-fleet-secondary">
                This is a closer look at the shadow and motion tokens defined in Design Tokens with the addition of live previews and usage rules.
            </p>
            {/*SHADOW*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Shadow</h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-white rounded-lg p-6 shadow-sm text-center text-xs text-fleet-secondary">shadow-sm</div>
                    <div className="bg-white rounded-lg p-6 shadow-lg text-center text-xs text-fleet-secondary">shadow-lg</div>
                </div>
                <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden mb-2">
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
                <p className="text-xs text-fleet-secondary">
                    Never stack shadow-sm and shadow-lg on the same element. Never use shadow on
                    buttons, hover state is a fill colour change, not elevation.
                </p>
            </div>

            {/*MOTION*/}
            <div>
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Motion</h3>
                <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden mb-2">
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
                <p className="text-xs text-fleet-secondary">
                    Only opacity and transform are animated to avoid layout thrash.
                </p>
            </div>
        </div>
    )
}