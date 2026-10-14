import type { TransactionKind } from './transactionApi';
export function transactionStatusLabel(kind: TransactionKind, status: string) {
  const labels: Record<string, string> = { PENDIENTE: kind === 'sales' ? 'Pendiente de cobro' : 'Pendiente de aprobación', APROBADA: 'Lista para recibir', PAGADA: 'Cobrada y entregada', RECIBIDA: 'Recibida y pagada', CANCELADA: 'Cancelada' };
  return labels[status] ?? status;
}
