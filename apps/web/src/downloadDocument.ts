import { write } from 'xlsx';
import { documentWorkbook } from './exportWorkbook';
import type { ExportDocument } from './exportDocument';

export async function downloadDocument(document: ExportDocument, format: 'pdf' | 'xlsx', signal?: AbortSignal): Promise<void> {
  if(signal?.aborted) throw new Error('Exportación cancelada.');
  document = { ...document, company: document.company === 'company-promaxima-demo' ? 'Albor Oficina y Hogar · Demo' : document.company, branch: document.branch === 'branch-promaxima-demo' ? 'Sucursal de pruebas' : document.branch };
  if (format === 'xlsx') {
    const bytes = write(documentWorkbook(document), { type: 'array', bookType: 'xlsx', compression: true });
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = window.document.createElement('a'); link.href = url; link.download = `${document.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]+/g,'-').slice(0,80)}-${Date.now()}.xlsx`;
    window.document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const { documentPdf } = await import('./exportPdf');
  if(signal?.aborted) throw new Error('Exportación cancelada.');
  const name = document.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]+/g,'-').slice(0,80);
  documentPdf(document).save(`${name}-${Date.now()}.pdf`);
}
