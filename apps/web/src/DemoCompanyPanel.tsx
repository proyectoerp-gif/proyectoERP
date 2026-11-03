import { useMemo, useState } from 'react';
import { makeDemoProducts, demoCompany, filterDemoProducts } from './demoProducts';
import { catalogDocument } from './exportDocument';
import { DocumentExportButtons } from './DocumentExportButtons';
import { AdminDataTable, StatusBadge } from './AdminUi';
export function DemoCompanyPanel({ onClose }: { onClose: () => void }) {
  const products = useMemo(makeDemoProducts, []);
  const [query, setQuery] = useState(''), [page, setPage] = useState(0);
  const filtered = useMemo(() => filterDemoProducts(products, query), [products, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20));
  return <main style={{maxWidth:1100,margin:'0 auto',padding:'32px 20px'}}><section className="panel">
    <div className="eyebrow">EMPRESA DE DEMOSTRACIÓN · LOCAL</div><h1>{demoCompany.name}</h1>
    <p>2,000 productos ficticios: 1,800 activos y 200 inactivos. Funciona sin conexión y no guarda registros en tu empresa. Los productos de demostración no se usan en movimientos reales.</p>
    <div className="admin-list-filters"><label>Buscar nombre o SKU<input type="search" maxLength={100} value={query} onChange={event => { setQuery(event.target.value); setPage(0); }}/></label></div>
    <p role="status">{filtered.length} resultados · Página {page + 1} de {totalPages}</p>
    <DocumentExportButtons document={catalogDocument('products', filtered, demoCompany.name, undefined, query, true)}/>
    <p>La exportación incluye todos los resultados del filtro. Sin filtro incluye los 2,000 productos. Precios sin moneda informada; no representa existencias.</p>
    <AdminDataTable label="Productos de demostración" rows={filtered.slice(page*20,page*20+20)} rowKey={row=>row.id} columns={[
      {key:'product',label:'Producto',render:row=><><strong>{row.name}</strong><small>{row.sku}</small></>},
      {key:'amount',label:'Precio',render:row=>row.price?.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})??'—'},
      {key:'status',label:'Estado',render:row=><StatusBadge status={row.status} label={row.status==='ACTIVE'?'Activo':'Inactivo'}/>},
    ]}/>
    {!filtered.length && <p className="directory-feedback">No hay coincidencias. Prueba otro nombre o SKU.</p>}
    <div className="admin-pagination" role="group" aria-label="Navegación de productos">
      <button type="button" disabled={page===0} onClick={()=>setPage(value=>value-1)}>Anterior</button>
      <button type="button" disabled={page+1>=totalPages} onClick={()=>setPage(value=>value+1)}>Siguiente</button>
      <button type="button" onClick={onClose}>Salir de la demostración</button>
    </div>
  </section></main>;
}
