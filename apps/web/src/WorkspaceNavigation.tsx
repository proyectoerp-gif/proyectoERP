import { useState } from 'react';
import { pageInfo, searchPages, visibleNavigation, type Page } from './navigation';
import { WorkspaceIcon } from './WorkspaceIcon';

export function WorkspaceNavigation({ permissions, page, onNavigate, collapsed=false }: { permissions: string[]; page: Page; onNavigate: (page: Page) => void; collapsed?:boolean }) {
  const [query, setQuery] = useState('');
  const groups = visibleNavigation(permissions), results = searchPages(permissions, query);
  const navigate = (target: Page) => { setQuery(''); onNavigate(target); };
  return <>
    <div className="navigation-search"><WorkspaceIcon name="search" size={18}/><label className="sr-only" htmlFor="navigation-search">Buscar una sección del sistema</label><input id="navigation-search" type="search" placeholder="¿Qué necesitas hacer?" value={query} maxLength={100} onChange={event => setQuery(event.target.value)}/></div>
    <nav id="workspace-navigation" aria-label={query.trim() ? 'Resultados de búsqueda' : 'Áreas de trabajo'} className="nav-list">
      {query.trim() ? <><p className="nav-label" role="status">{results.length} {results.length === 1 ? 'resultado' : 'resultados'}</p>{results.map(result => <button key={result.page} className="nav-search-result" onClick={() => navigate(result.page)}><strong>{result.label}</strong><small>{result.group}</small></button>)}{!results.length && <p className="navigation-empty">Prueba con «productos», «ventas» o «personal».</p>}</> : groups.map(group => {
        const active = group.pages.includes(page);
        return <button key={group.id} type="button" className={'nav-item' + (active ? ' active' : '')} aria-current={active ? 'true' : undefined} title={collapsed?group.label:undefined} onClick={() => navigate(active ? page : group.pages[0])}><span className="nav-icon"><WorkspaceIcon name={group.icon}/></span><span>{group.label}</span>{active && <span className="nav-active-dot" aria-hidden="true"/>}</button>;
      })}
    </nav>
  </>;
}
export function WorkspaceTabs({ permissions, page, onNavigate }: { permissions: string[]; page: Page; onNavigate: (page: Page) => void }) {
  const group = visibleNavigation(permissions).find(item => item.pages.includes(page));
  if (!group || group.pages.length < 2) return null;
  const primary = group.id === 'operations' ? group.pages.slice(0, 4) : group.pages;
  const more = group.id === 'operations' ? group.pages.slice(4) : [];
  return <nav className="workspace-tabs" aria-label={'Secciones de ' + group.label}>{primary.map(target => <button key={target} type="button" aria-current={target === page ? 'page' : undefined} className={target === page ? 'selected' : ''} onClick={() => onNavigate(target)}>{pageInfo[target].label}</button>)}{more.length > 0 && <details className="more-sections"><summary className={more.includes(page) ? 'selected' : ''}>{more.includes(page) ? pageInfo[page].label : 'Más herramientas'} <span aria-hidden="true">⌄</span></summary><div>{more.map(target => <button key={target} type="button" aria-current={target === page ? 'page' : undefined} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); onNavigate(target); }}>{pageInfo[target].label}</button>)}</div></details>}</nav>;
}
