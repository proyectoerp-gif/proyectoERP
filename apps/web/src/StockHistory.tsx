import {CatalogSelector} from './CatalogSelector';
import type {CatalogEntry} from './catalogApi';
import {AdminDataTable,StatusBadge,useAdminPresentation} from './AdminUi';
import {movementRequest,warehouseLookup} from './inventoryApi';
import {catalogLookup} from './catalogApi';
import { useEffect, useState, type FormEvent } from 'react';

type Movement = {
  id: string; kind: 'RECEIPT' | 'ISSUE' | 'TRANSFER'; reference: string;
  warehouseId: string; destinationWarehouseId?: string; productId: string;
  quantity: number; userId: string; createdAt?: string;
};
type Option = { id: string; name: string };
type Props = { apiUrl: string; token: string; revision: number;  };
export function StockHistory({ apiUrl, token, revision }: Props) {
  const admin=useAdminPresentation();const [product,setProduct]=useState<CatalogEntry|null>(null);
  const [items, setItems] = useState<Movement[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [query, setQuery] = useState({ reference: '', cursor: '' });
  const [names,setNames]=useState<Record<string,string>>({}),[nameError,setNameError]=useState('');
  const [referenceDraft, setReferenceDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  // After a successful write or balance refresh, return to the newest page.
  useEffect(() => { setQuery((current) => ({ ...current, cursor: '' })); }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setItems([]); setNextCursor(null);
    setNames({});setNameError('');
    movementRequest(apiUrl,token,controller.signal,query.reference,query.cursor,product?.id??'').then(async data=>{
      if(controller.signal.aborted)return;setItems(data.items);setNextCursor(data.nextCursor);
      const productIds=[...new Set(data.items.map(row=>row.productId))],warehouseIds=[...new Set(data.items.flatMap(row=>[row.warehouseId,...(row.destinationWarehouseId?[row.destinationWarehouseId]:[])]))];
      const chunks=(ids:string[])=>Array.from({length:Math.ceil(ids.length/20)},(_,index)=>ids.slice(index*20,index*20+20));
      try{const [products,warehouses]=await Promise.all([Promise.all(chunks(productIds).map(ids=>catalogLookup(apiUrl,'products',token,controller.signal,ids))),Promise.all(chunks(warehouseIds).map(ids=>warehouseLookup(apiUrl,token,controller.signal,ids)))]);if(!controller.signal.aborted)setNames(Object.fromEntries([...products.flat().map(row=>['product:'+row.id,row.name]),...warehouses.flat().map(row=>['warehouse:'+row.id,row.name])]));}catch(e){if(!controller.signal.aborted)setNameError(e instanceof Error?e.message:'No se pudieron consultar los nombres.');}
    }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'No se pudo consultar el historial.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return () => controller.abort();
  }, [apiUrl, token, revision, query.reference, query.cursor, refresh,product?.id]);
  function search(event: FormEvent) {
    event.preventDefault();
    setQuery({ reference: referenceDraft.trim(), cursor: '' });
    setRefresh((value) => value + 1);
  }
  const warehouseName = (id: string) => names['warehouse:'+id] || id;
  const labels = { RECEIPT: 'Entrada', ISSUE: 'Salida', TRANSFER: 'Transferencia' };
  return <section className={admin?"panel":undefined} aria-label="Historial de inventario">
    <h3>Historial de movimientos</h3>
    <p>Busca una referencia exacta para comprobar un guardado. Se muestran hasta 25 movimientos por página, del más reciente al más antiguo.</p>
    <CatalogSelector apiUrl={apiUrl} token={token} kind="products" includeInactive label="Producto del historial" selected={product} disabled={loading} onSelect={row=>{setProduct(row);setQuery(current=>({...current,cursor:''}));}} autoSearch/>{product&&<button onClick={()=>{setProduct(null);setQuery(current=>({...current,cursor:''}));}}>Quitar filtro de producto</button>}
    <form className="admin-filter-toolbar" onSubmit={search}>
      <div className="field"><label htmlFor="stock-history-reference">Referencia exacta (opcional)</label><input id="stock-history-reference" maxLength={100} value={referenceDraft} onChange={(event) => setReferenceDraft(event.target.value)} /></div>
      <button type="submit" disabled={loading}>Buscar / actualizar</button>
      <button type="button" disabled={loading} onClick={() => { setReferenceDraft(''); setProduct(null); setQuery({ reference: '', cursor: '' }); setRefresh((value) => value + 1); }}>Ver todos</button>
    </form>
    {loading && <p role="status">Cargando historial...</p>}
    {nameError&&<p role="alert">Los movimientos siguen disponibles por identificador. {nameError}</p>}{error && <p className="error-box" role="alert">{error}</p>}
    {!loading && !error && !items.length && <p>No hay movimientos que coincidan con esta consulta.</p>}
    {!loading && !error && (admin?<AdminDataTable label="Historial de movimientos de inventario" rows={items} rowKey={row=>row.id} columns={[
 {key:'date',label:'Fecha',render:row=>row.createdAt?new Date(row.createdAt).toLocaleString('es-MX'):'No disponible'},
 {key:'kind',label:'Tipo',render:row=><StatusBadge status={row.kind} label={labels[row.kind]}/>},
 {key:'product',label:'Producto',render:row=>names['product:'+row.productId]||row.productId},
 {key:'warehouse',label:'Almacén',render:row=><>{warehouseName(row.warehouseId)}{row.destinationWarehouseId?' → '+warehouseName(row.destinationWarehouseId):''}</>},
 {key:'quantity',label:'Cantidad',render:row=>Math.abs(row.quantity).toLocaleString('es-MX',{maximumFractionDigits:6})},
 {key:'reference',label:'Referencia',render:row=><>{row.reference}<small>Usuario: {row.userId}</small></>}
 ]}/>:<div className="data-list">{items.map((movement) => <div className="data-row" key={movement.id}>
      <span><strong>{labels[movement.kind]} · {movement.reference}</strong>
        <small>{names['product:'+movement.productId] || movement.productId}</small>
        <small>{warehouseName(movement.warehouseId)}{movement.destinationWarehouseId ? ` → ${warehouseName(movement.destinationWarehouseId)}` : ''}</small>
        <small>{movement.createdAt ? new Date(movement.createdAt).toLocaleString('es-MX') : 'Fecha no disponible'} · Usuario: {movement.userId}</small>
      </span>
      <strong>{Math.abs(movement.quantity).toLocaleString('es-MX', { maximumFractionDigits: 6 })}</strong>
    </div>)}</div>)}
    {nextCursor && <button type="button" disabled={loading} onClick={() => setQuery((current) => ({ ...current, cursor: nextCursor }))}>Ver movimientos anteriores</button>}
    {query.cursor && <button type="button" disabled={loading} onClick={() => setQuery((current) => ({ ...current, cursor: '' }))}>Volver a los más recientes</button>}
  </section>;
}
