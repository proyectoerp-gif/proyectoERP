import { hasModulePermission } from '../../../shared/constants/modulePermissions';
import { pageInfo, type Page } from './navigation';
import { WorkspaceIcon } from './WorkspaceIcon';
export function GettingStarted({ permissions, name, onNavigate }: { permissions: string[]; name: string; onNavigate: (page: Page) => void }) {
  const tasks: { page: Page; title: string; description: string; icon: string }[] = [
    { page: 'sales', title: 'Registrar una venta', description: 'Crea una venta y sigue su cobro y entrega.', icon: 'sales' },
    { page: 'inventory', title: 'Consultar existencias', description: 'Revisa cuántos productos tienes disponibles.', icon: 'inventory' },
    { page: 'purchases', title: 'Preparar una compra', description: 'Organiza lo que necesitas de tus proveedores.', icon: 'purchases' },
    { page: 'finance', title: 'Revisar la caja', description: 'Consulta las entradas y salidas de dinero.', icon: 'finance' }
  ];
  const steps: { page: Page; title: string; description: string }[] = [
    { page: 'products', title: 'Organiza tus productos', description: 'Crea categorías y agrega tus productos.' },
    { page: 'inventory', title: 'Prepara el inventario', description: 'Crea un almacén y registra tus existencias iniciales.' },
    { page: 'customers', title: 'Agrega tus contactos', description: 'Registra a tus clientes y proveedores.' },
    { page: 'sales', title: 'Registra una operación', description: 'Crea la venta y luego confirma su cobro y entrega.' }
  ];
  const visibleTasks = tasks.filter(task => hasModulePermission(permissions, task.page)).map(task => {
    if (task.page === 'sales' && !hasModulePermission(permissions, 'sales', 'crear')) return { ...task, title: 'Consultar ventas', description: 'Revisa las ventas y el estado de cada operación.' };
    if (task.page === 'purchases' && !hasModulePermission(permissions, 'purchases', 'crear')) return { ...task, title: 'Consultar compras', description: 'Revisa tus compras y su seguimiento.' };
    return task;
  });
  return <>
    <section className="welcome-card" aria-labelledby="welcome-title"><div><span className="eyebrow">TU ESPACIO DE TRABAJO</span><h2 id="welcome-title">Hola, {name.split(' ')[0] || name}.</h2><p>Todo lo que necesitas para llevar tu negocio, paso a paso.</p></div><div className="welcome-decoration" aria-hidden="true"><WorkspaceIcon name="inventory" size={68}/></div></section>
    {visibleTasks.length > 0 && <section className="quick-actions" aria-labelledby="quick-actions-title"><div className="section-heading"><h2 id="quick-actions-title">¿Qué quieres hacer?</h2><span>Accesos frecuentes</span></div><div className="task-grid">{visibleTasks.map(task => <button className="task-card" key={task.page} onClick={() => onNavigate(task.page)}><span className="task-icon"><WorkspaceIcon name={task.icon}/></span><strong>{task.title}</strong><span>{task.description}</span><span className="task-arrow"><WorkspaceIcon name="arrow" size={18}/></span></button>)}</div></section>}
    <details className="getting-started"><summary><WorkspaceIcon name="help"/><span>¿Es tu primera vez? Sigue estos pasos</span><span className="disclosure-marker" aria-hidden="true">+</span></summary><p>No tienes que usar todas las áreas. Empieza por las tareas que necesita tu negocio.</p><ol>{steps.filter(step => hasModulePermission(permissions, step.page)).map(step => <li key={step.page}><div><strong>{step.title}</strong><p>{step.description}</p></div><button onClick={() => onNavigate(step.page)}>Ir a {pageInfo[step.page].label}<WorkspaceIcon name="arrow" size={16}/></button></li>)}</ol><p>Esta es una guía; los pasos no se marcan como completados automáticamente.</p></details>
  </>;
}
