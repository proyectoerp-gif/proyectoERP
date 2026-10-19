import {DocumentExportButtons} from './DocumentExportButtons';
import {receiptDocument} from './commercialDocuments';
import {TransactionItems} from './TransactionItems';
import {useEffect,useState} from 'react';
import {ApiError} from './webApi';
import {receiptRequest,type CommercialReceipt} from './settlementApi';
import {transactionStatusLabel} from './transactionLabels';
import type {Transaction,TransactionKind} from './transactionApi';
export function ReceiptView({base,token,kind,row,companyId,branchId,onClose,names={}}:{base:string;token:string;kind:TransactionKind;row:Transaction;companyId:string;branchId:string;onClose:()=>void;names?:Record<string,string>}){
 const [data,setData]=useState<CommercialReceipt|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 useEffect(()=>{const c=new AbortController();setLoading(true);setError('');setData(null);receiptRequest(base,token,kind,row,{companyId,branchId},c.signal).then(value=>{if(!c.signal.aborted)setData(value);}).catch(error=>{if(!c.signal.aborted)setError(error instanceof ApiError&&error.status===404?'Este documento no tiene comprobante de operación conjunta. Actualiza el listado para comprobar su estado.':error instanceof Error?error.message:'No se pudo consultar el comprobante.');}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[base,token,kind,row,companyId,branchId,revision]);
 return <section className="panel"><h3>Resultado de la operación</h3>{loading?<p role="status">Consultando el comprobante…</p>:error?<p role="alert">{error}</p>:data&&<>
  <p className="erp-next-step">{kind==='sales'?'Venta cobrada y entregada.':'Compra recibida y pagada.'} Los movimientos de caja e inventario quedaron registrados juntos.</p>
  <dl className="erp-operation-review"><div><dt>Estado</dt><dd>{transactionStatusLabel(kind,data.status)}</dd></div><div><dt>Fecha de caja</dt><dd>{data.date}</dd></div><div><dt>{data.items?'Artículos distintos':'Cantidad'}</dt><dd>{data.items?.length??data.quantity.toLocaleString('es-MX',{maximumFractionDigits:6})}</dd></div><div><dt>Importe · moneda no informada</dt><dd>{data.total.toLocaleString('es-MX',{minimumFractionDigits:2})}</dd></div></dl>
  <DocumentExportButtons document={receiptDocument(data,row,kind,companyId,branchId,names)}/><TransactionItems row={row} names={names} cost={kind==='purchase-orders'}/>
  <details className="record-details"><summary>Referencias del comprobante y movimientos</summary><dl>{Object.entries({Documento:row.id,Comprobante:data.id,Almacén:data.warehouseId,Cuenta:data.accountId,...Object.fromEntries(data.items?.map((item,index)=>['Inventario · '+(index+1)+' · '+item.productName,item.stockMovementId])??[['Movimiento de inventario',data.stockMovementId]]),'Movimiento de caja':data.cashMovementId}).map(([label,value])=><div key={label}><dt>{label}</dt><dd style={{overflowWrap:'anywhere'}}>{value}</dd></div>)}</dl></details>
 </>}<button disabled={loading} onClick={()=>setRevision(value=>value+1)}>Actualizar comprobante</button><button onClick={onClose}>Volver al listado</button></section>;
}
