import { hasModulePermission } from '../../../shared/constants/modulePermissions';

export type Page = 'dashboard' | 'sales' | 'inventory' | 'purchases' | 'customers' | 'suppliers' | 'products' | 'finance' | 'reports' | 'audit' | 'employees' | 'notifications' | 'departments' | 'users' | 'projects' | 'production' | 'invoices' | 'crm' | 'shipments' | 'maintenance' | 'quality' | 'assets' | 'tickets' | 'risks' | 'compliance' | 'roles' | 'organization';
export type NavigationGroup = { id: string; label: string; icon: string; pages: Page[] };
export const navigationGroups: NavigationGroup[] = [
  { id: 'home', label: 'Inicio', icon: 'home', pages: ['dashboard', 'notifications'] },
  { id: 'commercial', label: 'Ventas y clientes', icon: 'sales', pages: ['sales', 'customers', 'crm', 'invoices'] },
  { id: 'support', label: 'Solicitudes de ayuda', icon: 'support', pages: ['tickets'] },
  { id: 'purchasing', label: 'Compras', icon: 'purchases', pages: ['purchases', 'suppliers'] },
  { id: 'inventory', label: 'Productos e inventario', icon: 'inventory', pages: ['products', 'inventory'] },
  { id: 'finance', label: 'Caja e informes', icon: 'finance', pages: ['finance', 'reports'] },
  { id: 'team', label: 'Equipo y empresa', icon: 'team', pages: ['employees', 'departments', 'organization', 'users', 'roles'] },
  { id: 'operations', label: 'Operación y control', icon: 'operations', pages: ['projects', 'production', 'shipments', 'maintenance', 'assets', 'quality', 'risks', 'compliance', 'audit'] }
];
export const pageInfo: Record<Page, { label: string; description: string; tip: string }> = {
  dashboard: { label: 'Inicio', description: 'Tu punto de partida para el trabajo de hoy.', tip: 'Elige una tarea frecuente o consulta el resumen de tu empresa.' },
  notifications: { label: 'Avisos', description: 'Revisa los mensajes y novedades de tu cuenta.', tip: 'Abre cada aviso para conocer los detalles.' },
  sales: { label: 'Ventas', description: 'Registra lo que vendes y lleva el seguimiento de cada operación.', tip: 'Primero crea la venta. Después usa «Cobrar y entregar» para registrar el dinero y descontar las existencias.' },
  customers: { label: 'Clientes', description: 'Los datos de las personas y empresas a las que vendes.', tip: 'Registra un cliente antes de crear su primera venta.' },
  crm: { label: 'Oportunidades', description: 'Organiza posibles ventas y su seguimiento.', tip: 'Aquí puedes registrar una oportunidad antes de convertirla en una venta.' },
  invoices: { label: 'Documentos de venta', description: 'Prepara y consulta los borradores de facturación.', tip: 'Los documentos de esta pantalla son borradores; no son comprobantes fiscales emitidos.' },
  purchases: { label: 'Órdenes de compra', description: 'Organiza los productos que compras a tus proveedores.', tip: 'Crea la compra, apruébala y usa «Recibir y pagar» para registrar existencias y dinero juntos.' },
  suppliers: { label: 'Proveedores', description: 'Las personas y empresas que abastecen tu negocio.', tip: 'Registra un proveedor antes de crear una orden de compra.' },
  products: { label: 'Productos y categorías', description: 'Organiza lo que vendes o utilizas en tu negocio.', tip: 'Crea una categoría y después agrega tus productos. Las cantidades disponibles se consultan en Existencias.' },
  inventory: { label: 'Existencias y almacenes', description: 'Consulta cantidades, almacenes y movimientos de productos.', tip: 'Usa movimientos manuales para ajustes. Para una venta o compra utiliza su liquidación, así caja e inventario quedan registrados juntos.' },
  finance: { label: 'Caja y cuentas', description: 'Lleva el control de las entradas y salidas de dinero.', tip: 'Selecciona una cuenta antes de registrar un movimiento de caja.' },
  reports: { label: 'Informes', description: 'Consulta y descarga información para revisar tu operación.', tip: 'Selecciona un periodo cuando necesites un informe de fechas específicas.' },
  employees: { label: 'Personal', description: 'Los colaboradores de tu sucursal y sus datos de trabajo.', tip: 'Cada colaborador puede asociarse con un departamento y una cuenta del sistema.' },
  departments: { label: 'Departamentos', description: 'Organiza las áreas en las que trabaja tu personal.', tip: 'Usa nombres sencillos como Ventas, Almacén o Administración.' },
  organization: { label: 'Empresa y sucursales', description: 'Consulta y administra los datos de tu empresa.', tip: 'Comprueba que la sucursal de tu sesión corresponde a la que quieres administrar.' },
  users: { label: 'Accesos al sistema', description: 'Administra quién puede iniciar sesión en el ERP.', tip: 'Asigna a cada persona solo los permisos que necesita para su trabajo.' },
  roles: { label: 'Roles y permisos', description: 'Define lo que puede hacer cada tipo de usuario.', tip: 'Un rol reúne permisos. Por ejemplo, puedes crear un rol para vendedores o encargados de almacén.' },
  projects: { label: 'Proyectos', description: 'Organiza proyectos y da seguimiento a su avance.', tip: 'Empieza por un nombre claro, fechas y responsables.' },
  production: { label: 'Producción', description: 'Registra las órdenes de producción y los productos terminados.', tip: 'Revisa los materiales y las cantidades antes de completar una orden.' },
  shipments: { label: 'Entregas', description: 'Lleva el seguimiento de los envíos y entregas.', tip: 'Actualiza el estado de cada envío cuando avance su entrega.' },
  maintenance: { label: 'Mantenimiento', description: 'Organiza el cuidado y las reparaciones de tus equipos.', tip: 'Registra el equipo, el trabajo necesario y el responsable.' },
  assets: { label: 'Equipos y activos', description: 'Administra los equipos y otros activos del negocio.', tip: 'Usa un nombre y un código que permitan identificar cada equipo.' },
  quality: { label: 'Calidad', description: 'Registra inspecciones y revisa sus resultados.', tip: 'Describe qué revisaste y el resultado de la inspección.' },
  tickets: { label: 'Solicitudes de ayuda', description: 'Organiza las consultas de clientes y las solicitudes de tu sucursal.', tip: 'Revisa el contexto de cada solicitud y actualiza su estado para dar seguimiento.' },
  risks: { label: 'Riesgos', description: 'Identifica situaciones que pueden afectar tu operación.', tip: 'Registra el riesgo y las medidas que tomarás para reducirlo.' },
  compliance: { label: 'Obligaciones', description: 'Lleva el seguimiento de obligaciones y controles.', tip: 'Asigna responsables y revisa el estado de cada obligación.' },
  audit: { label: 'Historial de actividad', description: 'Consulta quién realizó cambios y cuándo.', tip: 'Utiliza el historial para revisar una operación o entender un cambio.' }
};
export function visibleNavigation(permissions: readonly string[]) {
  return navigationGroups.map(group => ({ ...group, pages: group.pages.filter(page => hasModulePermission(permissions, page)) })).filter(group => group.pages.length > 0);
}
export function searchPages(permissions: readonly string[], query: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const needle = normalize(query.trim());
  if (!needle) return [];
  const aliases: Partial<Record<Page, string>> = { employees: 'empleados recursos humanos', users: 'usuarios cuentas', crm: 'crm prospectos', invoices: 'facturas facturacion', inventory: 'inventario stock almacen bodegas', finance: 'finanzas dinero', reports: 'reportes analitica', tickets: 'tickets soporte', compliance: 'cumplimiento', audit: 'auditoria', shipments: 'logistica envios', assets: 'activos equipos' };
  return visibleNavigation(permissions).flatMap(group => group.pages.map(page => ({ page, group: group.label, ...pageInfo[page] }))).filter(item => normalize(item.label + ' ' + item.description + ' ' + item.group + ' ' + item.tip + ' ' + (aliases[item.page] ?? '')).includes(needle));
}
