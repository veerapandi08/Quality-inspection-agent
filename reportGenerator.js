const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// ---------- Excel export ----------
async function buildExcelBuffer(inspections) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Quality Inspection Agent';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Inspections');
    sheet.columns = [
        { header: 'ID', key: 'id', width: 18 },
        { header: 'Product Line', key: 'productLine', width: 16 },
        { header: 'Item', key: 'itemName', width: 20 },
        { header: 'Batch Number', key: 'batchNumber', width: 16 },
        { header: 'Category', key: 'category', width: 16 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Defect Count', key: 'defectCount', width: 14 },
        { header: 'Severities', key: 'severities', width: 20 },
        { header: 'Inspector', key: 'inspectorName', width: 18 },
        { header: 'Notes', key: 'notes', width: 30 },
        { header: 'Created At', key: 'createdAt', width: 22 }
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3A5F' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    inspections.forEach(i => {
        const row = sheet.addRow({
            id: i.id,
            productLine: i.productLine,
            itemName: i.itemName,
            batchNumber: i.batchNumber,
            category: i.category || '-',
            status: (i.status || '').toUpperCase(),
            defectCount: (i.defects || []).length,
            severities: (i.defects || []).map(d => d.severity).join(', ') || '-',
            inspectorName: i.inspectorName,
            notes: i.notes || '',
            createdAt: new Date(i.createdAt).toLocaleString()
        });
        const statusColors = { pass: 'FFD6F5DA', fail: 'FFFAD6D6', pending: 'FFFFF3CD' };
        const color = statusColors[i.status] || 'FFFFFFFF';
        row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    });

    sheet.autoFilter = { from: 'A1', to: 'K1' };

    // Summary sheet
    const summary = workbook.addWorksheet('Summary');
    const total = inspections.length;
    const passed = inspections.filter(i => i.status === 'pass').length;
    const failed = inspections.filter(i => i.status === 'fail').length;
    const pending = inspections.filter(i => i.status === 'pending').length;
    const totalDefects = inspections.reduce((s, i) => s + (i.defects || []).length, 0);

    summary.columns = [{ key: 'metric', width: 28 }, { key: 'value', width: 18 }];
    summary.addRow({ metric: 'Total Inspections', value: total });
    summary.addRow({ metric: 'Passed', value: passed });
    summary.addRow({ metric: 'Failed', value: failed });
    summary.addRow({ metric: 'Pending', value: pending });
    summary.addRow({ metric: 'Pass Rate', value: total ? Math.round((passed / total) * 100) + '%' : '0%' });
    summary.addRow({ metric: 'Total Defects Logged', value: totalDefects });
    summary.getColumn('metric').font = { bold: true };

    return workbook.xlsx.writeBuffer();
}

// ---------- PDF export ----------
function buildPdfBuffer(inspections, summaryStats) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            const chunks = [];
            doc.on('data', c => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            // Header
            doc.fontSize(20).fillColor('#1f3a5f').text('Quality Inspection Report', { align: 'center' });
            doc.moveDown(0.3);
            doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
            doc.moveDown(1);

            // Summary box
            if (summaryStats) {
                doc.fontSize(13).fillColor('#111').text('Summary', { underline: true });
                doc.moveDown(0.3);
                doc.fontSize(10).fillColor('#333');
                doc.text(`Total Inspections: ${summaryStats.total}    Passed: ${summaryStats.passed}    Failed: ${summaryStats.failed}    Pending: ${summaryStats.pending}`);
                doc.text(`Pass Rate: ${summaryStats.passRate}%    Total Defects: ${summaryStats.totalDefects}`);
                doc.moveDown(1);
            }

            doc.fontSize(13).fillColor('#111').text('Inspection Records', { underline: true });
            doc.moveDown(0.5);

            inspections.forEach((ins, idx) => {
                if (doc.y > 700) doc.addPage();
                const statusColor = ins.status === 'pass' ? '#1e7e34' : ins.status === 'fail' ? '#c0392b' : '#b8860b';
                doc.fontSize(11).fillColor('#000').text(`${idx + 1}. ${ins.itemName}  (${ins.id})`, { continued: false });
                doc.fontSize(9).fillColor('#444')
                    .text(`Line: ${ins.productLine}   Batch: ${ins.batchNumber}   Category: ${ins.category || '-'}   Inspector: ${ins.inspectorName}`);
                doc.fillColor(statusColor).text(`Status: ${(ins.status || '').toUpperCase()}`);
                if ((ins.defects || []).length) {
                    doc.fillColor('#444').text(`Defects (${ins.defects.length}):`);
                    ins.defects.forEach(d => {
                        doc.fillColor('#666').text(`  • [${d.severity}] ${d.description}`, { indent: 10 });
                    });
                }
                if (ins.notes) doc.fillColor('#666').text(`Notes: ${ins.notes}`);
                doc.moveDown(0.6);
                doc.strokeColor('#ddd').moveTo(40, doc.y).lineTo(555, doc.y).stroke();
                doc.moveDown(0.6);
            });

            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = { buildExcelBuffer, buildPdfBuffer };
