'use strict';

const { Buffer } = require('node:buffer');

let PDFDocument = null;

function loadPdfKit(){
    if (!PDFDocument) {
        PDFDocument = require('pdfkit');
    }
    return PDFDocument;

}


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
    { key: 'vehicleId', label: 'Vehicle', width: 54, align: 'left' },
    { key: 'safetyScore', label: 'Score', width: 38, align: 'right' },
    { key: 'classification', label: 'Rating', width: 54, align: 'left', pad: 8 },
    { key: 'totalEvents', label: 'Events', width: 42, align: 'right' },
    { key: 'harshBrakes', label: 'Brake', width: 38, align: 'right' },
    { key: 'harshAccelerations', label: 'Accel', width: 38, align: 'right' },
    { key: 'harshCornering', label: 'Corner', width: 40, align: 'right' },
    { key: 'crashes', label: 'Crash', width: 36, align: 'right' },
    { key: 'overspeedEvents', label: 'Speed', width: 38, align: 'right' },
    { key: 'idlingEvents', label: 'Idle', width: 36, align: 'right' },
    { key: 'distanceKm', label: 'Distance', width: 58, align: 'right' },
];

const DIRECTION_LABEL = {
    improved: 'Improved',
    deteriorated: 'Worse',
    increased: 'Up',
    decreased: 'Down',
    stable: 'Stable',
    no_baseline: 'No baseline',
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



function withUnit(text, unit){
    return unit ? `${text} ${unit}` : text;
}

function formatPercentChange(percentChange){
    const sign = percentChange > 0 ? '+' : '';
    return `${sign}${percentChange}%`;
}

function scoreColour(score){
    if (score >= 75) return COLOR.green;
    if (score >= 50) return COLOR.amber;
    return COLOR.red;
}

function trendColour(classification){
    if (classification === 'improving') return COLOR.green;
    if (classification === 'deteriorating') return COLOR.red;
    return COLOR.secondary;
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


function coverageNotes(report){
    const c = report.coverage;
    if (!c.hasTelemetry) {
        return [{ colour: COLOR.red, text: 'No telemetry was recorded in this period. Safety figures cannot be calculated.' }];
    }

    const notes = [];
    if (c.eventDataAvailable === false) {
        notes.push({
            colour: COLOR.red,
            text: 'No driving-event data was recorded in this period, so event counts and the safety score are not available.',
        });
    }
    if (report.previousPeriod && c.previousEventDataAvailable === false) {
        notes.push({
            colour: COLOR.amber,
            text: `No driving-event data was recorded in ${report.previousPeriod.label}, `
                + 'so changes in events and the safety score have no baseline.',
        });
    }
    if (report.previousPeriod && !c.baselineSufficient) {
        notes.push({
            colour: COLOR.amber,
            text: 'The comparison period saw too little activity for percentage changes to carry a verdict.',
        });
    }
    return notes;
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

    coverageNotes(report).forEach((note) => {
        doc.moveDown(0.2);
        doc.fillColor(note.colour).text(note.text);
    });

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
                hasValue ? withUnit(formatValue(card.value), card.unit) : 'Not available',
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
                : formatPercentChange(row.percentChange),
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
                colour = scoreColour(raw);
            }
            if (raw === null || raw === undefined) colour = COLOR.secondary;

            doc.fillColor(colour).fontSize(8).font('Helvetica').text(formatValue(raw), x + (col.pad || 0), y, { width: col.width - (col.pad || 0), align: col.align });

            x += col.width;

        });

        doc.y = y + 12.5;
    });
}

function describeChange(item){
    const unit = item.unit && item.unit !== 'events' ? ` ${item.unit}` : '';
    const move = `${formatValue(item.previous)} to ${formatValue(item.current)}${unit}`;
    const pct = item.percentChange === null || item.percentChange === undefined
        ? 'from zero'
        : formatPercentChange(item.percentChange);
    return `${item.label}: ${move} (${pct})`;
}

function describeTrend(item){
    return `${item.label}: ${formatValue(item.first)} to ${formatValue(item.last)} over ${item.weeksWithData} weeks`;
}



