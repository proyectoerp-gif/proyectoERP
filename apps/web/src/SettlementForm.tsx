import {TransactionItems} from './TransactionItems';
import {confirmAction} from './interaction';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {WarehouseSelector} from './WarehouseSelector';
import {AccountSelector} from './AccountSelector';
import type {WarehouseEntry} from './inventoryApi';
import type {FinanceAccount} from './financeApi';
import type {Transaction,TransactionKind} from './transactionApi';
import {settlementRequest} from './settlementApi';
import {localDate} from './operationReview';
import {ApiError} from './webApi';
export function SettlementForm({apiUrl,token,kind,row,companyId,branchId,onDone,onCancel,partnerName,productName}:{apiUrl:string;token:string;kind:TransactionKind;row:Transaction;companyId:string;branchId:string;onDone:(id:string)=>void;onCancel:()=>void;partnerName?:string;productName?:string}){
 const [warehouse,setWarehouse]=useState<WarehouseEntry|null>(null),[account,setAccount]=useState<FinanceAccount|null>(null),[date,setDate]=useState(()=>localDate()),[saving,setSaving]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState('');
 const write=useRef<AbortController|null>(null),sale=kind==='sales',locked=saving||uncertain;
 useEffect(()=>()=>write.current?.abort(),[]);
 async function submit(event:FormEvent){
  event.preventDefault();if(write.current||!warehouse||!account||!date)return;
  if(!await confirmAction(`${sale?'Cliente':'Proveedor'}: ${partnerName??row.partnerId}\nArtículos: ${row.items?row.items.map(i=>i.productName+' × '+i.quantity).join(', '):productName??row.productId}\n${row.items?'Artículos distintos: '+row.items.length:'Cantidad: '+row.quantity}\nImporte: ${row.total.toLocaleString('es-MX',{minimumFractionDigits:2})} (moneda no informada)\nAlmacén: ${warehouse.name}\nCuenta: ${account.name}\nFecha de caja: ${date}\n\n${sale?'Se descontarán las existencias y se registrará la entrada de dinero.':'Se sumarán las existencias y se registrará la salida de dinero.'}\nAmbos movimientos se registran juntos. Confirma que no los registraste manualmente.`,{title:sale?'Confirmar cobro y entrega':'Confirmar recepción y pago',confirmLabel:sale?'Cobrar y entregar':'Recibir y pagar'}))return;
  const c=new AbortController();write.current=c;setSaving(true);setError('');
  try{const id=await settlementRequest(apiUrl,token,kind,row,{warehouseId:warehouse.id,accountId:account.id,date},{companyId,branchId},c.signal);if(!c.signal.aborted)onDone(id);}
  catch(error){if(!c.signal.aborted){setUncertain(!(error instanceof ApiError&&error.status>=400&&error.status<500));setError(error instanceof Error?error.message:'No se pudo confirmar la operación.');}}
  finally{write.current=null;if(!c.signal.aborted)setSaving(false);}
 }
 return <section className="panel" aria-busy={saving} data-operation-pending={saving}>
  <p className="erp-next-step">{sale?'Selecciona el almacén del que salen todos los artículos y la cuenta que recibe el cobro.':'Selecciona el almacén que recibe todos los artículos y la cuenta desde la que se paga.'}</p>
  <dl className="erp-operation-review"><div><dt>{sale?'Cliente':'Proveedor'}</dt><dd>{partnerName??'Nombre no disponible'}</dd></div><div><dt>{row.items?'Artículos distintos':'Cantidad'}</dt><dd>{row.items?.length??row.quantity.toLocaleString('es-MX',{maximumFractionDigits:6})}</dd></div><div><dt>Importe confirmado</dt><dd>{row.total.toLocaleString('es-MX',{minimumFractionDigits:2})}</dd></div></dl>
  <TransactionItems row={row} names={{['product:'+row.productId]:productName??row.productId}} cost={!sale}/>
  <details className="record-details"><summary>Ver referencia del documento</summary>{row.id}</details>
  <WarehouseSelector apiUrl={apiUrl} token={token} label={sale?'Almacén de salida':'Almacén de entrada'} selected={warehouse} disabled={locked} onSelect={setWarehouse}/>
  <AccountSelector apiUrl={apiUrl} token={token} label={sale?'Cuenta que recibe el cobro':'Cuenta desde la que se paga'} selected={account} disabled={locked} onSelect={setAccount}/>
  <form onSubmit={event=>void submit(event)}><fieldset disabled={saving}><label htmlFor="settlement-date">Fecha del movimiento de caja</label><input id="settlement-date" type="date" required disabled={locked} value={date} onChange={event=>setDate(event.target.value)}/><p>Moneda no informada. El servidor valida las existencias y registra caja e inventario en una sola operación.</p>
   {!warehouse||!account?<p>Selecciona un almacén y una cuenta para continuar.</p>:null}
   <button className="primary-button" disabled={!warehouse||!account||!date} type="submit">{saving?'Registrando…':uncertain?'Reintentar la misma operación':sale?'Revisar cobro y entrega':'Revisar recepción y pago'}</button><button type="button" onClick={onCancel}>Volver al listado</button>
  </fieldset></form>{error&&<p role="alert" className="error-box">{error}</p>}{uncertain&&<p>No cambies los datos: reintentar la misma operación permite recuperar su comprobante sin duplicarla. También puedes volver al listado para revisar el estado.</p>}
 </section>;
}
