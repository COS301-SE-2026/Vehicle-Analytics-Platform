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