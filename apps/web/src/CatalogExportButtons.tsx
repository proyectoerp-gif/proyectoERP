import { useEffect, useRef, useState } from 'react';
import { catalogServerPage, type CatalogKind } from './catalogApi';
import { catalogDocument, collectCatalogPages } from './exportDocument';
import { downloadDocument } from './downloadDocument';
export function CatalogExportButtons({ base, token, kind, search, companyId, branchId, disabled, status='' }: {
  base: string; token: string; kind: CatalogKind; search: string; companyId: string; branchId: string; disabled: boolean; status?: 'ACTIVE'|'INACTIVE'|'';
}) {
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { setMessage(''); return () => controller.current?.abort(); }, [base, token, kind, search, companyId, branchId,status]);
  async function exportFile(format: 'pdf' | 'xlsx') {
    if (controller.current) return;
    const current = new AbortController(); controller.current = current; setBusy(true); setMessage('Consultando catálogo completo…');
    const timer = setTimeout(() => current.abort(), 300000);
    try {
      const rows = await collectCatalogPages(cursor => catalogServerPage(base, kind, token, current.signal, search, cursor,status), current.signal, count => { if (!current.signal.aborted) setMessage(`Consultados ${count} registros…`); });
      if (current.signal.aborted) return;
      if (!rows.length) throw new Error('No hay registros para exportar.');
      await downloadDocument(catalogDocument(kind, rows, companyId, branchId, [search,status==='ACTIVE'?'Activos':status==='INACTIVE'?'Retirados':'Todos los estados'].filter(Boolean).join(' · ')), format);
      setMessage(format === 'pdf' ? `Preparados ${rows.length} registros. Elige Guardar como PDF en el diálogo.` : `Excel preparado con ${rows.length} registros.`);
    } catch (error) { if (!current.signal.aborted) setMessage(error instanceof Error ? error.message : 'No se pudo exportar.'); }
    finally { clearTimeout(timer); controller.current = null; setBusy(false); if (current.signal.aborted) setMessage('Exportación cancelada.'); }
  }
  return <div><details className="export-disclosure"><summary>Descargar lista</summary><div><p>Descarga todos los resultados de tu búsqueda, hasta 10,000 registros. La información puede cambiar mientras se prepara el archivo.</p><button disabled={disabled || busy} onClick={() => exportFile('pdf')}>PDF o imprimir</button><button disabled={disabled || busy} onClick={() => exportFile('xlsx')}>Excel</button></div></details>{busy && <button onClick={() => controller.current?.abort()}>Cancelar descarga</button>}{!!message && <p role="status">{message}</p>}</div>;
}
