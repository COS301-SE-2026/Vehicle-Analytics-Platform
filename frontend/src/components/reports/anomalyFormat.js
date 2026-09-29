function defaultPlaces(n){
    const size = Math.abs(n);
    if (size < 1) return 2;
    if (size < 100) return 1;
    return 0;
}


function formatNumber(value, digits){
    if (value === null || value === undefined) return '-';
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    const places = digits ?? defaultPlaces(n);
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


function capitalise(text){
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}


function joinList(items, conjunction = 'and'){
    const list = (items || []).filter(Boolean);
    if (list.length <= 1) return list.join('');
    return `${list.slice(0, -1).join(', ')} ${conjunction} ${list[list.length - 1]}`;
}


// Header for the value column and tooltip row, e.g. "Rate per 100 km".
function valueLabel(feature){
    if (!feature) return '';
    if (feature.kind === 'rate') return `Rate ${feature.unitLabel || ''}`.trim();
    if (feature.kind === 'speed') return 'Top speed (km/h)';
    if (feature.kind === 'mix') return 'Share of incidents (%)';
    return capitalise(feature.unitLabel);
}


// What the chart panel should say, matching the reference lines actually drawn.
function chartDescription(feature){
    const d = feature?.distribution;
    if (!d) return null;

    const lead = 'Each dot is a vehicle, and its colour shows the result.';
    const isRate = feature.kind === 'rate';
    const hasFlag = Number.isFinite(d.flagLine);
    const hasChance = isRate && Number.isFinite(d.chanceRate);

    if (!hasFlag) {
        const missing = isRate && !hasChance ? 'the flag line and chance limit' : 'the flag line';
        return `${lead} At least half of the vehicles recorded exactly the same value, so ${missing} cannot be drawn.`;
    }

    if (hasChance) {
        return `${lead} A vehicle stands out when it is above the red flag line and above the dotted chance limit. `
            + 'The chance limit is higher on the left, because a few incidents over little driving can be chance.';
    }

    if (isRate) {
        return `${lead} A vehicle stands out when it is above the red flag line and its incident count is unlikely to be chance.`;
    }

    return `${lead} A vehicle stands out when it is above the red flag line.`;
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
    capitalise,
    joinList,
    valueLabel,
    chartDescription,
    toLocalISODate,
    formatDateLabel,
};