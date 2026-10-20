import {EditorSheet} from './EditorSheet';
import {ActionButton} from './ModuleLayout';
import {useContext,useEffect,useRef,useState} from 'react';
import {Pressable,Text,View} from './ui';
import {ExportIdentityContext,identifyExport} from './ExportIdentity';
import {collectExportPages,type ExportPage} from './pagedExport';
import type {ExportDocument} from './exportDocument';
import {shareDocument} from './shareDocument';
import {useNativeTheme} from './NativeTheme';
import {ApiError} from './api';
export function PagedExportButtons<T>({scopeKey,disabled=false,fetchPage,rowKey,buildDocument,onExpired}:{scopeKey:string;disabled?:boolean;fetchPage:(cursor:string,signal:AbortSignal)=>Promise<ExportPage<T>>;rowKey:(row:T)=>string;buildDocument:(rows:T[],signal:AbortSignal)=>ExportDocument|Promise<ExportDocument>;onExpired:()=>void}){
 const {theme:t}=useNativeTheme(),identity=useContext(ExportIdentityContext),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),active=useRef<AbortController|null>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;setMessage('');return()=>{alive.current=false;active.current?.abort();};},[scopeKey]);
 async function run(format:'pdf'|'xlsx'){if(active.current||disabled)return;const c=new AbortController();active.current=c;setBusy(true);setMessage('Consultando registros…');const timer=setTimeout(()=>c.abort(),300000);try{const rows=await collectExportPages(cursor=>fetchPage(cursor,c.signal),rowKey,c.signal,n=>{if(!c.signal.aborted)setMessage('Consultados '+n+' registros…');});if(!rows.length)throw new Error('No hay registros para exportar.');const doc=await buildDocument(rows,c.signal);if(c.signal.aborted)return;await shareDocument(identifyExport(doc,identity),format,c.signal);if(!c.signal.aborted)setMessage('Archivo preparado con '+rows.length+' registros. Elige dónde guardarlo o compartirlo.');}catch(e){if(!c.signal.aborted){if(e instanceof ApiError&&e.status===401)onExpired();else setMessage(e instanceof Error?e.message:'No se pudo exportar.');}}finally{clearTimeout(timer);if(active.current===c){active.current=null;if(alive.current){setBusy(false);if(c.signal.aborted)setMessage('Exportación cancelada.');}}}}

 return <View><ActionButton icon="download" disabled={disabled||busy} onPress={()=>setOpen(true)}>{busy?'Preparando…':'Exportar'}</ActionButton><EditorSheet title="Exportar registros" subtitle="Descarga los resultados de los filtros aplicados." icon="download" visible={open} onClose={()=>setOpen(false)} guardClose={false}><Text style={{fontSize:12,color:t.muted}}>Incluye todas las páginas consultadas, hasta 10,000 registros. Los datos pueden cambiar durante la consulta.</Text><ActionButton icon="file-text" disabled={disabled||busy} onPress={()=>{setOpen(false);void run('pdf');}}>Documento PDF</ActionButton><ActionButton icon="grid" disabled={disabled||busy} onPress={()=>{setOpen(false);void run('xlsx');}}>Hoja de Excel</ActionButton></EditorSheet>{busy&&<ActionButton icon="x" onPress={()=>active.current?.abort()}>Cancelar</ActionButton>}{!!message&&<Text accessibilityLiveRegion="polite" style={{color:t.muted,fontSize:10,lineHeight:16,marginVertical:6,maxWidth:240}}>{message}</Text>}</View>;
}
