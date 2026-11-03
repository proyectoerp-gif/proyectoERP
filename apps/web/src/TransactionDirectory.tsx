import {DocumentExportButtons} from './DocumentExportButtons';
import {PagedExportButtons} from './PagedExportButtons';
import {transactionsDocument} from './listDocuments';
import {exportNames} from './exportNames';
import {CommercialActivityPanel} from './CommercialActivityPanel';
import {TransactionItems} from './TransactionItems';
import {confirmAction,notifySuccess} from './interaction';
import {AdminActiveForm,AdminDataTable,StatusBadge,useAdminPresentation} from './AdminUi';
import {transactionStatusLabel} from './transactionLabels';
import {ReceiptView} from './ReceiptView';
import {SettlementForm} from './SettlementForm';
import {useEffect,useRef,useState} from 'react';
import {catalogLookup} from './catalogApi';
import {transactionPageRequest,transactionStatusOptions,updateTransactionStatusRequest,type Transaction,type TransactionKind} from './transactionApi';
export function TransactionDirectory({apiUrl,token,kind,canEdit,canSettle,externalRevision,companyId,branchId}:{apiUrl:string;token:string;kind:TransactionKind;canEdit:boolean;canSettle:boolean;externalRevision:number;companyId:string;branchId:string}) {
 const admin=useAdminPresentation();
 const [activity,setActivity]=useState<Transaction|null>(null);
 const [receipt,setReceipt]=useState<Transaction|null>(null);
 const [settling,setSettling]=useState<Transaction|null>(null);
 const [rows,setRows]=useState<Transaction[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[status,setStatus]=useState(''),[cursors,setCursors]=useState(['']),[next,setNext]=useState<string|null>(null),[revision,setRevision]=useState(0);
 const [searchDraft,setSearchDraft]=useState(''),[search,setSearch]=useState('');
 const [names,setNames]=useState<Record<string,string>>({}),[nameError,setNameError]=useState('');
 const write=useRef<AbortController|null>(null),cursor=cursors[cursors.length-1];useEffect(()=>()=>write.current?.abort(),[]);
 useEffect(()=>{setCursors(['']);setRevision(v=>v+1);},[externalRevision]);
 useEffect(()=>{const c=new AbortController();setLoading(true);setError('');setRows([]);setNames({});setNameError('');setNext(null);transactionPageRequest(apiUrl,token,kind,c.signal,cursor,status,search).then(async page=>{if(c.signal.aborted)return;setRows(page.items);setNext(page.nextCursor);try{const groups=await Promise.all([catalogLookup(apiUrl,kind==='sales'?'customers':'suppliers',token,c.signal,page.items.map(row=>row.partnerId)),catalogLookup(apiUrl,'products',token,c.signal,page.items.map(row=>row.productId))]);if(!c.signal.aborted)setNames(Object.fromEntries(groups.flatMap((rows,index)=>rows.map(row=>[(index===0?'partner:':'product:')+row.id,row.name]))));}catch(e){if(!c.signal.aborted)setNameError(e instanceof Error?e.message:'No se pudieron consultar los nombres.');}}).catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:'No se pudo consultar.');}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[apiUrl,token,kind,cursor,status,search,revision]);
 async function change(row:Transaction,target:string) {
  if(write.current||!canEdit||loading)return;
  if(!await confirmAction(`${kind==='sales'?'Cliente':'Proveedor'}: ${names['partner:'+row.partnerId]??row.partnerId}\nArtículos: ${row.items?row.items.map(i=>i.productName+' × '+i.quantity).join(', '):names['product:'+row.productId]??row.productId}\nEstado actual: ${transactionStatusLabel(kind,row.status)}\nNuevo estado: ${transactionStatusLabel(kind,target)}\nImporte: ${row.total.toFixed(2)}\n\nEste cambio no registra movimientos de inventario ni caja.`,{title:target==='APROBADA'?'Aprobar orden de compra':'Cancelar documento',confirmLabel:target==='APROBADA'?'Aprobar compra':'Cancelar documento',danger:target!=='APROBADA'}))return;
  const c=new AbortController();write.current=c;setSaving(true);setError('');setNotice('');
  try{await updateTransactionStatusRequest(apiUrl,token,kind,row,target,c.signal);if(c.signal.aborted)return;setNotice(target==='APROBADA'?'Compra aprobada. Ya puedes recibirla y pagarla.':'Registro cancelado. No se movieron existencias ni dinero.');notifySuccess(target==='APROBADA'?'Compra aprobada. Continúa con «Pagos, entregas y devoluciones».':'Registro cancelado.');if(target==='APROBADA')setStatus('APROBADA');setCursors(['']);setRevision(v=>v+1);}catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:'No se pudo confirmar el estado. Actualiza antes de reintentar.');}finally{write.current=null;if(!c.signal.aborted)setSaving(false);}
 }
 const statuses=kind==='sales'?['PENDIENTE','PAGADA','CANCELADA']:['PENDIENTE','APROBADA','RECIBIDA','CANCELADA'];const locked=loading||saving||!!settling||!!activity;
 const statusLabel=(row:Transaction)=>row.activityVersion&&(row.status==='PENDIENTE'||row.status==='APROBADA')
  ?'Con seguimiento':transactionStatusLabel(kind,row.status);
 const rowActions=(row:Transaction)=>{
  const canOpenActivity=row.status!=='CANCELADA'||Boolean(row.activityVersion);
  const canOpenReceipt=!row.activityVersion&&(row.status==='PAGADA'||row.status==='RECIBIDA');
  const canComplete=canSettle&&!row.activityVersion&&row.total>0
    &&(kind==='sales'?row.status==='PENDIENTE':row.status==='APROBADA');
  const transitions=canEdit&&!row.activityVersion?transactionStatusOptions(kind,row.status):[];
  return <div className="admin-row-actions transaction-row-actions">
    {canOpenActivity&&<button className="transaction-follow-up" disabled={locked} onClick={()=>setActivity(row)}>Pagos, entregas y devoluciones</button>}
    {canOpenReceipt&&<button disabled={locked} onClick={()=>setReceipt(row)}>Ver comprobante</button>}
    {canComplete&&<button disabled={locked} onClick={()=>setSettling(row)}>{kind==='sales'?'Cobrar y entregar':'Recibir y pagar'}</button>}
    {transitions.map(target=><button key={target} disabled={locked} onClick={()=>void change(row,target)}>{target==='APROBADA'?'Aprobar':'Cancelar registro'}</button>)}
    <DocumentExportButtons document={transactionsDocument(kind,[row],names,companyId,branchId,'Documento individual')}/>
  </div>;
 };
 return <><span hidden data-operation-pending={saving}/>{activity&&<AdminActiveForm completed={revision} title="Pagos, entregas y devoluciones" onClose={()=>setActivity(null)}><CommercialActivityPanel base={apiUrl} token={token} kind={kind} row={activity} canWrite={canSettle} onChanged={()=>{setCursors(['']);setRevision(value=>value+1);}}/></AdminActiveForm>}{receipt&&<AdminActiveForm title="Comprobante de la operación" onClose={()=>setReceipt(null)}><ReceiptView names={names} key={receipt.id} base={apiUrl} token={token} kind={kind} row={receipt} companyId={companyId} branchId={branchId} onClose={()=>setReceipt(null)}/></AdminActiveForm>}{settling&&<AdminActiveForm title={kind==='sales'?'Cobrar y entregar':'Recibir y pagar'} onClose={()=>setSettling(null)}><SettlementForm partnerName={names['partner:'+settling.partnerId]} productName={names['product:'+settling.productId]} key={settling.id} apiUrl={apiUrl} token={token} kind={kind} row={settling} companyId={companyId} branchId={branchId} onCancel={()=>setSettling(null)} onDone={id=>{const completed=settling;setSettling(null);setNotice('Operación conjunta confirmada. Comprobante: '+id);notifySuccess(kind==='sales'?'Venta cobrada y entregada. Caja e inventario actualizados.':'Compra recibida y pagada. Caja e inventario actualizados.');setCursors(['']);setRevision(v=>v+1);if(completed)setReceipt({...completed,status:kind==='sales'?'PAGADA':'RECIBIDA'});}}/></AdminActiveForm>}<section className="panel"><h3>{kind==='sales'?'Ventas registradas':'Órdenes de compra'}</h3><PagedExportButtons<Transaction> scopeKey={[apiUrl,token,kind,status,search,companyId,branchId].join('|')} disabled={locked||!!error} rowKey={r=>r.id} fetchPage={(cursor,signal)=>transactionPageRequest(apiUrl,token,kind,signal,cursor,status,search)} buildDocument={async(rows,signal)=>transactionsDocument(kind,rows,await exportNames(apiUrl,token,signal,[{kind:kind==='sales'?'customers':'suppliers',prefix:'partner',ids:rows.map(r=>r.partnerId)},{kind:'products',prefix:'product',ids:rows.filter(r=>!r.items).map(r=>r.productId)}]),companyId,branchId,[status?transactionStatusLabel(kind,status):'Todos los estados',search?'Búsqueda: '+search:''].filter(Boolean).join(' · '))}/><form className="admin-filter-toolbar transaction-filters" aria-label="Filtrar documentos" onSubmit={event=>{event.preventDefault();setSearch(searchDraft.trim());setCursors(['']);setRevision(value=>value+1);}}>
 <div className="field"><label htmlFor={kind+'-search'}>Buscar documentos</label><input id={kind+'-search'} type="search" value={searchDraft} maxLength={80} onChange={event=>setSearchDraft(event.target.value)} placeholder="Artículo, SKU o referencia"/></div>
 <div className="field"><label htmlFor={kind+'-status'}>Estado</label><select id={kind+'-status'} value={status} disabled={saving||!!settling} onChange={e=>{setStatus(e.target.value);setCursors(['']);setNotice('');}}><option value="">Todos</option>{statuses.map(value=><option key={value} value={value}>{transactionStatusLabel(kind,value)}</option>)}</select></div><button type="submit" disabled={locked}>Buscar</button>{(search||status)&&<button type="button" disabled={locked} onClick={()=>{setSearchDraft('');setSearch('');setStatus('');setCursors(['']);}}>Limpiar filtros</button>}</form>{loading&&<p className="directory-feedback" role="status">Consultando registros…</p>}{error&&<p role="alert" className="error-box">{error}</p>}{notice&&<p role="status">{notice}</p>}{nameError&&<p role="alert">Los registros siguen disponibles por identificador. {nameError}</p>}{!loading&&!error&&<><p>Página {cursors.length} · {rows.length} registros</p>{!rows.length&&<div className="directory-feedback"><strong>No encontramos registros</strong><p>{status||search?"Cambia la búsqueda o el filtro de estado para ver otros resultados.":"Los documentos nuevos aparecerán aquí."}</p></div>}{admin?<AdminDataTable label={kind==='sales'?'Ventas registradas':'Órdenes de compra'} rows={rows} rowKey={row=>row.id} columns={[
 {key:'status',label:'Estado',render:row=><StatusBadge status={row.status} label={statusLabel(row)}/>},
 {key:'partner',label:kind==='sales'?'Cliente':'Proveedor',render:row=><><strong>{names['partner:'+row.partnerId]??row.partnerId}</strong><details className="record-details"><summary>Referencia</summary><small>{row.id}</small></details></>},
 {key:'product',label:'Artículos',render:row=>row.items?<details className="record-details"><summary>{row.items.length} artículos</summary><TransactionItems row={row} cost={kind==='purchase-orders'}/></details>:names['product:'+row.productId]??row.productId},
 {key:'quantity',label:'Cantidad',render:row=>row.items?'Por artículo':row.quantity.toLocaleString('es-MX',{maximumFractionDigits:6})},
 {key:'amount',label:'Importe',render:row=><><strong>{row.total.toLocaleString('es-MX',{minimumFractionDigits:2})}</strong><small>Moneda no informada</small></>},
 {key:'actions',label:'Acciones',render:rowActions}
 ]}/>:<div className="data-list">{rows.map(row=><article className="transaction-record" key={row.id}>
  <div className="transaction-record-heading">
    <div><strong>{names['partner:'+row.partnerId]??row.partnerId}</strong><small>{row.total.toLocaleString('es-MX',{minimumFractionDigits:2})} · Moneda no informada</small></div>
    <StatusBadge status={row.status} label={statusLabel(row)}/>
  </div>
  <TransactionItems row={row} names={names} cost={kind==='purchase-orders'}/>
  {rowActions(row)}
  <details className="record-details"><summary>Ver referencia</summary><small>{row.id}</small></details>
 </article>)}</div>}</>}<div className="admin-pagination" style={{display:'flex',gap:12,marginTop:16}}><button disabled={locked||cursors.length===1} onClick={()=>setCursors(v=>v.slice(0,-1))}>Anterior</button><button disabled={locked||!next} onClick={()=>{if(next)setCursors(v=>[...v,next]);}}>Siguiente</button><button disabled={locked} onClick={()=>{setCursors(['']);setRevision(v=>v+1);}}>{error?'Reintentar':'Actualizar'}</button></div></section></>;
}
