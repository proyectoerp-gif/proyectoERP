import {transactionItems,type Transaction} from './transactionApi';
export const money=(value:number)=>value.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
export function TransactionItems({row,names={},cost=false}:{row:Transaction;names?:Record<string,string>;cost?:boolean}){
 return <div className="erp-document-items" aria-label="Artículos del documento">{transactionItems(row).map(item=><div className="erp-document-item" key={item.productId}><div><strong>{item.productName||names['product:'+item.productId]||item.productId}</strong>{item.sku&&<small>{item.sku}</small>}<small>{item.quantity.toLocaleString('es-MX',{maximumFractionDigits:6})} × {money(item.unitPrice)} · {cost?'Costo':'Precio'} unitario</small></div><strong>{money(item.total)}</strong></div>)}</div>;
}
