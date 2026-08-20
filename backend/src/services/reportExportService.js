const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// SRS §17: "Reports should be exportable to PDF, Excel and CSV where
// supported." CSV already existed (reportService.js); this adds the other
// two binary formats behind the same rows-in shape.

async function toXlsx(rows, sheetName = 'Report') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31)); // Excel's 31-char sheet name limit

  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    sheet.columns = headers.map(key => ({ header: key, key, width: Math.max(key.length + 2, 14) }));
    sheet.getRow(1).font = { bold: true };
    rows.forEach(row => sheet.addRow(row));
  }

  return workbook.xlsx.writeBuffer();
}

function toPdf(rows, title) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text(title, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#555').text(`Generated ${new Date().toLocaleString()}`, { align: 'left' });
    doc.moveDown(1);

    if (rows.length === 0) {
      doc.fontSize(11).fillColor('#000').text('No data for the selected range.');
      doc.end();
      return;
    }

    const headers = Object.keys(rows[0]);
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = pageWidth / headers.length;
    const rowHeight = 18;

    const drawHeaderRow = (y) => {
      doc.fontSize(9).fillColor('#fff');
      doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill('#334155');
      doc.fillColor('#fff');
      headers.forEach((h, i) => {
        doc.text(String(h), doc.page.margins.left + i * colWidth + 4, y + 5, { width: colWidth - 8, ellipsis: true });
      });
    };

    let y = doc.y;
    drawHeaderRow(y);
    y += rowHeight;

    doc.fontSize(8.5).fillColor('#000');
    rows.forEach((row, idx) => {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeaderRow(y);
        y += rowHeight;
        doc.fontSize(8.5).fillColor('#000');
      }
      if (idx % 2 === 1) {
        doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill('#f1f5f9');
        doc.fillColor('#000');
      }
      headers.forEach((h, i) => {
        const value = row[h];
        const text = value === null || value === undefined ? '' : String(value);
        doc.text(text, doc.page.margins.left + i * colWidth + 4, y + 5, { width: colWidth - 8, ellipsis: true });
      });
      y += rowHeight;
    });

    doc.end();
  });
}

module.exports = { toXlsx, toPdf };
