import { useEffect, useState } from 'react';
import { summaryRequest, summaryLabels, summaryCsv, type Summary } from './summaryApi';
export function SummaryPanel({ apiUrl, token, companyId, branchId, report = false }: { apiUrl: string; token: string; companyId: string; branchId: string; report?: boolean }) {
  const [data, setData] = useState<Summary | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    summaryRequest(apiUrl, token, companyId, branchId, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [apiUrl, token, companyId, branchId, revision]);
  function download() {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([summaryCsv(data)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'nucleo-resumen.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="panel" aria-labelledby="summary-title" aria-busy={loading}>
    <div className="summary-header"><h2 id="summary-title">{report ? 'Resumen del negocio' : 'Tu negocio de un vistazo'}</h2><div><button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)}>{error ? 'Volver a intentar' : 'Actualizar'}</button>{report && <button type="button" disabled={!data || loading} onClick={download}>Descargar resumen</button>}</div></div>
    <p className="summary-meta">Información acumulada de tu sucursal. Los productos corresponden al catálogo de tu empresa.</p>
    {loading ? <p>Estamos consultando tu información…</p> : error ? <p role="alert" className="error-box">{error}</p> : data && <>
      <p className="summary-meta">Se muestran únicamente los indicadores de las áreas que puedes consultar.</p><div className="metric-grid">{Object.values(data.metrics).every(value=>value===null)&&<p>No tienes indicadores habilitados. Solicita al administrador el acceso que corresponda a tus funciones.</p>}{Object.entries(summaryLabels).filter(([key]) => data.metrics[key as keyof Summary['metrics']] !== null).map(([key, label]) => <article className="panel" key={key}><h3>{label}</h3><strong>{data.metrics[key as keyof Summary['metrics']]?.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</strong></article>)}</div>
      <p className="summary-meta">Última actualización: {new Date(data.lastUpdated).toLocaleString('es-MX')}</p>
      <details className="summary-explanation"><summary>¿Qué significan estos números?</summary><p>Ventas y compras incluyen operaciones pendientes y excluyen canceladas. El flujo neto suma entradas y resta salidas de caja; no es el saldo de una cuenta bancaria. Productos activos cuenta los productos del catálogo, no sus existencias. Los importes se muestran sin una moneda indicada.</p>{report && <p>Este resumen no aplica filtros por periodo ni sustituye reportes contables o fiscales.</p>}</details>
    </>}
  </section>;
}
