'use strict';

const { DIRECTION } = require('./compare');
const { TREND } = require('./trend');

const CHANGE_DIRECTIONS = [DIRECTION.DETERIORATED, DIRECTION.IMPROVED];
const TREND_CLASSES = [TREND.DETERIORATING, TREND.IMPROVING];

function magnitude(percent){
    return percent === null || percent === undefined ? Number.POSITIVE_INFINITY : Math.abs(percent);
}

function byImportance(severityOrder, percentKey){
    return (a, b) => {
        const severity = severityOrder.indexOf(a.direction) - severityOrder.indexOf(b.direction);
        if (severity !== 0) return severity;

        const ma = magnitude(a[percentKey]);
        const mb = magnitude(b[percentKey]);
        if (ma !== mb) return mb > ma ? 1 : -1;

        return a.metric.localeCompare(b.metric);
    };
}

function changeFindings(comparison, metrics = null){
    return Object.values(comparison || {})
        .filter((c) => c && CHANGE_DIRECTIONS.includes(c.direction))
        .filter((c) => !metrics || metrics.includes(c.metric))
        .map((c) => ({
            metric: c.metric,
            label: c.label,
            unit: c.unit,
            direction: c.direction,
            current: c.current,
            previous: c.previous,
            absoluteChange: c.absoluteChange,
            percentChange: c.percentChange,
        }))
        .sort(byImportance(CHANGE_DIRECTIONS, 'percentChange'));
}

function trendFindings(trends, metrics = null){
    const series = trends && trends.metrics ? Object.values(trends.metrics) : [];
    return series
        .filter((t) => t && TREND_CLASSES.includes(t.classification))
        .filter((t) => !metrics || metrics.includes(t.metric))
        .map((t) => ({
            metric: t.metric,
            label: t.label,
            unit: t.unit,
            direction: t.classification,
            first: t.first,
            last: t.last,
            weeksWithData: t.weeksWithData,
            modelledChangePct: t.modelledChangePct,
        }))

        .sort(byImportance(TREND_CLASSES, 'modelledChangePct'));

}


function buildInsights({comparison = null, trends = null, metrics = null} = {}){
    const changes = changeFindings(comparison, metrics);
    const trendItems = trendFindings(trends, metrics);

    return {
        changes,
        trends: trendItems,
        deteriorations: changes.filter((c) => c.direction === DIRECTION.DETERIORATED).length,
        improvements: changes.filter((c) => c.direction === DIRECTION.IMPROVED).length,
    };

}

module.exports = { 
    buildInsights,
    _changeFindings: changeFindings,
    _trendFindings: trendFindings,

};

