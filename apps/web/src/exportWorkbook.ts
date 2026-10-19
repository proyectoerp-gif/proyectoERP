import { utils } from 'xlsx';
import type { ExportDocument } from './exportDocument';

export function documentWorkbook(document: ExportDocument) {
  const workbook = utils.book_new();
  const sheet = utils.aoa_to_sheet([document.columns, ...document.rows]);
  sheet['!cols'] = document.columns.map((_, index) => ({ wch: index === 0 ? 45 : 26 }));
  for (let row = 0; row < document.rows.length; row++) for (let col = 0; col < document.columns.length; col++) {
    const cell = sheet[utils.encode_cell({ r: row + 1, c: col })];
    if (cell?.t === 'n') cell.z = /^(precio|costo|importe|subtotal|total|saldo|monto)/i.test(document.columns[col]) ? '#,##0.00' : '#,##0.######';
  }
  sheet['!autofilter'] = { ref: sheet['!ref'] ?? 'A1' };
  utils.book_append_sheet(workbook, sheet, 'Datos');
  utils.book_append_sheet(workbook, utils.aoa_to_sheet([
    ['Documento', document.title], ['Empresa', document.company],
    ['Sucursal', document.branch ?? 'Catálogo de empresa'], ['Descripción', document.note],
    ['Registros', document.rows.length], ['Generado UTC', new Date().toISOString()]
  ]), 'Información');
  return workbook;
}
