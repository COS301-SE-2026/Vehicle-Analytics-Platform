import {useState} from 'react'

const PRIMARY_COLOURS = [
    {name: 'Primary Blue', token: 'fleet-blue', hex: '#14304F', usage: 'Buttons, links, sidebar, active states, primary UI chrome'},
    {name: 'Surface White', token: 'fleet-surface', hex: '#FFFFFF', usage: 'Cards, modals, form panels'},
]

const SEMANTIC_COLOURS =[

    {name: 'Success / Good', token: 'fleet-green', hex: '#4D7C5F', usage: 'Safety scores 80+, "moving/active" status; Never used as UI chrome'},
    {name: 'Alert / Critical', token: 'fleet-alert', hex: '#C0392B', usage: 'Error messages, critical safety scores, destructive actions'},
    {name: 'Warning', token: 'fleet-warning', hex: '#E67E22', usage: 'Mid-range safety scores, caution states'},
    {name: 'Idle', token: 'fleet-idle', hex: '#9E9E9E', usage: 'Offline vehicles, inactive elements, "no data" states'},
]

const NEUTRAL_COLOURS = [
    {name: 'App BacKground', token: 'fleet-bg', hex: '#F4F3EF'},
    {name: 'Panel Background', token: 'fleet-panel', hex: '#EAE9E3'},
    {name: 'Primary Text', token: 'fleet-text', hex: '#2B2D26'},
    {name: 'Secondary Text', token: 'fleet-secondary', hex: '#6B6B63'},
    {name: 'Border', token: 'fleet-border', hex: '#D9D8D2'},
]

function hexToRgb(hex) {
    let r = parseInt(hex.slice(1,3), 16)
    let g = parseInt(hex.slice(3,5), 16)
    let b = parseInt(hex.slice(5,7), 16)

    return `${r}, ${g}, ${b}`
}

function hexToHsl(hex){
    let r = parseInt(hex.slice(1,3), 16) / 255
    let g = parseInt(hex.slice(3,5), 16) / 255
    let b = parseInt(hex.slice(5,7), 16) / 255

    const max = Math.max(r,g,b), min = Math.min(r,g,b)

    let h,s,l = (max+min) / 2

    if(max === min){
        h=s=0
    }else{
        const d = max-min
        s = l > 0.5 ? d / (2-max-min) : d / (max + min)
        switch (max){
            case r:
                h = (g-b) / d + (g<b ? 6 : 0);
                break
            case g:
                h = (b-r) / d + 2;
                break
            default:
                h = (r -g) / d + 4;
        }

        h /= 6
    }

    return `${Math.round(h*360)}, ${Math.round(s*100)}%, ${Math.round(l * 100)}%`
}

