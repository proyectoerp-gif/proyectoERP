import React, {lazy, Suspense} from 'react';
import ReactDOM from 'react-dom/client';
import './base.css';
const WorkspaceApp = lazy(() => import('./WorkspaceApp'));
const DemoStorefront = lazy(() => import('./DemoStorefront').then(module => ({default: module.DemoStorefront})));
const DemoSupportPage = lazy(() => import('./DemoSupport').then(module => ({default: module.DemoSupportPage})));
const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Suspense fallback={<p role="status">Cargando…</p>}>
    {window.location.pathname === '/tienda' ? <DemoStorefront base={apiBaseUrl}/> :
      window.location.pathname === '/demo-atencion' ? <DemoSupportPage base={apiBaseUrl}/> : <WorkspaceApp/>}
  </Suspense></React.StrictMode>
);
