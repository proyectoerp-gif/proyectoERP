import { AppError } from '../errors/AppError.js';
import type { ReportType } from '../modules/reportes/models/Report.js';
const sources: Record<ReportType, string> = { sales: 'ventas.ver', 'cash-flow': 'finanzas.ver', financial: 'finanzas.ver', inventory: 'inventario.ver' };
export function allowedReportTypes(permissions: readonly string[]): ReportType[] {
  return (Object.keys(sources) as ReportType[]).filter(type => permissions.includes(sources[type]));
}
export function assertReportAccess(type: ReportType, permissions: readonly string[]): void {
  if (!allowedReportTypes(permissions).includes(type)) throw new AppError({ code: 'FORBIDDEN', message: 'Report source access denied',
    friendlyMessage: 'No tienes permiso para consultar el área de este reporte.', statusCode: 403 });
}
