import {confirmAction,notifySuccess} from './interaction';
import {useAdminPresentation} from './AdminUi';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {CatalogSelector} from './CatalogSelector';
import type {CatalogEntry} from './catalogApi';
import {createTransactionRequest,type TransactionKind} from './transactionApi';
import {reviewTransaction} from './operationReview';
import {ApiError} from './webApi';
export function TransactionCreate({kind,apiUrl,token,onCreated}:{kind:TransactionKind;apiUrl:string;token:string;onCreated:()=>void}) {
 const admin=useAdminPresentation(),sale=kind==='sales';
 const [partner,setPartner]=useState<CatalogEntry|null>(null),[product,setProduct]=useState<CatalogEntry|null>(null),[draft,setDraft]=useState({partnerId:'',productId:'',quantity:'',unitCost:''}),[saving,setSaving]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const write=useRef<AbortController|null>(null);useEffect(()=>()=>write.current?.abort(),[]);
 const review=reviewTransaction(kind,draft,partner,product);
 async function submit(event:FormEvent) {
  event.preventDefault();if(write.current||uncertain)return;setError('');setNotice('');
  if(!review.ready){setError(review.message);return;}
  if(!await confirmAction(`${sale?'Cliente':'Proveedor'}: ${partner!.name}\nProducto: ${product!.name}\nCantidad: ${review.quantity}\n${sale?'Precio':'Costo'} unitario: ${review.unitPrice.toFixed(2)}\nTotal estimado: ${review.total.toFixed(2)} (moneda no informada)\n\n${sale?'La venta quedará pendiente de cobro. Después usa «Cobrar y entregar».':'La orden quedará pendiente de aprobación. Después apruébala y usa «Recibir y pagar».'}\nEste paso no mueve dinero ni existencias.`,{title:sale?'Crear nueva venta':'Crear orden de compra',confirmLabel:sale?'Crear venta pendiente':'Crear orden pendiente'}))return;
  const c=new AbortController();write.current=c;setSaving(true);
  try{const created=await createTransactionRequest(apiUrl,token,kind,draft,c.signal);if(c.signal.aborted)return;setDraft({partnerId:'',productId:'',quantity:'',unitCost:''});setPartner(null);setProduct(null);const message=`${sale?'Venta':'Orden de compra'} registrada · ${created.total.toLocaleString('es-MX',{minimumFractionDigits:2})}. ${sale?'Ya puedes cobrarla y entregarla desde el listado.':'Apruébala desde el listado antes de recibir y pagar.'}`;setNotice(message);notifySuccess(message);onCreated();}
  catch(e){if(!c.signal.aborted){setUncertain(!(e instanceof ApiError&&e.status>=400&&e.status<500));setError(e instanceof Error?e.message:'No se pudo confirmar el guardado. Revisa el listado antes de repetir.');}}
  finally{write.current=null;if(!c.signal.aborted)setSaving(false);}
 }
 return <section className="panel" aria-busy={saving} data-operation-pending={saving}>
  {!admin&&<h3>{sale?'Nueva venta':'Nueva orden de compra'}</h3>}
  <p className="erp-next-step">{sale?'1. Selecciona cliente y producto. 2. Indica la cantidad. 3. Revisa y crea la venta.':'1. Selecciona proveedor y producto. 2. Indica cantidad y costo. 3. Revisa y crea la orden.'}</p>
  <CatalogSelector apiUrl={apiUrl} token={token} kind={sale?'customers':'suppliers'} label={sale?'Cliente':'Proveedor'} selected={partner} disabled={saving||uncertain} onSelect={row=>{setPartner(row);setDraft(v=>({...v,partnerId:row.id}));}}/>
  <CatalogSelector apiUrl={apiUrl} token={token} kind="products" label="Producto" selected={product} disabled={saving||uncertain} onSelect={row=>{setProduct(row);setDraft(v=>({...v,productId:row.id}));}}/>
  <form onSubmit={event=>void submit(event)}><fieldset disabled={saving||uncertain} style={{border:0,padding:0}}>
   <div className="field"><label htmlFor="transaction-quantity">Cantidad</label><input id="transaction-quantity" type="number" min="0.000001" step="0.000001" required value={draft.quantity} onChange={e=>setDraft(v=>({...v,quantity:e.target.value}))}/></div>
   {!sale&&<div className="field"><label htmlFor="transaction-cost">Costo unitario</label><input id="transaction-cost" type="number" min="0" step="0.01" required value={draft.unitCost} onChange={e=>setDraft(v=>({...v,unitCost:e.target.value}))}/></div>}
   <dl className="erp-operation-review"><div><dt>{sale?'Cliente':'Proveedor'}</dt><dd>{partner?.name??'Sin seleccionar'}</dd></div><div><dt>Producto</dt><dd>{product?.name??'Sin seleccionar'}</dd></div><div><dt>{sale?'Precio vigente consultado':'Costo unitario'}</dt><dd>{review.ready?review.unitPrice.toLocaleString('es-MX',{minimumFractionDigits:2}):sale?product?.price?.toLocaleString('es-MX',{minimumFractionDigits:2})??'Sin seleccionar':draft.unitCost||'Sin indicar'}</dd></div><div><dt>Total estimado</dt><dd>{review.ready?review.total.toLocaleString('es-MX',{minimumFractionDigits:2}):'Pendiente de completar'}</dd></div></dl>
   <p className="demo-hint">Moneda no informada. El servidor confirma el precio y el importe al guardar. Una operación contiene un producto.</p>
   {!review.ready&&<p id="transaction-guidance">{review.message}</p>}
   <button className="primary-button" disabled={!review.ready} aria-describedby={!review.ready?'transaction-guidance':undefined}>{saving?'Guardando…':sale?'Revisar y crear venta':'Revisar y crear orden'}</button>
  </fieldset></form>
  {error&&<p role="alert" className="error-box">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {uncertain&&<div><p>Por seguridad se bloqueó repetir el alta. Cierra el panel y comprueba el listado antes de preparar otra operación.</p><button type="button" onClick={async()=>{if(await confirmAction('Confirma que revisaste el listado y que esta venta o compra no se registró. Repetir un alta sin comprobarlo puede crear otro documento.',{title:'Preparar otra operación',confirmLabel:'Ya revisé: habilitar formulario'})){setUncertain(false);setError('');}}}>Ya revisé el listado</button></div>}
 </section>;
}
