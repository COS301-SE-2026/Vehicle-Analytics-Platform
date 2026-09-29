function formatNumber(value, digits){
    if (value === null || value === undefined) return '-';
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    const places = digits ?? (Math.abs(n) < 1 ? 2 : Math.abs(n) < 100 ? 1 : 0);
    return n.toLocaleString('en-US', { maximumFractionDigits: places });
}


function formatChance(pValue){
    if (pValue === null || pValue === undefined || !Number.isFinite(Number(pValue))) return null;
    if (pValue < 1e-6) return 'under 1 in 1,000,000';
    return `about 1 in ${Math.round(1 / pValue).toLocaleString('en-US')}`;
}


function behaviourName(feature){
    return String(feature?.label || '').replace(/ rate$/, '');
}


function plural(n, word){
    return `${n} ${word}${n === 1 ? '' : 's'}`;
}


function toLocalISODate(date){
    if (!date) return undefined;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return undefined;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
}


function formatDateLabel(date){
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
}


export {
    formatNumber,
    formatChance,
    behaviourName,
    plural,
    toLocalISODate,
    formatDateLabel,
};