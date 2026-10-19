import {useContext} from 'react';
import {ExportIdentityContext,identifyExport} from './ExportIdentity';
import { useEffect, useRef, useState } from 'react';
import { downloadDocument } from './downloadDocument';
import type { ExportDocument } from './exportDocument';
import { collectExportPages, type ExportPage } from './pagedExport';

export function PagedExportButtons<T>({ scopeKey, disabled = false, fetchPage, rowKey, buildDocument }: {
  scopeKey: string; disabled?: boolean;
  fetchPage: (cursor: string, signal: AbortSignal) => Promise<ExportPage<T>>;
  rowKey: (row: T) => string;
  buildDocument: (rows: T[], signal: AbortSignal) => ExportDocument | Promise<ExportDocument>;
}) {
  const identity=useContext(ExportIdentityContext);
  const active = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { setMessage(''); return () => { active.current?.abort(); }; }, [scopeKey]);
  async function exportFile(format: 'pdf' | 'xlsx') {
    if (active.current || disabled) return;
    const controller = new AbortController(); active.current = controller; setBusy(true); setMessage('Consultando los registros…');
    const timer = setTimeout(() => controller.abort(), 300000);
    try {
      const rows = await collectExportPages(cursor => fetchPage(cursor, controller.signal), rowKey, controller.signal, count => setMessage(`Consultados ${count} registros…`));
      if (!rows.length) throw new Error('No hay registros para exportar.');
      const document = await buildDocument(rows, controller.signal);
      if (controller.signal.aborted) return;
      await downloadDocument(identifyExport(document,identity), format, controller.signal);
      if (!controller.signal.aborted) setMessage(`${format === 'pdf' ? 'PDF' : 'Excel'} preparado con ${rows.length} ${rows.length===1?'registro':'registros'}.`);
    } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'No se pudo exportar.'); }
    finally { clearTimeout(timer); if (active.current === controller) { active.current = null; setBusy(false); if (controller.signal.aborted) setMessage('Exportación cancelada.'); } }
  }
  return <div className="list-export"><details className="export-disclosure"><summary>Descargar registros</summary><div><p>Incluye todas las páginas de los filtros aplicados, hasta 10,000 registros. Los datos pueden cambiar durante la consulta.</p><button type="button" disabled={disabled || busy} onClick={() => void exportFile('pdf')}>PDF</button><button type="button" disabled={disabled || busy} onClick={() => void exportFile('xlsx')}>Excel</button></div></details>{busy && <button type="button" onClick={() => active.current?.abort()}>Cancelar descarga</button>}{message && <p role="status">{message}</p>}</div>;
}
