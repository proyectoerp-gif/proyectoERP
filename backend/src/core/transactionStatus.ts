export type TransactionStatus = 'PENDIENTE' | 'PAGADA' | 'APROBADA' | 'RECIBIDA' | 'CANCELADA';
export function allowedTransactionTransition(kind: 'sales' | 'purchase-orders', from: TransactionStatus, to: TransactionStatus): boolean {
  // Paid/received states belong exclusively to the atomic settlement service.
  if (kind === 'sales') return from === 'PENDIENTE' && to === 'CANCELADA';
  return (from === 'PENDIENTE' && (to === 'APROBADA' || to === 'CANCELADA')) || (from === 'APROBADA' && to === 'CANCELADA');
}
