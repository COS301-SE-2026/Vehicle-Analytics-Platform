const DISPLAY_STACK = "'DM Sans', sans-serif"
const BODY_STACK = "'Inter', sans-serif"
const MONO_STACK = "'JetBrains Mono', monospace"

const TYPE_SCALE =[
    {name:'Display XL', class: 'font-display font-bold text-4xl', family: 'DM Sans', size: '36px', leading: '40px', weight: '700', usage: 'Page-level headers'},
    {name:'Display L', class: 'font-display font-semibold text-2xl', family: 'DM Sans', size: '24px', leading: '32px', weight: '600', usage: 'Section headers'},
    {name:'Display M', class: 'font-display font-semibold text-lg', family: 'DM Sans', size: '18px', leading: '28px', weight: '600', usage: 'Subsection headers, card titles'},
    {name:'Body L', class: 'font-sans font-bold text-lg', family: 'Inter', size: '16px', leading: '24px', weight: '700', usage: 'Primary reading text'},
    {name:'Body M', class: 'font-sans text-sm', family: 'Inter', size: '14px', leading: '20px', weight: '400', usage: 'Table cells, secondary UI copy'},
    {name:'Body S', class: 'font-sans text-xs', family: 'Inter', size: '12px', leading: '16px', weight: '400', usage: 'Captions, helper/usage notes, timestamps'},
    {name:'Mono', class: 'font-mono text-xs', family: 'Inter', size: '12px', leading: '16px', weight: '400', usage: 'Tokens'},
]

function familyStack(family) {
    if(family === 'DM Sans'){
        return DISPLAY_STACK
    }

    if (family === 'Inter'){
        return BODY_STACK
    }

    return MONO_STACK
}

function TypeRow({ name, class: cls, family, size, weight, usage }) {
    return (
        <tr className="border-t border border-fleet-border align-top">
            <td className="p-2 w-1/3">
            <div className={`${cls} text-fleet-text`} style={{fontFamily: familyStack(family)}}>
                The quick fleet moves
            </div>
            </td>
            <td className="p-2 font-mono text-xs text-fleet-secondary">{name}</td>
            <td className="p-2 font-mono text-xs">{family}</td>
            <td className="p-2 font-mono text-xs">{size}</td>
            <td className="p-2 font-mono text-xs">{weight}</td>
            <td className="p-2 font-mono text-xs text-fleet-secondary">{usage}</td>
        </tr>
    )
}

export default function Typography(){
    return (
        <div>
            <h2 className="font-display font-bold text-2xl text-fleet-text mb-2">
                Typography
            </h2>
            <p className="text-fleet-secondary mb-b">
                <strong>DM Sans</strong> is used for diaplay text. This includes any functions as a heading or label of a section. <strong>Inter</strong> is used for body text; Anything meant to be read at length: paragraphs, table content, form fields. <strong>JetBrains Mono</strong> is reserved for tokens, hex/RGB/HSL values, and anything code-like.
            </p>

            {/*SCALE TABLE*/}
            <div className="mb-8">
                <h3 className="font-display font-semibold text-lg text-fleet-text mb-2">Type Scale</h3>
                <table className="w-full text-sm border border-fleet-border rounded-lg overflow-hidden">
                    <thead className="bg-fleet-panel">
                        <tr>
                            <th className="text-left p-2">Preview</th>
                            <th className="text-left p-2">Name</th>
                            <th className="text-left p-2">Family</th>
                            <th className="text-left p-2">Size / Length-height</th>
                            <th className="text-left p-2">Weight</th>
                            <th className="text-left p-2">Usage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {TYPE_SCALE.map((t) => <TypeRow key={t.name} {...t} />)}
                    </tbody>
                </table>
            </div>


            <div className="bg-fleet-panel rounded-lg p-4">
                <h3 className="font-display font-semibold text-sm text-fleet-text mb-1">Class reference</h3>
                <p className="text-xs text-fleet-secondary">
                    <code>font-display</code> / <code>font-sans</code> / <code>font-mono</code> set the <em>typeface</em>.{' '}
                    <code>font-fleet-*</code> classes set <em>colour</em>. <code>text-xs</code> through <code>text-4xl</code> set{' '}
                    <em>size</em>. These are independent axes. They always compose a heading as{' '}
                    <code>font-display font-semibold text-2xl text-fleet-text</code>, not one or two of these alone.
                </p>
            </div>
        </div>
    )
}