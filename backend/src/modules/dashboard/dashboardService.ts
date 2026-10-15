import { getSaleModel } from '../ventas/models/Sale.js';
import { getPurchaseOrderModel } from '../compras/models/PurchaseOrder.js';
import { getCashMovementModel } from '../finanzas/models/FinanceModels.js';
import { getEmployeeModel } from '../recursos-humanos/models/Employee.js';
import { getProductModel } from '../productos/models/Product.js';

export type DashboardSummary = {
  companyId: string;
  branchId: string;
  metrics: { sales: number | null; purchases: number | null; cash: number | null; employees: number | null; inventory: number | null };
  lastUpdated: string;
};

export async function getDashboardSummary(companyId: string, branchId: string, permissions: readonly string[] = []): Promise<DashboardSummary> {
  const scope = { companyId, branchId };
  const [sales, purchases, cash, employees, inventory] = await Promise.all([
    permissions.includes('ventas.ver') ? getSaleModel().aggregate<{ value: number }>([
      { $match: { ...scope, status: { $ne: 'CANCELADA' } } },
      { $group: { _id: null, value: { $sum: '$total' } } }
    ]).exec() : null,
    permissions.includes('compras.ver') ? getPurchaseOrderModel().aggregate<{ value: number }>([
      { $match: { ...scope, status: { $ne: 'CANCELADA' } } },
      { $group: { _id: null, value: { $sum: '$total' } } }
    ]).exec() : null,
    permissions.includes('finanzas.ver') ? getCashMovementModel().aggregate<{ value: number }>([
      { $match: { ...scope, type: { $in: ['INFLOW', 'OUTFLOW'] } } },
      { $group: { _id: null, value: { $sum: { $cond: [{ $eq: ['$type', 'INFLOW'] }, '$amount', { $multiply: ['$amount', -1] }] } } } }
    ]).exec() : null,
    permissions.includes('rrhh.ver') ? getEmployeeModel().countDocuments({ ...scope, status: 'ACTIVE' }).exec() : null,
    // Catalog products are company-wide; this is not a stock balance.
    permissions.includes('productos.ver') ? getProductModel().countDocuments({ companyId, status: 'ACTIVE' }).exec() : null
  ]);
  return { companyId, branchId, metrics: {
    sales: sales === null ? null : sales[0]?.value ?? 0, purchases: purchases === null ? null : purchases[0]?.value ?? 0,
    cash: cash === null ? null : cash[0]?.value ?? 0, employees, inventory
  }, lastUpdated: new Date().toISOString() };
}

export async function listDashboardWidgets(companyId: string, branchId: string, permissions: readonly string[] = []) {
  const { metrics } = await getDashboardSummary(companyId, branchId, permissions);
  return [
    { id: 'widget-sales', name: 'ventas', title: 'Ventas no canceladas', value: metrics.sales },
    { id: 'widget-finance', name: 'finanzas', title: 'Flujo neto registrado', value: metrics.cash },
    { id: 'widget-inventory', name: 'inventario', title: 'Productos activos del catálogo', value: metrics.inventory }
  ].filter(widget => widget.value !== null);
}
