'use strict';
const { definitionFor, round } = require('./compare');

const ORDER = { ASC: 'asc', DESC: 'desc' };

const STATUS = {
    OK: 'ok',
    INSUFFICIENT_DATA: 'insufficient_data',
    NOT_RANKABLE: 'not_rankable',
};

const MIN_ENTITIES_FOR_RANKING = 2;

const DEFAULT_LIMIT = 5;

function isNumber(value){
    return typeof value === 'number' && Number.isFinite(value);
}

function bestFirstOrder(higherIsBetter){
    if (higherIsBetter === null || higherIsBetter === undefined) return null;
    return higherIsBetter ? ORDER.DESC : ORDER.ASC;
}

function invert(order){
    return order === ORDER.ASC ? ORDER.DESC : ORDER.ASC;
}

function partition(entities, metric, idField) {
    const rankable = [];
    const unavailable = [];

    entities.forEach((entity, position) => {
        const id = entity && entity[idField] !== undefined && entity[idField] !== null ? String(entity[idField]) : null;

        if (id === null) return;

        const value = entity ? entity[metric] : undefined;

        if (isNumber(value)) {
            rankable.push({ id, value, position });
        } else {
            unavailable.push({ id, value: null });
        }
    });

    return { rankable, unavailable };
}

function assignRanks(sorted, precision) {
    let previousValue = null;
    let previousRank = 0;

    return sorted.map((item, index) => {
        const value = round(item.value, precision);

        const tiedWithPrevious = previousValue !== null && value === previousValue;

        const rank = tiedWithPrevious ? previousRank : index + 1;

        previousValue = value;
        previousRank = rank;

        return { id: item.id, rank, value, tied: false };}).map((entry, index, all) => ({
            ...entry,
            tied: all.some((other, i) => i !== index && other.rank === entry.rank),

    }));

}


function rankBy(entities, metric, options = {}){
    if (!Array.isArray(entities)) {
        throw new Error('rankBy requires an array of entities');
    }

    if (typeof metric !== 'string' || !metric) {
        throw new Error('rankBy requires a metric name');
    }


    const {
        idField = 'vehicleId',
        limit,
        minEntities = 1,
        precision = 2,
    } = options;

    const { label, unit, higherIsBetter } = definitionFor(metric);

    const order = options.order || bestFirstOrder(higherIsBetter);

    const base = {
        metric,
        label,
        unit,
        higherIsBetter,
        order: order || null,
        status: STATUS.OK,
        entries: [],
        unavailable: [],
        rankedCount: 0,
        totalCount: entities.length,
    };


    if (!order) {
        return { ...base, status: STATUS.NOT_RANKABLE };
    }

    const { rankable, unavailable } = partition(entities, metric, idField);

    if (rankable.length < minEntities) {
        return {
            ...base,
            status: STATUS.INSUFFICIENT_DATA,
            unavailable,
            rankedCount: rankable.length,
        };
    }

    const sorted = [...rankable].sort((a, b) => {
        const diff = order === ORDER.DESC ? b.value - a.value : a.value - b.value;
        if (diff !== 0) return diff;
        return a.id.localeCompare(b.id);
    });

    const entries = assignRanks(sorted, precision);


    return {
        ...base,
        entries: isNumber(limit) ? entries.slice(0, limit) : entries,
        unavailable,
        rankedCount: rankable.length,
    };

}


function topPerformers(entities, metric, options = {}){
    const { higherIsBetter } = definitionFor(metric);
    const order = bestFirstOrder(higherIsBetter);

    if (!order) {
        return rankBy(entities, metric, { ...options, order: null });
    }

    return rankBy(entities, metric, {
        limit: DEFAULT_LIMIT,
        minEntities: MIN_ENTITIES_FOR_RANKING,
        ...options,
        order,
    });

}

function requiresAttention(entities, metric, options = {}){
    const { higherIsBetter } = definitionFor(metric);
    const best = bestFirstOrder(higherIsBetter);

    if (!best) {
        return rankBy(entities, metric, { ...options, order: null });
    }

    return rankBy(entities, metric, {
        limit: DEFAULT_LIMIT,
        minEntities: MIN_ENTITIES_FOR_RANKING,
        ...options,
        order: invert(best),
    });
}

function mergeEntities(sources, idField = 'vehicleId') {
    if (!Array.isArray(sources)) {
        throw new Error('mergeEntities requires an array of entity arrays');
    }

    const merged = new Map();

    sources.forEach((source) => {
        if (!Array.isArray(source)) return;
        source.forEach((entity) => {
            if (!entity || entity[idField] === undefined || entity[idField] === null) return;
            const id = String(entity[idField]);
            merged.set(id, { ...(merged.get(id) || { [idField]: id }), ...entity, [idField]: id });
        });
    });

    return [...merged.values()].sort((a, b) => String(a[idField]).localeCompare(String(b[idField])));
    
}

module.exports = {
    rankBy,
    topPerformers,
    requiresAttention,
    mergeEntities,
    ORDER,
    STATUS,
    MIN_ENTITIES_FOR_RANKING,
    DEFAULT_LIMIT,
};