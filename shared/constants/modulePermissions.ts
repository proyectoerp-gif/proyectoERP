// Shared by web/mobile navigation. Backend authorizes each HTTP operation separately.
export const modulePermissionDomains: Record<string, string> = {
  dashboard: 'dashboard', reports: 'reportes', customers: 'clientes', suppliers: 'proveedores', products: 'productos',
  categories: 'productos', inventory: 'inventario', stock: 'inventario', sales: 'ventas', purchases: 'compras',
  'purchase-orders': 'compras', finance: 'finanzas', employees: 'rrhh', organization: 'empresas', roles: 'roles',
  compliance: 'cumplimiento', risks: 'riesgo', tickets: 'soporte', assets: 'activos', quality: 'calidad',
  maintenance: 'mantenimiento', shipments: 'logistica', crm: 'crm', invoices: 'facturacion', production: 'produccion',
  projects: 'proyectos', users: 'usuarios', departments: 'departamentos', notifications: 'notificaciones', audit: 'auditoria'
};
export function hasModulePermission(permissions: readonly string[], module: string | null, action = 'ver'): boolean {
  const domain = module && modulePermissionDomains[module];
  return !!domain && permissions.includes(domain + '.' + action);
}
export function canSettleCommercial(permissions: readonly string[], kind: 'sales' | 'purchase-orders'): boolean {
  return hasModulePermission(permissions, kind, 'liquidar') && permissions.includes('inventario.editar') && permissions.includes('finanzas.editar');
}
