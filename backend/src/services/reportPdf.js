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
    { key: 'classification', label: 'Rating', width: 58, align: 'left', pad: 10 },
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
    doc.x = doc.page.margins.left;
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

    const startY = doc.y;

    cards.forEach((card, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = doc.page.margins.left + col * (width + gap);
        const y = startY + row * (height + gap);

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

    doc.x = doc.page.margins.left;
    doc.y = startY + height * 2 + gap + 6;

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



function drawVehicleTable(doc, vehicles){
    sectionHeading(doc, `Vehicle detail (${vehicles.length})`);

    if (!vehicles.length) {
        doc.fillColor(COLOR.secondary).fontSize(9).font('Helvetica')
            .text('No vehicle recorded events in this period.');
        return;
    }

    const sorted = [...vehicles].sort((a, b) => {
        if (a.safetyScore === null || a.safetyScore === undefined) return 1;
        if (b.safetyScore === null || b.safetyScore === undefined) return -1;
        return a.safetyScore - b.safetyScore;
    });

    function drawColumnHeaders(){
        const y = doc.y;
        let x = doc.page.margins.left;
        doc.fillColor(COLOR.secondary).fontSize(7).font('Helvetica-Bold');
        VEHICLE_COLUMNS.forEach((col) => {
            doc.text(col.label, x + (col.pad || 0), y, { width: col.width - (col.pad || 0), align: col.align });
            x += col.width;
        });
        doc.y = y + 11;
        rule(doc);
        doc.y += 3;
    }

    drawColumnHeaders();

    sorted.forEach((v) => {
        if (ensureSpace(doc, 16)) drawColumnHeaders();

        const y = doc.y;
        let x = doc.page.margins.left;

        VEHICLE_COLUMNS.forEach((col) => {
            const raw = v[col.key];
            let colour = COLOR.text;

            if (col.key === 'crashes' && raw > 0) colour = COLOR.red;
            if (col.key === 'safetyScore' && typeof raw === 'number') {
                colour = raw >= 75 ? COLOR.green : raw >= 50 ? COLOR.amber : COLOR.red;
            }
            if (raw === null || raw === undefined) colour = COLOR.secondary;

            doc.fillColor(colour).fontSize(8).font('Helvetica').text(formatValue(raw), x + (col.pad || 0), y, { width: col.width - (col.pad || 0), align: col.align });

            x += col.width;

        });

        doc.y = y + 12.5;
    });
}

function drawRanking(doc, title, ranking){
    doc.x = doc.page.margins.left;
    if (!ranking || ranking.status !== 'ok' || !ranking.entries.length) return;

    ensureSpace(doc, 30 + ranking.entries.length * 12);


    doc.fillColor(COLOR.text).fontSize(9).font('Helvetica-Bold').text(title);


    doc.moveDown(0.2);

    ranking.entries.forEach((entry) => {
        doc.fillColor(COLOR.secondary).fontSize(8.5).font('Helvetica')
            .text(
                `${entry.rank}. ${entry.id}    ${formatValue(entry.value)}`
                + `${ranking.unit ? ` ${ranking.unit}` : ''}${entry.tied ? '  (tied)' : ''}`,
                { indent: 8 },
            );
    });

    doc.moveDown(0.5);


}

function drawRankings(doc, rankings){

    if (!rankings) return;

    const blocks = [
        ['Vehicles requiring attention', rankings.vehiclesRequiringAttention],
        ['Safest vehicles', rankings.safestVehicles],
        ['Most events', rankings.mostEvents],
        ['Highest utilisation', rankings.highestUtilisation],
        ['Best fuel efficiency', rankings.bestFuelEfficiency],
    ].filter(([, r]) => r && r.status === 'ok' && r.entries.length);

    if (!blocks.length) return;

    sectionHeading(doc, 'Rankings');

    blocks.forEach(([title, ranking]) => drawRanking(doc, title, ranking));

}



function drawTrends(doc, trends){
    if (!trends || !trends.metrics) return;

    const metrics = Object.values(trends.metrics).filter((m) => m.classification !== 'insufficient_data');



    if (!metrics.length) return;

    sectionHeading(doc, 'Week-by-week trend');


    const labelWidth = 130;

    const weekWidth = Math.min(62,(contentWidth(doc) - labelWidth - 70) / Math.max(1, trends.weeks.length),);

    ensureSpace(doc, 40);

    let x = doc.page.margins.left;

    const headerY = doc.y;

    doc.fillColor(COLOR.secondary).fontSize(7.5).font('Helvetica-Bold').text('Metric', x, headerY, { width: labelWidth });

    x += labelWidth;

    trends.weeks.forEach((week) => {
        doc.text(week.label, x, headerY, { width: weekWidth, align: 'right' });
        x += weekWidth;
    });
    doc.text('Trend', x, headerY, { width: 70, align: 'right' });

    doc.y = headerY + 13;
    rule(doc);
    doc.y += 4;

    metrics.forEach((metric) => {
        ensureSpace(doc, 18);
        const y = doc.y;
        let cx = doc.page.margins.left;

        doc.fillColor(COLOR.text).fontSize(8.5).font('Helvetica').text(metric.label, cx, y, { width: labelWidth });
        cx += labelWidth;

        metric.points.forEach((point) => {
            doc.fillColor(point.value === null ? COLOR.secondary : COLOR.text).text(formatValue(point.value), cx, y, { width: weekWidth, align: 'right' });
            cx += weekWidth;
        });

        const tone = metric.classification === 'improving' ? COLOR.green
            : metric.classification === 'deteriorating' ? COLOR.red
                : COLOR.secondary;

        doc.fillColor(tone).font('Helvetica-Bold').text(metric.classification, cx, y, { width: 70, align: 'right' });

        doc.y = y + 14;
    });

}


function drawPageNumbers(doc){
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);

        const bottom = doc.page.margins.bottom;

        doc.page.margins.bottom = 0;

        doc.fillColor(COLOR.secondary).fontSize(7).font('Helvetica').text(
            `V.A.P.O.R Fleet Performance Report    Page ${i - range.start + 1} of ${range.count}`,
            doc.page.margins.left,
            doc.page.height - 32, 
            { width: contentWidth(doc), align: 'center' },
        );

        doc.page.margins.bottom = bottom;
        
    }
}

function buildReportPdf(report){
    if (!report || !report.report || !report.period) {
        throw new Error('buildReportPdf requires a report dataset');
    }

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ ...PAGE, bufferPages: true });

        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        try {
            const summary = {
                ...report.distance.summary,
                ...report.fuel.summary,
                ...report.safety.summary,
            };

            const comparison = {
                ...(report.distance.comparison || {}),
                ...(report.fuel.comparison || {}),
                ...(report.safety.comparison || {}),
            };

            drawHeader(doc, report);
            drawCoverage(doc, report);
            drawSummaryCards(doc, summary);

            if (report.previousPeriod) drawComparisonTable(doc, comparison);

            drawRankings(doc, report.rankings);
            drawTrends(doc, report.trends);
            drawVehicleTable(doc, report.rankings?.entities || report.safety.vehicles || []);

            drawPageNumbers(doc);

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

function reportFilename(report){
    const scope = String(report.report.scope.label)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'fleet';

    return `vapor-report-${scope}-${report.period.fromDate}-to-${report.period.toDate}.pdf`;
}

module.exports = {
    buildReportPdf,
    reportFilename,
    _formatValue: formatValue,
};