function getLuminance(hex){
    const rgb = [0,2,4].map((i)=> parseInt(hex.slice(1 + i, 3+ i), 16) / 255)
    const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function getContrastRatio(hex1, hex2){
    const l1 = getLuminance(hex1)
    const l2 = getLuminance(hex2)

    const lighter = Math.max(l1,l2)
    const darker = Math.min(l1,l2)

    return ((lighter + 0.05) / (darker + 0.05)).toFixed(2)
}

function getWcagLevel(ratio, isLargerText = false) {
    const r = parseFloat(ratio)

    const aaThreshold = isLargerText ? 3 : 4.5
    const aaaThreshold = isLargerText ? 4.5 : 7

        if (r >= aaaThreshold){
            return 'AAA'
        }

        if (r >= aaThreshold){
            return 'AA'
        }

        return 'Fail'
}

const CONTRAST_PAIRS = [
    {fg: '#FFFFFF', bg: '#14304F', label: 'White text on Primary Blue (buttons, nav)'},
    {fg: '#2B2D26', bg: '#F4F3EF', label: 'Primary text on App background'},
    {fg: '#2B2D26', bg: '#FFFFFF', label: 'Primary text on Surface White'},
    {fg: '#FFFFFF', bg: '#C0392B', label: 'White text on Alert (badges, destructive)'},
    {fg: '#4D7C5F', bg: '#FFFFFF', label: 'Green score on Surface White'},
    {fg: '#6B6B63', bg: '#FFFFFF', label: 'Secondary text on Surface White'},
]

function ColourSwatchRow({ name, token, hex, usage }) {
return (
    <tr className="border-t border-fleet-border">
        <td className="p-2">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-fleet-border shrink-0" style={{ backgroundColor: hex}}>
                </div>
                <span className="font-medium text-fleet-text">{name}</span>
            </div>
        </td>
        <td className="p-2 font-mono text-xs text-fleet-secondary">{token}</td>
        <td className="p-2 font-mono text-xs">{hex}</td>
        <td className="p-2 font-mono text-xs">rgb({hexToRgb(hex)})</td>
        <td className="p-2 font-mono text-xs">hsl({hexToHsl(hex)})</td>
        {usage && <td className="p-2 text-xs text-fleet-secondary">{usage}</td>}
    </tr>
    )
}

export default function ColourPalette(){

    return (
        <div>
            <h2 className="font-display font-bold text-2xl text-fleet-text mb-2">Colour Palette</h2>
            <p className="text-fleet-secondary mb-6">
                <strong>Blue is the primary brand colour</strong> - Used for all UI chrome: buttons, links, navigation, active states.
                <strong>Green is reserved for meaning</strong> - it only ever signals  good/safe outcome (high safety scores, active status)
                and is never used as a decorative or brand accent.
            </p>

            <div className="mb-8 flex gap-2 h-12 text-xs font-medium text-white">
                <div className="bg-fleet-bg border border-fleet-border rounded-lg flex items-center justify-center text-fleet-text" style={{ flex: 6}}>60%: Background (fleet-bg)</div>
                <div className="bg-fleet-panel border border-fleet-border rounded-lg flex items-center justify-center text-fleet-text" style={{ flex: 3}}>30%: Surface (fleet-panel/ fleet-white)</div>
                <div className="bg-fleet-blue border border-fleet-border rounded-lg flex items-center justify-center" style={{ flex: 1}}>10%: Accent (fleet-blue)</div>
            </div>

            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Primary: Brand & UI Chrome</h3>
                <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden">
                    <thead className="bg-fleet-panel">
                        <tr>
                            <th className="text-left p-2">Colour</th>
                            <th className="text-left p-2">Token</th>
                            <th className="text-left p-2">HEX</th>
                            <th className="text-left p-2">RGB</th>
                            <th className="text-left p-2">HSL</th>
                            <th className="text-left p-2">Usage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {PRIMARY_COLOURS.map((c) => <ColourSwatchRow key={c.token} {...c} ></ColourSwatchRow>)}
                    </tbody>
                </table>
            </div>

            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Semantic: Status &amp; Meaning</h3>
                <p className="text-xs text-fleet-secondary mb-2">
                    These colours carry meaning and are never used decoratively nor are they a secondary brand colour.
                </p>
                <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden">
                    <thead className="bg-fleet-panel">
                        <tr>
                            <th className="text-left p-2">Colour</th>
                            <th className="text-left p-2">Token</th>
                            <th className="text-left p-2">HEX</th>
                            <th className="text-left p-2">RGB</th>
                            <th className="text-left p-2">HSL</th>
                            <th className="text-left p-2">Usage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SEMANTIC_COLOURS.map((c) => <ColourSwatchRow key={c.token} {...c} ></ColourSwatchRow>)}
                    </tbody>
                </table>
            </div>

            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Neutrals: Background, Text, Border</h3>
                <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden">
                    <thead className="bg-fleet-panel">
                        <tr>
                            <th className="text-left p-2">Colour</th>
                            <th className="text-left p-2">Token</th>
                            <th className="text-left p-2">HEX</th>
                            <th className="text-left p-2">RGB</th>
                            <th className="text-left p-2">HSL</th>
                            <th className="text-left p-2">Usage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {NEUTRAL_COLOURS.map((c) => <ColourSwatchRow key={c.token} {...c} ></ColourSwatchRow>)}
                    </tbody>
                </table>
            </div>

        <div className="mb-8 bg-fleet-panel rounded-lg p-4">
            <h3 className="font-display font-semibold text-sm text-fleet-text mb-1">A note on naming</h3>
            <p className="text-xs text-fleet-secondary">
                Our tokens are currently named by hue (<code>fleet-blue</code>, <code>fleet-green</code>) rather than by role (e.g. <code>fleet-primary-action</code>). This is because
                of our small and fixed palette. our primary colour is blue which sets apart the rest of the colours used for semantics.
            </p>
        </div>

        {/* WCG Contrast checker*/}
        <div>
            <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Contrast Ratios (WCAG 2.2)</h3>
            <p className="text-xs text-fleet-secondary mb-3">
                This is every foreground and background pairing used in the UI, checked against WCAG 2.2 AA
            </p>

            <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden mb-4">
                <thead className="bg-fleet-panel">
                    <tr>
                        <th className="text-left p-2">Pairing</th>
                        <th className="text-left p-2">Preview</th>
                        <th className="text-left p-2">Ratio</th>
                        <th className="text-left p-2">AA (body)</th>
                        <th className="text-left p-2">AA (large)</th>
                    </tr>
                </thead>
                <tbody>
                    {CONTRAST_PAIRS.map((pair) => {
                        const ratio = getContrastRatio(pair.fg, pair.bg)

                        return (
                            <tr key={pair.label} className="border-t border-fleet-border">
                                <td className="p-2 text-xs">{pair.label}</td>
                                <td className="p-2">
                                    <span className="px-2 py-1 rounded text-xs font-medium" style={{ color: pair.fg, backgroundColor: pair.bg }}>
                                        Sample Text
                                    </span>
                                </td>
                                <td className="p-2 font-mono text-xs">{ratio}:1</td>
                                <td className="p-2 text-xs">{getWcagLevel(ratio, false)}</td>
                                <td className="p-2 text-xs">{getWcagLevel(ratio, true)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>

            
        </div>
    )
}