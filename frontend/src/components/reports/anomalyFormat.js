export function formatNumber(value, digits){
    if (value === null || value === undefined) return '-'
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'
    const places = digits ?? (Math.abs(n) < 1 ? 2 : Math.abs(n) < 100 ? 1 : 0)
    return n.toLocaleString('en-US', { maximumFractionDigits: places })
}


export function formatChance(pValue){
    if (pValue === null || pValue === undefined || !Number.isFinite(Number(pValue))) return null
    if (pValue < 1e-6) return 'under 1 in 1,000,000'
    return `about 1 in ${Math.round(1 / pValue).toLocaleString('en-US')}`

}


export function behaviourName(feature){
    return String(feature?.label || '').replace(/ rate$/, '')
}

export function plural(n, word){
    return `${n} ${word}${n === 1 ? '' : 's'}`

}