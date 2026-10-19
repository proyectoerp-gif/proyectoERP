import {confirmAction,notifySuccess} from './interaction';
import {useAdminPresentation} from './AdminUi';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {CatalogSelector} from './CatalogSelector';
import type {CatalogEntry} from './catalogApi';
import type {TransactionKind} from './transactionApi';
import {createMultiTransactionRequest,reviewCart,type CartLine} from './multiTransactionApi';
import {money} from './TransactionItems';
import {ApiError} from './webApi';
export function TransactionCreate({kind,apiUrl,token,onCreated}:{kind:TransactionKind;apiUrl:string;token:string;onCreated:()=>void}){
 const admin=useAdminPresentation(),sale=kind==='sales';
 const [partner,setPartner]=useState<CatalogEntry|null>(null),[lastProduct,setLastProduct]=useState<CatalogEntry|null>(null),[lines,setLines]=useState<CartLine[]>([]),[saving,setSaving]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const write=useRef<AbortController|null>(null),panel=useRef<HTMLElement>(null);useEffect(()=>()=>write.current?.abort(),[]);
 const review=reviewCart(kind,partner,lines),locked=saving||uncertain;
 function addProduct(product:CatalogEntry){
  if(locked)return;setError('');
  if(lines.some(line=>line.product.id===product.id)){setError('Este producto ya está en la lista. Modifica su cantidad en el artículo existente.');panel.current?.querySelector<HTMLInputElement>('#item-quantity-'+product.id)?.focus();return;}
  if(lines.length>=20){setError('Puedes incluir hasta 20 productos distintos por operación.');return;}
  setLines(current=>[...current,{product,quantity:'1',unitCost:''}]);setLastProduct(product);
  requestAnimationFrame(()=>panel.current?.querySelector<HTMLInputElement>('#item-quantity-'+product.id)?.focus());
 }
 function update(id:string,field:'quantity'|'unitCost',value:string){setLines(current=>current.map(line=>line.product.id===id?{...line,[field]:value}:line));setError('');}
 async function submit(event:FormEvent){
  event.preventDefault();if(write.current||uncertain)return;setError('');setNotice('');
  if(!review.ready){setError(review.message);return;}
  const detail=lines.map((line,index)=>`${line.product.name} (${line.product.sku}) · ${line.quantity} × ${money(review.totals[index].unitPrice)} = ${money(review.totals[index].total)}`).join('\n');
  if(!await confirmAction(`${sale?'Cliente':'Proveedor'}: ${partner!.name}\n\n${detail}\n\n${lines.length} artículos · Total estimado: ${money(review.total)} (moneda no informada)\n\n${sale?'La venta quedará pendiente. Después abre «Pagos, entregas y devoluciones».':'La compra quedará pendiente. Apruébala y después abre «Pagos, entregas y devoluciones».'}\nCrear este documento no mueve dinero ni existencias.`,{title:sale?'Crear nueva venta':'Crear orden de compra',confirmLabel:sale?'Crear venta pendiente':'Crear orden pendiente'}))return;
  const c=new AbortController();write.current=c;setSaving(true);
  try{const row=await createMultiTransactionRequest(apiUrl,token,kind,partner!.id,lines,c.signal);if(c.signal.aborted)return;setLines([]);setPartner(null);setLastProduct(null);const message=`${sale?'Venta':'Compra'} registrada con ${row.items!.length} artículos · ${money(row.total)}. ${sale?'Continúa con «Cobrar y entregar».':'Apruébala antes de recibir y pagar.'}`;setNotice(message);notifySuccess(message);onCreated();}
  catch(e){if(!c.signal.aborted){setUncertain(!(e instanceof ApiError&&e.status>=400&&e.status<500));setError(e instanceof Error?e.message:'Revisa el listado antes de repetir el alta.');}}
  finally{write.current=null;if(!c.signal.aborted)setSaving(false);}
 }
 return <section ref={panel} className="panel" aria-busy={saving} data-operation-pending={saving} data-form-dirty={lines.length>0||!!partner}>
  {!admin&&<h3>{sale?'Nueva venta':'Nueva orden de compra'}</h3>}
  <p className="erp-next-step">1. Elige {sale?'cliente':'proveedor'}. 2. Busca y agrega tus productos. 3. Revisa las cantidades y el total.</p>
  <CatalogSelector apiUrl={apiUrl} token={token} kind={sale?'customers':'suppliers'} label={sale?'Cliente':'Proveedor'} selected={partner} disabled={locked} onSelect={setPartner}/>
  <CatalogSelector apiUrl={apiUrl} token={token} kind="products" label="Agregar producto" selected={lastProduct} disabled={locked} onSelect={addProduct} autoSearch/>
  <form onSubmit={event=>void submit(event)}><fieldset disabled={locked} style={{border:0,padding:0,minWidth:0}}><legend>Artículos de la {sale?'venta':'compra'} ({lines.length}/20)</legend>
   {!lines.length&&<p className="empty-state">Todavía no agregas productos. Busca por nombre o SKU para empezar.</p>}
   <div className="erp-cart-lines">{lines.map((line,index)=>{const price=sale?line.product.price:Number(line.unitCost),subtotal=review.ready?review.totals[index].total:null;return <section className="erp-cart-line" key={line.product.id} aria-label={'Artículo '+(index+1)+': '+line.product.name}>
    <div className="erp-cart-line-heading"><div><strong>{line.product.name}</strong><small>{line.product.sku}</small></div><button type="button" aria-label={'Quitar '+line.product.name} onClick={()=>{setLines(current=>current.filter(item=>item.product.id!==line.product.id));if(lastProduct?.id===line.product.id)setLastProduct(null);}}>Quitar</button></div>
    <div className="erp-cart-fields"><div className="field"><label htmlFor={'item-quantity-'+line.product.id}>Cantidad de {line.product.name}</label><input id={'item-quantity-'+line.product.id} type="number" required min="0.000001" max="1000000000" step="0.000001" value={line.quantity} onChange={e=>update(line.product.id,'quantity',e.target.value)}/></div>
    {sale?<div className="field"><span>Precio unitario</span><strong>{typeof price==='number'&&Number.isFinite(price)?money(price):'No disponible'}</strong></div>:<div className="field"><label htmlFor={'item-cost-'+line.product.id}>Costo unitario de {line.product.name}</label><input id={'item-cost-'+line.product.id} type="number" required min="0" max="1000000000000" step="0.01" value={line.unitCost} onChange={e=>update(line.product.id,'unitCost',e.target.value)}/></div>}
    <div className="field"><span>Subtotal</span><strong>{subtotal===null?'Completa los datos':money(subtotal)}</strong></div></div>
   </section>;})}</div>
   <dl className="erp-operation-review erp-cart-total"><div><dt>Subtotal de artículos</dt><dd>{review.ready?money(review.total):'Pendiente de completar'}</dd></div><div><dt>Total {sale?'estimado':''}</dt><dd>{review.ready?money(review.total):'Pendiente de completar'}</dd></div></dl>
   <p className="demo-hint">Moneda no informada. No se añaden impuestos ni descuentos. El servidor confirma los precios de venta y el importe al guardar. Puedes registrar entregas o recepciones parciales desde el seguimiento del documento.</p>
   {!review.ready&&<p id="transaction-guidance">{review.message}</p>}
   <button className="primary-button" disabled={!review.ready} aria-describedby={!review.ready?'transaction-guidance':undefined}>{saving?'Guardando…':sale?'Revisar y crear venta':'Revisar y crear orden'}</button>
  </fieldset></form>
  {error&&<p role="alert" className="error-box">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {uncertain&&<div><p>Se bloqueó repetir el alta. Cierra el panel y comprueba el listado antes de preparar otra operación.</p><button type="button" onClick={async()=>{if(await confirmAction('Confirma que revisaste el listado y que esta operación no se registró. Repetir el alta puede crear otro documento.',{title:'Preparar otra operación',confirmLabel:'Ya revisé: habilitar formulario'})){setUncertain(false);setError('');}}}>Ya revisé el listado</button></div>}
 </section>;
}
