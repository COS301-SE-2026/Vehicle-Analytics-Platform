'use strict';

const { buildInsights } = require('../src/services/insights');

const { compareSummaries } = require('../src/services/compare');


const current = { harshBrakes: 2, crashes: 1, totalDistanceKm: 140, utilisationPct: 30, safetyScore: 92, overspeedEvents: 10, idlingEvents: 5 };

const previous = { harshBrakes: 4, crashes: 0, totalDistanceKm: 80, utilisationPct: 20, safetyScore: 92, overspeedEvents: 5, idlingEvents: 5 };

describe('buildInsights() - period changes', () => {
    const comparison = compareSummaries(current, previous);

    test('only clear improvements and deteriorations become findings', () => {
        const { changes } = buildInsights({ comparison });
        const metrics = changes.map((c) => c.metric); expect(metrics).not.toContain('totalDistanceKm'); // neutral metric
        expect(metrics).not.toContain('safetyScore'); // stable
        expect(metrics).not.toContain('idlingEvents'); // unchanged
    });


    test('deteriorations come first, larger changes first, a rise from zero first of all', () => {
        const { changes } = buildInsights({ comparison });
        expect(changes.map((c) => [c.metric, c.direction])).toEqual([
            ['crashes', 'deteriorated'],
            ['overspeedEvents', 'deteriorated'],
            ['harshBrakes', 'improved'],
            ['utilisationPct', 'improved'],
        ]);
    });


    test('carries the calculated values through unchanged', () => {
        const { changes } = buildInsights({ comparison });
        expect(changes.find((c) => c.metric === 'harshBrakes')).toEqual({
            metric: 'harshBrakes', label: 'Harsh braking', unit: 'events', direction: 'improved',
            current: 2, previous: 4, absoluteChange: -2, percentChange: -50,
        });
    });

    test('counts improvements and deteriorations', () => {
        expect(buildInsights({ comparison })).toMatchObject({ deteriorations: 2, improvements: 2 });
    });

    test('a whitelist removes metrics the caller does not want as findings', () => {
        const { changes } = buildInsights({ comparison, metrics: ['harshBrakes'] });
        expect(changes.map((c) => c.metric)).toEqual(['harshBrakes']);
    });

    test('ties in magnitude are ordered by metric name for a stable output', () => {
        const cmp = compareSummaries({ harshBrakes: 2, harshCornering: 2 }, { harshBrakes: 4, harshCornering: 4 });
        expect(buildInsights({ comparison: cmp }).changes.map((c) => c.metric)).toEqual(['harshBrakes', 'harshCornering']);
    });

    test('insufficient baselines never produce findings', () => {
        const cmp = compareSummaries(current, previous, { baselineSufficient: false });
        expect(buildInsights({ comparison: cmp }).changes).toEqual([]);
    });



});


describe('buildInsights() - trends', () => {
    const trends = {
        metrics: {
            harshBrakes: { metric: 'harshBrakes', label: 'Harsh braking', unit: 'events', classification: 'improving', first: 4, last: 0, weeksWithData: 3, modelledChangePct: -200 },
            overspeedEvents: { metric: 'overspeedEvents', label: 'Overspeed events', unit: 'events', classification: 'deteriorating', first: 1, last: 9, weeksWithData: 3, modelledChangePct: 150 },
            utilisationPct: { metric: 'utilisationPct', label: 'Utilisation', unit: '%', classification: 'volatile', first: 7, last: 7, weeksWithData: 3, modelledChangePct: 0 },
            totalDistanceKm: { metric: 'totalDistanceKm', label: 'Total distance', unit: 'km', classification: 'decreasing', first: 80, last: 10, weeksWithData: 3, modelledChangePct: -80 },
        },
    };

    test('only improving and deteriorating trends are findings, deteriorating first', () => {
        const result = buildInsights({ trends });
        expect(result.trends.map((t) => [t.metric, t.direction])).toEqual([
            ['overspeedEvents', 'deteriorating'],
            ['harshBrakes', 'improving'],
        ]);
        expect(result.trends[1]).toMatchObject({ first: 4, last: 0, weeksWithData: 3 });
    });

    test('no trends and no comparison yields an empty result', () => {
        expect(buildInsights()).toEqual({ changes: [], trends: [], deteriorations: 0, improvements: 0 });
        expect(buildInsights({ trends: null, comparison: null }).trends).toEqual([]);
    });
});
