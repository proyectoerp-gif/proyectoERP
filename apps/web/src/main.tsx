import './workspace.css';
import { EnvironmentNotice } from './EnvironmentNotice';
import { WorkspaceNavigation, WorkspaceTabs } from './WorkspaceNavigation';
import { GettingStarted } from './GettingStarted';
import { WorkspaceIcon } from './WorkspaceIcon';
import { AccessibleDialog } from './AccessibleDialog';
import { accentForeground } from './themeContrast';
import { pageInfo, visibleNavigation, type Page } from './navigation';
import { hasModulePermission, canSettleCommercial } from '../../../shared/constants/modulePermissions';
import {OrganizationPanel} from './OrganizationPanel';
import {RolesPanel} from './RolesPanel';
import {CompliancePanel} from './CompliancePanel';
import {RisksPanel} from './RisksPanel';
import {TicketsPanel} from './TicketsPanel';
import {AssetsPanel} from './AssetsPanel';
import {QualityPanel} from './QualityPanel';
import {MaintenancePanel} from './MaintenancePanel';
import {ShipmentsPanel} from './ShipmentsPanel';
import {OpportunitiesPanel} from './OpportunitiesPanel';
import {InvoicesPanel} from './InvoicesPanel';
import {ProductionPanel} from './ProductionPanel';
import {ProjectsPanel} from './ProjectsPanel';
import {UsersPanel} from './UsersPanel';
import {DepartmentsPanel} from './DepartmentsPanel';
import {NotificationsPanel} from './NotificationsPanel';
import {EmployeePanel} from './EmployeePanel';
import {AuditPanel} from './AuditPanel';
import {InventoryAlerts} from './InventoryAlerts';
import {PeriodReport} from './PeriodReport';
import {SummaryPanel} from './SummaryPanel';
import React, { useEffect, useRef, useState, type FormEvent } from 'react';
import ReactDOM from 'react-dom/client';
import { CatalogDirectory } from './CatalogDirectory';
import { TransactionDirectory } from './TransactionDirectory';
import { TransactionCreate } from './TransactionCreate';
import { FinancePanel } from './FinancePanel';
import { StockPanel } from './StockPanel';

type SessionUser = {
  id: string;
  email: string;
  name: string;
  companyId: string;
  branchId: string;
  roleId: string;
  permissions: string[];
};

type LoginResponse = { ok?: boolean; data?: { token?: string; user?: SessionUser }; error?: { message?: string } };
type Theme = { mode: 'dark' | 'light'; accent: string; font: 'modern' | 'rounded' | 'mono' };
type TenantLabels = { company?: string; branch?: string };

const themeStorageKey = 'nucleo-erp-theme-v2';
const fontStacks: Record<Theme['font'], string> = {
  modern: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  rounded: 'Aptos, "Segoe UI", ui-sans-serif, system-ui, sans-serif',
  mono: '"Cascadia Code", "SFMono-Regular", Consolas, monospace'
};
const defaultTheme: Theme = { mode: 'light', accent: '#14786b', font: 'modern' };
const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');


function loadTheme(): Theme {
  try {
    const value = JSON.parse(localStorage.getItem(themeStorageKey) || 'null') as Partial<Theme> | null;
    if (value && (value.mode === 'dark' || value.mode === 'light') && typeof value.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.accent) && (value.font === 'modern' || value.font === 'rounded' || value.font === 'mono')) {
      return { mode: value.mode, accent: value.accent, font: value.font };
    }
  } catch { /* Use the default visual profile. */ }
  return defaultTheme;
}

