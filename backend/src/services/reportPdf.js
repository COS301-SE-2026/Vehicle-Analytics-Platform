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


function drawHeader(doc, report){
    const { scope } = report.report;

    doc.fillColor(COLOR.blue).fontSize(18).font('Helvetica-Bold').text('Fleet Performance Report');

    doc.moveDown(0.2);

    doc.fillColor(COLOR.text).fontSize(13).font('Helvetica').text(scope.label);

    doc.moveDown(0.15);
    doc.fillColor(COLOR.secondary).fontSize(9).text(`${report.period.label}   -  ${report.period.fromDate} to ${report.period.toDate}`);

    if (report.previousPeriod) {
        doc.text(`Compared with ${report.previousPeriod.label}`);
    }

    doc.text(`Generated ${new Date(report.report.generatedAt).toLocaleString('en-ZA')}`);

    doc.moveDown(0.6);
    rule(doc, COLOR.blue);
    doc.moveDown(0.4);
}

function drawCoverage(doc, report){
    const c = report.coverage;

    const parts = [
        `${c.vehiclesInScope} vehicles in scope`,
        `${c.activeVehicles} active`,
        `${c.vehiclesWithEvents} reported events`,
        `${c.vehiclesWithFuelData} with fuel data`,
    ];

    doc.fillColor(COLOR.secondary).fontSize(8.5).font('Helvetica')
        .text(parts.join('   -   '));

    if (!c.hasTelemetry) {
        doc.moveDown(0.2);
        doc.fillColor(COLOR.red).text('No telemetry was recorded in this period. Safety figures cannot be calculated.');
    } else if (report.previousPeriod && !c.baselineSufficient) {
        doc.moveDown(0.2);
        doc.fillColor(COLOR.amber).text('The comparison period saw too little activity for percentage changes to carry a verdict.');
    }

    doc.moveDown(0.4);

    
}




function drawSummaryCards(doc, summary){
    const cards = [
        { label: 'Safety score', value: summary.safetyScore, unit: '' },
        { label: 'Total events', value: summary.totalEvents, unit: '' },
        { label: 'Harsh braking', value: summary.harshBrakes, unit: '' },
        { label: 'Harsh acceleration', value: summary.harshAccelerations, unit: '' },
        { label: 'Harsh cornering', value: summary.harshCornering, unit: '' },
        { label: 'Crashes', value: summary.crashes, unit: '' },
        { label: 'Distance', value: summary.totalDistanceKm, unit: 'km' },
        { label: 'Fuel efficiency', value: summary.avgEfficiencyKmPerL, unit: 'km/L' },
    ];

    const perRow = 4;

    const gap = 8;

    const width = (contentWidth(doc) - gap * (perRow - 1)) / perRow;

    const height = 46;

    ensureSpace(doc, height * 2 + gap + 10);

    cards.forEach((card, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = doc.page.margins.left + col * (width + gap);
        const y = doc.y + row * (height + gap);

        doc.save().roundedRect(x, y, width, height, 4).lineWidth(0.5).strokeColor(COLOR.border).stroke().restore();

        doc.fillColor(COLOR.secondary).fontSize(6.5).font('Helvetica-Bold').text(card.label.toUpperCase(), x + 8, y + 8, {
                width: width - 16, characterSpacing: 0.6,
            });

        const hasValue = card.value !== null && card.value !== undefined;


        doc.fillColor(hasValue ? COLOR.text : COLOR.secondary).fontSize(hasValue ? 15 : 9).font(hasValue ? 'Helvetica-Bold' : 'Helvetica')
            .text(
                hasValue ? `${formatValue(card.value)}${card.unit ? ` ${card.unit}` : ''}` : 'Not available',
                x + 8, y + 22, { width: width - 16 },
            );
    });

    doc.y += height * 2 + gap + 6;

}


function drawComparisonTable(doc, comparison){

    const rows = HEADLINE_METRICS.map((key) => comparison[key])
        .filter((c) => c && c.current !== null);


    if (!rows.length) return;

    sectionHeading(doc, 'Change against the previous period');

    const widths = [150, 72, 72, 72, 80];

    const headers = ['Metric', 'This period', 'Previous', 'Change', 'Direction'];

    ensureSpace(doc, 40);

    let x = doc.page.margins.left;
    const headerY = doc.y;
    doc.fillColor(COLOR.secondary).fontSize(7.5).font('Helvetica-Bold');
    headers.forEach((h, i) => {
        doc.text(h, x, headerY, { width: widths[i], align: i === 0 ? 'left' : 'right' });
        x += widths[i];
    });

    doc.y = headerY + 13;

    rule(doc);

    doc.y += 4;

    rows.forEach((row) => {
        ensureSpace(doc, 18);
        const y = doc.y;
        let cx = doc.page.margins.left;

        const cells = [
            row.label,
            formatValue(row.current),
            formatValue(row.previous),
            row.percentChange === null || row.percentChange === undefined
                ? '-'
                : `${row.percentChange > 0 ? '+' : ''}${row.percentChange}%`,
            DIRECTION_LABEL[row.direction] || '-',
        ];

        cells.forEach((cell, i) => {
            const isDirection = i === 4;
            doc.fillColor(isDirection ? (DIRECTION_COLOR[row.direction] || COLOR.secondary) : COLOR.text).fontSize(8.5)
                .font(isDirection ? 'Helvetica-Bold' : 'Helvetica')
                .text(cell, cx, y, { width: widths[i], align: i === 0 ? 'left' : 'right' });

            cx += widths[i];

        });

        doc.y = y + 14;

    });

    doc.moveDown(0.4);
    
}