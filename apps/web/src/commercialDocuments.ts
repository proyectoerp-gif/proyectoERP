import type { ExportDocument } from './exportDocument';
import type { Activity } from './commercialActivityApi';
import type { CommercialReceipt } from './settlementApi';
import type { Transaction, TransactionKind } from './transactionApi';
import { listDocument } from './listDocuments';
export function activityDocument(data: Activity): ExportDocument {
  const labels = { PAYMENT: 'Pago / cobro', REFUND: 'Reembolso / reintegro', DELIVERY: 'Entrega / recepción', RETURN: 'Devolución', TERMS: 'Vencimiento', CANCEL: 'Cancelación' };
  const rows: (string | number)[][] = [
    ...Object.entries({ 'Total original': data.total, 'Valor devuelto': data.returnedValue, 'Total tras devoluciones': data.netTotal, 'Pagado neto': data.netPaid, 'Saldo pendiente': data.outstanding, 'Reembolso disponible': data.refundable }).map(([label, value]) => ['Resumen', label, '', '', value, data.sourceId]),
    ...data.items.flatMap(item => [['Artículo solicitado', item.productName, '', item.quantity, item.total, item.sku], ['Entregado / recibido', item.productName, '', item.delivered, '', item.sku], ['Devuelto', item.productName, '', item.returned, '', item.sku]]),
    ...data.events.flatMap(event => [[labels[event.action], event.note, event.date, '', event.amount ?? '', event.requestId], ...(event.items ?? []).map(item => [labels[event.action], data.items.find(line => line.productId === item.productId)?.productName ?? item.productId, event.date, item.quantity, '', item.movementId])])
  ];
  return listDocument(data.kind === 'sales' ? 'Seguimiento de venta' : 'Seguimiento de compra', ['Sección', 'Concepto / producto', 'Fecha', 'Cantidad', 'Importe', 'Referencia'], rows, undefined, undefined, undefined, `Documento: ${data.sourceId}. Vencimiento: ${data.dueDate ?? 'Sin definir'}. ${data.canceled ? 'Cancelado. ' : ''}Moneda no informada. Las filas de resumen y detalle no deben sumarse entre sí.`);
}
export function receiptDocument(data: CommercialReceipt, row: Transaction, kind: TransactionKind, company: string, branch: string, names: Record<string, string>): ExportDocument {
  return listDocument(kind === 'sales' ? 'Comprobante de venta' : 'Comprobante de compra', ['Producto', 'SKU', 'Cantidad', 'Precio unitario', 'Subtotal', 'Movimiento de inventario'], (data.items ?? [{ productName: names['product:' + row.productId] ?? row.productId, sku: '', quantity: row.quantity, unitPrice: row.unitPrice, total: row.total, stockMovementId: data.stockMovementId }]).map(item => [item.productName, item.sku, item.quantity, item.unitPrice, item.total, item.stockMovementId]), undefined, company, branch, `Documento: ${row.id}. Comprobante: ${data.id}. Fecha: ${data.date}. Total: ${data.total.toFixed(2)}; moneda no informada. Movimiento de caja: ${data.cashMovementId}. Documento informativo, no es un comprobante fiscal.`);
}
