import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { ExportDocument } from './exportDocument';

export function documentPdf(document: ExportDocument): jsPDF {
  const pdf = new jsPDF({ orientation: document.columns.length > 6 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4', compress: true });
  const width = pdf.internal.pageSize.getWidth();
  pdf.setProperties({ title: document.title, subject: document.note, creator: 'ProyectoChatbot ERP' });
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17); pdf.setTextColor(33, 62, 53);
  const titleLines = pdf.splitTextToSize(document.title, width - 30);
  pdf.text(titleLines, 15, 19);
  let y = 23 + titleLines.length * 7;
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(65, 78, 68);
  const description = [document.company, document.branch ? 'Sucursal: ' + document.branch : '', document.note].filter(Boolean).join('\n');
  const lines = pdf.splitTextToSize(description, width - 30);
  pdf.text(lines, 15, y); y += lines.length * 4.2 + 7;
  autoTable(pdf, {
    startY: y, head: [document.columns], body: document.rows.map(row => row.map((value, index) => typeof value === 'number' ? value.toLocaleString('es-MX', /^(precio|costo|importe|subtotal|total|saldo|monto)/i.test(document.columns[index] ?? '') ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 6 }) : value)),
    margin: { top: 16, right: 15, bottom: 18, left: 15 }, showHead: 'everyPage', rowPageBreak: 'avoid', theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [33, 62, 53], textColor: 255 }, alternateRowStyles: { fillColor: [244, 247, 240] }
  });
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page); pdf.setFontSize(8); pdf.setTextColor(100);
    pdf.text('ProyectoChatbot · Documento informativo', 15, pdf.internal.pageSize.getHeight() - 9);
    pdf.text(`${page} / ${pages}`, width - 15, pdf.internal.pageSize.getHeight() - 9, { align: 'right' });
  }
  return pdf;
}