function drawInsights(doc, insights){
    if (!insights) return;
    const changes = insights.changes || [];

    const trends = insights.trends || [];

    if (!changes.length && !trends.length) return;

    sectionHeading(doc, 'Key findings');

    const lines = [
        ...changes.map((c) => ({ text: describeChange(c), bad: c.direction === 'deteriorated' })),
        ...trends.map((t) => ({ text: `Trend - ${describeTrend(t)}`, bad: t.direction === 'deteriorating' })),
    ];


    lines.forEach((line) => {
        ensureSpace(doc, 14);
        doc.x = doc.page.margins.left;
        doc.fillColor(line.bad ? COLOR.red : COLOR.green).fontSize(8.5).font('Helvetica-Bold')
            .text(line.bad ? 'Worse  ' : 'Better  ', { continued: true })
            .fillColor(COLOR.text).font('Helvetica')
            .text(line.text);
    });


    doc.moveDown(0.4);

}

// Safety scores have no unit, so show them out of 100 rather than as a bare number.
function rankingValue(entry, ranking){
    if (ranking.metric === 'safetyScore') return `${formatValue(entry.value)} / 100`;
    return withUnit(formatValue(entry.value), ranking.unit);
}

function drawRanking(doc, title, ranking){
    doc.x = doc.page.margins.left;
    if (ranking?.status !== 'ok' || !ranking.entries.length) return;

    ensureSpace(doc, 30 + ranking.entries.length * 12);


    doc.fillColor(COLOR.text).fontSize(9).font('Helvetica-Bold').text(title);


    doc.moveDown(0.2);

    ranking.entries.forEach((entry) => {
        const value = rankingValue(entry, ranking);
        const tied = entry.tied ? '  (tied)' : '';
        doc.fillColor(COLOR.secondary).fontSize(8.5).font('Helvetica')
            .text(`${entry.rank}. ${entry.id}    ${value}${tied}`, { indent: 8 });
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
    ].filter(([, r]) => r?.status === 'ok' && r.entries.length);

    if (!blocks.length) return;

    sectionHeading(doc, 'Rankings');

    blocks.forEach(([title, ranking]) => drawRanking(doc, title, ranking));

}



function drawTrends(doc, trends){
    if (!trends?.metrics) return;

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

        const tone = trendColour(metric.classification);

        doc.fillColor(tone).font('Helvetica-Bold').text(metric.classification, cx, y, { width: 70, align: 'right' });

        doc.y = y + 14;
    });

    const cov = trends.coverage;
    if (cov && (cov.leadInDays > 0 || cov.trailingDays > 0)) {
        doc.x = doc.page.margins.left;
        doc.moveDown(0.3);
        doc.fillColor(COLOR.secondary).fontSize(7.5).font('Helvetica')
            .text(`Only whole Monday-Sunday weeks are trended (${cov.firstDate} to ${cov.lastDate}). `
                + `${cov.leadInDays + cov.trailingDays} day(s) at the start or end of the period ` + 'count in the totals above but not in this table.');
    }

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
    if (!report?.report || !report.period) {
        throw new Error('buildReportPdf requires a report dataset');
    }

    const PdfKit = loadPdfKit();

    return new Promise((resolve, reject) => {
        const doc = new PdfKit({ ...PAGE, bufferPages: true });

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
                ...report.distance.comparison,
                ...report.fuel.comparison,
                ...report.safety.comparison,
            };

            drawHeader(doc, report);
            drawCoverage(doc, report);
            drawSummaryCards(doc, summary);

            drawInsights(doc, report.insights);
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
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/^-|-$/g, '')
        .slice(0, 40) || 'fleet';

    return `vapor-report-${scope}-${report.period.fromDate}-to-${report.period.toDate}.pdf`;
}

module.exports = {
    buildReportPdf,
    reportFilename,
    _formatValue: formatValue,
    _describeChange: describeChange,
    _describeTrend: describeTrend,
    _coverageNotes: coverageNotes,
    _rankingValue: rankingValue,
};