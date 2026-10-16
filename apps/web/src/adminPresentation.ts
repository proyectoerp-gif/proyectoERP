// Presentation only. Backend authorization remains the source of access decisions.
export function usesAdminPresentation(permissions: readonly string[]) {
  return permissions.includes('usuarios.editar') && permissions.includes('roles.editar');
}
export function metricPresentation(key: string, value: number) {
  const count = key === 'employees' || key === 'inventory';
  return { value: value.toLocaleString('es-MX', {minimumFractionDigits:count?0:2,maximumFractionDigits:count?0:2}),
    unit: key==='employees'?'Personas activas':key==='inventory'?'Productos del catálogo':'Importe acumulado · moneda no informada' };
}
export function statusTone(status: string): 'success'|'warning'|'danger'|'neutral' {
  if(['ACTIVE','PAGADA','RECIBIDA','PAID','ISSUED','EMITIDA','WON','CLOSED_WON','DELIVERED','resolved','completed'].includes(status))return 'success';
  if(['CANCELADA','CANCELLED','INACTIVE','LOST','CLOSED_LOST','cancelled'].includes(status))return 'danger';
  if(['PENDIENTE','APROBADA','PENDING','DRAFT','BORRADOR','OPEN','open','in_progress','IN_TRANSIT'].includes(status))return 'warning';
  return 'neutral';
}
