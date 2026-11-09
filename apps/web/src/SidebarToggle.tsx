export function SidebarToggle({collapsed,onToggle}:{collapsed:boolean;onToggle:()=>void}) {
  const label=collapsed?'Expandir navegación':'Contraer navegación';
  return <button className="icon-button desktop-nav-toggle" type="button" title={label} aria-label={label} aria-expanded={!collapsed} aria-controls="admin-sidebar" onClick={onToggle}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3"/>
      <rect className="sidebar-toggle-rail" x="6" y="7" width="4" height="10" rx="1" fill="currentColor" stroke="none"/>
      <path d="M14 9h3M14 12h3M14 15h3"/>
    </svg><span className="desktop-nav-label">Menú</span>
  </button>;
}
