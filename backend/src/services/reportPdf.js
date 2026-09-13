'use strict';

const PDFDocument = require('pdfkit');

const PAGE = { size: 'A4', margin: 45 };

const HEADLINE_METRICS = [
    'safetyScore',
    'totalEvents',
    'harshBrakes',
    'harshAccelerations',
    'harshCornering',
    'crashes',
    'totalDistanceKm',
    'avgEfficiencyKmPerL',
];
const VEHICLE_COLUMNS = [
    { key: 'vehicleId', label: 'Vehicle', width: 62, align: 'left' },
    { key: 'safetyScore', label: 'Score', width: 42, align: 'right' },
    { key: 'classification', label: 'Rating', width: 58, align: 'left' },
    { key: 'totalEvents', label: 'Events', width: 48, align: 'right' },
    { key: 'harshBrakes', label: 'Brake', width: 44, align: 'right' },
    { key: 'harshAccelerations', label: 'Accel', width: 44, align: 'right' },
    { key: 'harshCornering', label: 'Corner', width: 46, align: 'right' },
    { key: 'crashes', label: 'Crash', width: 42, align: 'right' },
    { key: 'overspeedEvents', label: 'Speed', width: 44, align: 'right' },
    { key: 'distanceKm', label: 'Distance', width: 58, align: 'right' },
];



const DIRECTION_LABEL = {
    improved: 'Improved',
    deteriorated: 'Worse',
    increased: 'Up',
    decreased: 'Down',
    stable: 'Stable',
    no_baseline: '-',
    insufficient_baseline: 'Low data',
    unavailable: '-',
};
