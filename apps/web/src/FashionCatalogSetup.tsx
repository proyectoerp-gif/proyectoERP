import {useEffect,useRef,useState} from 'react';
import {requestData} from './webApi';
import {confirmAction,notifySuccess} from './interaction';
type Preview={completed:boolean;fingerprint:string|null;activeProducts:number;activeCategories:number;newProducts:number};
export function FashionCatalogSetup({base,token,onDone}:{base:string;token:string;onDone:()=>void}){
  const [preview,setPreview]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const lock=useRef(false),controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  async function load(){
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');
    const request=new AbortController();controller.current=request;
    try{const data=await requestData(base,'/products/fashion-demo',{headers:{Authorization:'Bearer '+token},signal:request.signal});const value=data as Preview;if(!value||typeof value.completed!=='boolean'||(!value.completed&&(typeof value.fingerprint!=='string'||! /^[a-f0-9]{64}$/.test(value.fingerprint)))||![value.activeProducts,value.activeCategories,value.newProducts].every(n=>Number.isInteger(n)&&n>=0&&n<=500))throw new Error('No pudimos confirmar la vista previa.');if(!request.signal.aborted)setPreview(value);}
    catch(cause){if(!request.signal.aborted)setError(cause instanceof Error?cause.message:'No se pudo consultar la preparación.');}
    finally{lock.current=false;if(!request.signal.aborted)setBusy(false);}
  }
  async function apply(){
    if(lock.current||!preview?.fingerprint||preview.completed)return;
    if(!await confirmAction(`Se retirarán del catálogo activo ${preview.activeProducts} productos y ${preview.activeCategories} categorías de la empresa demo. Se crearán ${preview.newProducts} prendas y accesorios ficticios. Los movimientos, existencias y documentos anteriores conservan sus referencias. Puedes restaurar registros desde el filtro Retirados.`,{title:'Preparar Albor Moda',confirmLabel:'Aplicar catálogo de moda',danger:true}))return;
    lock.current=true;setBusy(true);setError('');
    const request=new AbortController();controller.current=request;
    try{
      await requestData(base,'/products/fashion-demo',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({fingerprint:preview.fingerprint,confirmation:'ALBOR_FASHION'}),signal:request.signal});
      if(!request.signal.aborted){setPreview({...preview,completed:true});notifySuccess('Catálogo de moda preparado.');onDone();}
    }catch(cause){if(!request.signal.aborted)setError(cause instanceof Error?cause.message:'Actualiza la vista previa para confirmar el resultado.');}
    finally{lock.current=false;if(!request.signal.aborted)setBusy(false);}
  }
  return <details className="fashion-setup" data-operation-pending={busy}>
    <summary>Preparar catálogo de moda de la demo</summary>
    <p>Convierte la empresa de ejemplo en Albor Moda. Esta preparación se aplica una sola vez y conserva el historial.</p>
    <button type="button" disabled={busy} onClick={()=>void load()}>{busy?'Consultando…':'Revisar cambio de catálogo'}</button>
    {preview&&!preview.completed&&<div><p>{preview.activeProducts} productos actuales · {preview.newProducts} diseños nuevos</p><button type="button" disabled={busy} onClick={()=>void apply()}>Preparar tienda de ropa</button></div>}
    {preview?.completed&&<p role="status">El catálogo de moda ya está preparado.</p>}
    {error&&<p role="alert" className="error-box">{error}</p>}
  </details>;
}
