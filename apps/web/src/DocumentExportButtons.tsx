import {useContext} from 'react';
import {ExportIdentityContext,identifyExport} from './ExportIdentity';
import {useRef,useState} from 'react';
import { downloadDocument } from './downloadDocument';
import type { ExportDocument } from './exportDocument';
export function DocumentExportButtons({ document }: { document: ExportDocument }) {
 const identity=useContext(ExportIdentityContext);
 const lock=useRef(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function exportFile(format:'pdf'|'xlsx'){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('Preparando archivo…');
  try{await downloadDocument(identifyExport(document,identity),format);setMessage(format==='pdf'?'Archivo PDF preparado para descargar.':'Archivo Excel preparado para descargar.');}
  catch(error){setMessage(error instanceof Error?error.message:'No se pudo exportar el documento.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <div><details className="export-disclosure"><summary>Descargar documento</summary><div><button disabled={busy} type="button" onClick={()=>void exportFile('pdf')}>PDF</button><button disabled={busy} type="button" onClick={()=>void exportFile('xlsx')}>Excel</button></div></details>{message&&<p role="status">{message}</p>}</div>;
}
