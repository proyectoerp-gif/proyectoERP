const domains: Record<string, string> = { usuarios: 'Accesos al sistema', roles: 'Roles y permisos', auth: 'Mi cuenta', rrhh: 'Personal', departamentos: 'Departamentos', empresas: 'Empresa y sucursales', clientes: 'Clientes', proveedores: 'Proveedores', productos: 'Productos', inventario: 'Inventario', ventas: 'Ventas', compras: 'Compras', finanzas: 'Caja y cuentas', facturacion: 'Documentos de venta', proyectos: 'Proyectos', crm: 'Oportunidades', logistica: 'Entregas', notificaciones: 'Avisos', auditoria: 'Historial de actividad', reportes: 'Informes', integraciones: 'Integraciones', ia: 'Análisis de IA', dashboard: 'Resumen del negocio', configuracion: 'Configuración', produccion: 'Producción', mantenimiento: 'Mantenimiento', calidad: 'Calidad', activos: 'Equipos y activos', soporte: 'Solicitudes de ayuda', riesgo: 'Riesgos', cumplimiento: 'Obligaciones', observabilidad: 'Estado del sistema', despliegue: 'Publicación del sistema' };
const actions: Record<string, string> = { ver: 'Consultar', crear: 'Crear registros', editar: 'Administrar', eliminar: 'Eliminar registros', profile: 'Consultar perfil', login: 'Iniciar sesión', configurar: 'Configurar', consultar: 'Consultar', ejecutar: 'Ejecutar', autorizar: 'Autorizar' };
export function permissionLabel(permission: string) {
  const [domain, action] = permission.split('.');
  if (!Object.prototype.hasOwnProperty.call(domains, domain)) return permission;
  if (action === 'liquidar' && domain === 'ventas') return 'Ventas · Cobrar y entregar';
  if (action === 'liquidar' && domain === 'compras') return 'Compras · Recibir y pagar';
  return Object.prototype.hasOwnProperty.call(actions, action) ? domains[domain] + ' · ' + actions[action] : permission;
}