function App() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [session, setSession] = useState<{ token: string; user: SessionUser } | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [tenantLabels, setTenantLabels] = useState<TenantLabels>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [transactionRevision, setTransactionRevision] = useState(0);

  useEffect(() => {
    try { localStorage.setItem(themeStorageKey, JSON.stringify(theme)); } catch { /* Visual preferences are optional. */ }
  }, [theme]);

  useEffect(() => {
    if (!session) { setTenantLabels({}); return; }
    const controller = new AbortController();
    const headers = { Authorization: 'Bearer ' + session.token };
    void Promise.all([
      fetch(`${apiBaseUrl}/companies`, { headers, signal: controller.signal }).then((response) => response.ok ? response.json() : null),
      fetch(`${apiBaseUrl}/branches`, { headers, signal: controller.signal }).then((response) => response.ok ? response.json() : null)
    ]).then(([companyResult, branchResult]) => {
      const company = Array.isArray(companyResult?.data) ? companyResult.data.find((item: { id?: string }) => item.id === session.user.companyId) : undefined;
      const branch = Array.isArray(branchResult?.data) ? branchResult.data.find((item: { id?: string }) => item.id === session.user.branchId) : undefined;
      setTenantLabels({ company: company?.name, branch: branch?.name });
    }).catch(() => undefined);
    return () => controller.abort();
  }, [session]);



  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json() as LoginResponse;
      if (!response.ok || !result.data?.token || !result.data.user) {
        throw new Error(result.error?.message || 'No se pudo iniciar sesi\u00f3n. Revisa tus datos.');
      }
      setPage(visibleNavigation(result.data.user.permissions)[0]?.pages[0] ?? 'dashboard');
      setSession({ token: result.data.token, user: result.data.user });
      setPassword('');
      setPasswordVisible(false);
    } catch (cause) {
      setError(controller.signal.aborted ? 'El servidor tardó demasiado en responder. Intenta iniciar sesión de nuevo.' : cause instanceof Error ? cause.message : 'No se pudo conectar con el servidor.');
    } finally {
      window.clearTimeout(timeout);
      setIsSubmitting(false);
    }
  }

  const activeModule = pageInfo[page];
  const activeGroup = visibleNavigation(session?.user.permissions ?? []).find(group => group.pages.includes(page));
  const navigate = (target: Page) => { if (session && hasModulePermission(session.user.permissions, target)) { setPage(target); setMobileNavOpen(false); } };
  useEffect(() => { if (session) headingRef.current?.focus(); }, [page, session?.user.id]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const sidebar = document.querySelector<HTMLElement>('.sidebar'), main = document.querySelector<HTMLElement>('.main-area');
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(sidebar?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') ?? []).filter(element => element.getClientRects().length > 0);
    focusable()[0]?.focus(); if(main) main.inert = true;
    const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if(event.key === 'Escape') setMobileNavOpen(false); if(event.key !== 'Tab') return; const items = focusable(), first = items[0], last = items[items.length - 1]; if(event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if(!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } };
    const media = window.matchMedia('(max-width: 850px)'), resized = () => { if(!media.matches) setMobileNavOpen(false); };
    media.addEventListener('change', resized); document.addEventListener('keydown', close);
    return () => { if(main) main.inert = false; document.body.style.overflow = oldOverflow; media.removeEventListener('change', resized); document.removeEventListener('keydown', close); previous?.focus(); };
  }, [mobileNavOpen]);
  const themeStyle = { '--accent': theme.accent, '--accent-ink': accentForeground(theme.accent), '--font-ui': fontStacks[theme.font] } as React.CSSProperties;

  return (
    <div className="app-shell" data-mode={theme.mode} style={themeStyle}>
      <a href="#main-content" className="skip-link">Ir al contenido principal</a>
      {!session ? (
        <main className="auth-layout" id="main-content">
          <section className="auth-visual">
            <div className="brand-lockup"><span className="brand-emblem">N</span><span>{'Núcleo ERP'}</span></div>
            <div className="auth-center">
              <img className="auth-logo" src="/brand/nucleo-erp-logo.png" alt={'N\u00daCLEO ERP Software'} />
              <div className="auth-kicker">Menos complicaciones, más claridad</div>
              <h1>Tu negocio, en orden.</h1>
              <p>Ventas, productos y equipo en un solo lugar. Un paso a la vez, con información clara para tu día a día.</p>
            </div>
            <div className="auth-foot">ACCESO PROTEGIDO <span aria-hidden="true"> / </span> Núcleo ERP · Tu espacio de trabajo</div>
          </section>
          <section className="auth-panel">
            <div className="auth-controls"><button className="icon-button" type="button" aria-label="Ajustes visuales" title="Ajustes visuales" onClick={() => { setMobileNavOpen(false); setSettingsOpen(true); }}><WorkspaceIcon name="settings"/></button></div>
            <div className="login-card">
              <div className="eyebrow">Acceso seguro</div>
              <h2>Bienvenido de nuevo</h2>
              <p className="intro">Ingresa con tu cuenta para continuar.</p>
              <form onSubmit={handleLogin}>
                <div className="field"><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></div>
                <div className="field"><label htmlFor="password">Contraseña</label><div className="password-input"><input id="password" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={72} /><button type="button" aria-label={passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible(value => !value)}>{passwordVisible ? 'Ocultar' : 'Mostrar'}</button></div></div>
                {error && <div className="error-box" role="alert">{error}</div>}
                <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Iniciando sesión…' : 'Entrar al ERP'} <span aria-hidden="true">→</span></button>
              </form>
              <p className="security-note">Usa la cuenta que te proporcionó el administrador de tu empresa.</p>
            </div>
          </section>
        </main>
      ) : (
        <div className="dashboard-layout">
          <aside className={'sidebar' + (mobileNavOpen ? ' open' : '')} aria-label="Navegación de tu empresa" role={mobileNavOpen ? 'dialog' : undefined} aria-modal={mobileNavOpen ? true : undefined}>
            <div className="sidebar-brand"><span className="sidebar-brand-mark" aria-hidden="true">N</span><span><strong>Núcleo</strong><small>Tu negocio, en orden</small></span></div>
            <div className="tenant-card"><span>Tu empresa</span><strong>{tenantLabels.company || 'Empresa de tu sesión'}</strong><strong>{tenantLabels.branch || 'Sucursal de tu sesión'}</strong></div>
            <WorkspaceNavigation permissions={session.user.permissions} page={page} onNavigate={navigate}/>
            <div className="sidebar-bottom"><button className="nav-item" type="button" onClick={() => { setMobileNavOpen(false); setSettingsOpen(true); }}><WorkspaceIcon name="settings"/><span>Apariencia</span></button><button className="nav-item" type="button" onClick={() => { setSession(null); setPage('dashboard'); setMobileNavOpen(false); }}><WorkspaceIcon name="logout"/><span>Cerrar sesión</span></button></div>
          </aside>
          {mobileNavOpen && <button className="mobile-nav-backdrop" aria-label="Cerrar menú" onClick={() => setMobileNavOpen(false)}/>}
          <main className="main-area" id="main-content">
            <header className="topbar"><div className="top-actions"><button className="icon-button mobile-menu" type="button" aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileNavOpen} aria-controls="workspace-navigation" onClick={() => setMobileNavOpen(open => !open)}><WorkspaceIcon name="menu"/></button><div className="breadcrumb"><span>Tu espacio</span><span aria-hidden="true">/</span><strong>{activeGroup?.label || 'Inicio'}</strong></div></div><div className="top-actions"><button className="icon-button" type="button" aria-label="Cambiar apariencia" onClick={() => { setMobileNavOpen(false); setSettingsOpen(true); }}><WorkspaceIcon name="settings"/></button><div className="user-chip"><span className="user-avatar" aria-hidden="true">{session.user.name.slice(0, 1).toUpperCase()}</span><span className="user-copy"><strong>{session.user.name}</strong><small>{session.user.email}</small></span></div></div></header>
            <div className="page-heading"><div><h1 ref={headingRef} tabIndex={-1}>{activeModule.label}</h1><p>{activeModule.description}</p></div><div className="date-chip">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
            <div className="workspace-content"><WorkspaceTabs permissions={session.user.permissions} page={page} onNavigate={navigate}/>
            {page !== 'dashboard' && <aside className="page-help" aria-label="Cómo usar esta sección"><WorkspaceIcon name="help"/><p>{activeModule.tip}</p></aside>}
            <div key={page} data-module={page}>
            {(page === 'sales' || page === 'purchases') && hasModulePermission(session.user.permissions, page, 'crear') && <details className="action-disclosure"><summary><WorkspaceIcon name="sales"/><span>{page === 'sales' ? 'Crear una venta' : 'Crear una orden de compra'}</span><span className="disclosure-marker" aria-hidden="true">+</span></summary><TransactionCreate key={'create-' + page + session.user.id} kind={page === 'sales' ? 'sales' : 'purchase-orders'} apiUrl={apiBaseUrl} token={session.token} onCreated={() => setTransactionRevision((value) => value + 1)} /></details>}
            {page === 'inventory' && <StockPanel key={session.user.id} apiUrl={apiBaseUrl} token={session.token} canCreate={hasModulePermission(session.user.permissions, 'inventory', 'editar')} onWarehouseCreated={() => setTransactionRevision((value) => value + 1)} />}
            {page === 'inventory' && <InventoryAlerts base={apiBaseUrl} token={session.token} companyId={session.user.companyId} canConfigure={session.user.permissions.includes('configuracion.editar')} canEdit={hasModulePermission(session.user.permissions, 'inventory', 'editar')}/>}
            {page === 'customers' || page === 'suppliers' || page === 'products' ? (
              <CatalogDirectory companyId={session.user.companyId} branchId={session.user.branchId} key={page + session.user.id} kind={page} apiUrl={apiBaseUrl} token={session.token} canCreate={hasModulePermission(session.user.permissions, page, 'editar')} />
            ) : page === 'sales' || page === 'purchases' ? (
              <TransactionDirectory key={'directory-' + page + session.user.id} apiUrl={apiBaseUrl} token={session.token} kind={page==='sales'?'sales':'purchase-orders'} canEdit={hasModulePermission(session.user.permissions, page, 'editar')} canSettle={canSettleCommercial(session.user.permissions, page==='sales'?'sales':'purchase-orders')} externalRevision={transactionRevision} companyId={session.user.companyId} branchId={session.user.branchId}/>
            ) : page === 'finance' ? (
              <FinancePanel key={session.user.id} apiUrl={apiBaseUrl} token={session.token} canCreate={hasModulePermission(session.user.permissions, 'finance', 'editar')}/>
            ) : page === 'dashboard' || page === 'reports' ? (
              <>{page==='dashboard'&&<GettingStarted permissions={session.user.permissions} name={session.user.name} onNavigate={navigate}/>} {page==='reports'&&<PeriodReport permissions={session.user.permissions} apiUrl={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId}/>}{session.user.permissions.includes('dashboard.ver')&&<SummaryPanel key={page+session.user.id} apiUrl={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId} report={page==='reports'}/>}</>
            ) : page === 'employees' ? session.user.permissions.includes('rrhh.ver') ? <EmployeePanel canEdit={session.user.permissions.includes('rrhh.editar')} key={session.token} canManageDepartments={hasModulePermission(session.user.permissions, 'departments', 'editar')} canCreate={session.user.permissions.includes('rrhh.crear')} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId}/> : <p>No tienes permiso para consultar empleados.</p> : page === 'organization' ? hasModulePermission(session.user.permissions, 'organization') ? <OrganizationPanel key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} canManage={hasModulePermission(session.user.permissions, 'organization', 'editar')}/> : <p>No tienes permiso para consultar la empresa.</p> : page === 'roles' ? hasModulePermission(session.user.permissions, 'roles') ? <RolesPanel key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} permissions={session.user.permissions} canManage={hasModulePermission(session.user.permissions, 'roles', 'editar')}/> : <p>No tienes permiso para consultar roles.</p> : page === 'compliance' ? hasModulePermission(session.user.permissions, 'compliance') ? <CompliancePanel key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId} canManage={hasModulePermission(session.user.permissions, 'compliance', 'editar')}/> : <p>No tienes permiso para consultar cumplimiento.</p> : page === 'risks' ? hasModulePermission(session.user.permissions, 'risks') ? <RisksPanel key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId} canManage={hasModulePermission(session.user.permissions, 'risks', 'editar')}/> : <p>No tienes permiso para consultar riesgos.</p> : page === 'tickets' ? hasModulePermission(session.user.permissions, 'tickets') ? <TicketsPanel key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId} canManage={hasModulePermission(session.user.permissions, 'tickets', 'editar')}/> : <p>No tienes permiso para consultar soporte.</p> : page === 'assets' ? hasModulePermission(session.user.permissions, 'assets') ? <AssetsPanel key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId} canManage={hasModulePermission(session.user.permissions, 'assets', 'editar')}/> : <p>No tienes permiso para consultar activos.</p> : page === 'quality' ? hasModulePermission(session.user.permissions, 'quality') ? <QualityPanel canManage={hasModulePermission(session.user.permissions, 'quality', 'editar')} key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId}/> : <p>No tienes permiso para Calidad.</p> : page === 'maintenance' ? hasModulePermission(session.user.permissions, 'maintenance') ? <MaintenancePanel canManage={hasModulePermission(session.user.permissions, 'maintenance', 'editar')} key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId}/> : <p>No tienes permiso para Mantenimiento.</p> : page === 'shipments' ? session.user.permissions.includes('logistica.ver') ? <ShipmentsPanel canCreate={session.user.permissions.includes('logistica.crear')} canEdit={session.user.permissions.includes('logistica.editar')} key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId}/> : <p>No tienes permiso para Logística.</p> : page === 'crm' ? session.user.permissions.includes('crm.ver') ? <OpportunitiesPanel canCreate={session.user.permissions.includes('crm.crear')} canEdit={session.user.permissions.includes('crm.editar')} key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId}/> : <p>No tienes permiso para CRM.</p> : page === 'invoices' ? hasModulePermission(session.user.permissions, 'invoices') ? <InvoicesPanel canManage={hasModulePermission(session.user.permissions, 'invoices', 'editar')} key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId}/> : <p>No tienes permiso para consultar Facturación.</p> : page === 'production' ? session.user.permissions.includes('produccion.ver') ? <ProductionPanel key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId} canManage={hasModulePermission(session.user.permissions, 'production', 'editar')}/> : <p>No tienes permiso para consultar producción.</p> : page === 'projects' ? session.user.permissions.includes('proyectos.ver') ? <ProjectsPanel key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId} canCreate={session.user.permissions.includes('proyectos.crear')} canEdit={session.user.permissions.includes('proyectos.editar')}/> : <p>No tienes permiso para consultar proyectos.</p> : page === 'users' ? hasModulePermission(session.user.permissions, 'users') ? <UsersPanel currentEmail={session.user.email} canEdit={session.user.permissions.includes('usuarios.editar')} permissions={session.user.permissions} canCreate={session.user.permissions.includes('usuarios.crear')} key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId}/> : <p>No tienes permiso para consultar usuarios.</p> : page === 'departments' ? hasModulePermission(session.user.permissions, 'departments') ? <DepartmentsPanel key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId} canEdit={hasModulePermission(session.user.permissions, 'departments', 'editar')}/> : <p>No tienes permiso para consultar departamentos.</p> : page === 'notifications' ? session.user.permissions.includes('notificaciones.ver') ? <NotificationsPanel key={session.token} base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId} userId={session.user.id}/> : <p>No tienes permiso para consultar avisos.</p> : page === 'audit' ? session.user.permissions.includes('auditoria.ver') ? <AuditPanel base={apiBaseUrl} token={session.token} companyId={session.user.companyId} branchId={session.user.branchId}/> : <p>No tienes permiso para consultar auditoría.</p> : page === 'inventory' ? null : (
              <section className="module-placeholder"><div><div className="module-placeholder-mark"><WorkspaceIcon name={activeGroup?.icon || "home"}/></div><h2>{activeModule.label}</h2><p>{activeModule.description}. Esta sección todavía no está disponible. Puedes continuar con las otras áreas de tu empresa.</p><span className="status-chip"><span className="status-dot" /> Disponible próximamente</span></div></section>
            )}
            </div>
            </div>
          </main>
        </div>
      )}
      {settingsOpen && <AccessibleDialog titleId="appearance-title" onClose={() => setSettingsOpen(false)}><div className="drawer-head"><div><div className="eyebrow">Personalización</div><h2 id="appearance-title">Apariencia</h2><p>Elige cómo se ve tu espacio de trabajo.</p></div><button className="icon-button" type="button" aria-label="Cerrar ajustes de apariencia" onClick={() => setSettingsOpen(false)}>×</button></div><div className="setting-group"><h3>Apariencia</h3><p>Selecciona el modo que mejor se adapte a tu entorno.</p><div className="option-row"><button className={'option-button' + (theme.mode === 'dark' ? ' selected' : '')} type="button" aria-pressed={theme.mode === 'dark'} onClick={() => setTheme((value) => ({ ...value, mode: 'dark' }))}>Oscuro</button><button className={'option-button' + (theme.mode === 'light' ? ' selected' : '')} type="button" aria-pressed={theme.mode === 'light'} onClick={() => setTheme((value) => ({ ...value, mode: 'light' }))}>Claro</button></div></div><div className="setting-group"><h3>Color de acento</h3><p>El color se aplica a acciones, resaltados y estados activos.</p><div className="swatches">{['#14786b', '#385fba', '#7755a6', '#a95a20', '#ad435c'].map((color) => <button key={color} className={'swatch' + (theme.accent.toLowerCase() === color ? ' selected' : '')} style={{ '--swatch': color } as React.CSSProperties} aria-label={'Seleccionar color ' + color} aria-pressed={theme.accent.toLowerCase() === color} title={color} type="button" onClick={() => setTheme((value) => ({ ...value, accent: color }))} />)}</div><label className="color-input-wrap">Color personalizado<input type="color" value={theme.accent} onChange={(event) => setTheme((value) => ({ ...value, accent: event.target.value }))} /></label></div><div className="setting-group"><h3>Tipografía</h3><p>La preferencia se guarda en este navegador.</p><select aria-label="Tipografía del sistema" className="font-select" value={theme.font} onChange={(event) => setTheme((value) => ({ ...value, font: event.target.value as Theme['font'] }))}><option value="modern">Moderna · sans serif</option><option value="rounded">Neutra · interfaz</option><option value="mono">Tecnica · monoespaciada</option></select><div className="preview-card"><strong>Vista previa del sistema</strong><span>La operación de tu empresa, en un solo lugar.</span></div></div><div className="drawer-note">Estas preferencias se guardan localmente en este navegador. </div></AccessibleDialog>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><EnvironmentNotice apiUrl={apiBaseUrl}/><App /></React.StrictMode>);
