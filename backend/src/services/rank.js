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