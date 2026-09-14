'use strict';

const PDFDocument = require('pdfkit');

const COLOR = {
    text: '#1A1A16',
    secondary: '#6B6B63',
    blue: '#14304F',
    border: '#D9D8D2',
    green: '#2E7D52',
    red: '#C0392B',
    amber: '#B7791F',
};

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

const DIRECTION_COLOR = {
    improved: COLOR.green,
    deteriorated: COLOR.red,
    insufficient_baseline: COLOR.amber,
};



function formatValue(value){
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
        return Number.isInteger(value) ? String(value) : value.toFixed(2);
    }
    return String(value);
}



function contentWidth(doc){
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}



function remaining(doc){
    return doc.page.height - doc.page.margins.bottom - doc.y;
}



function ensureSpace(doc, needed){
    if (remaining(doc) < needed) {
        doc.addPage();
        return true;
    }
    return false;
}



function rule(doc, colour = COLOR.border){
    const y = doc.y;
    doc.save()
        .moveTo(doc.page.margins.left, y)
        .lineTo(doc.page.width - doc.page.margins.right, y)
        .lineWidth(0.5)
        .strokeColor(colour)
        .stroke()
        .restore();
    doc.y = y + 1;
}



function sectionHeading(doc, title){
    ensureSpace(doc, 60);
    doc.moveDown(0.8);
    doc.fillColor(COLOR.secondary).fontSize(8).font('Helvetica-Bold')
        .text(title.toUpperCase(), { characterSpacing: 1.1 });
    doc.moveDown(0.3);
    rule(doc);
    doc.moveDown(0.5);
}


