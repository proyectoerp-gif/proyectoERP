import {notifySuccess} from './interaction';
import {AdminCreatePanel,AdminActiveForm,AdminDataTable,StatusBadge,useAdminPresentation} from './AdminUi';
import {CatalogExportButtons} from './CatalogExportButtons';
import {CatalogEdit} from './CatalogEdit';
import type {CatalogEntry} from './catalogApi';
import {CatalogAdmin} from './CatalogAdmin';
import {CategorySelector} from './CategorySelector';
import {categoryLookup,type CategoryRow} from './categoryApi';
import { useEffect, useRef, useState, type FormEvent } from 'react';

type Entry = { id: string; name: string; status: string; email?: string; taxId?: string; sku?: string; price?: number; categoryId?:string };
export function CatalogDirectory({ kind, apiUrl, token, canCreate, companyId, branchId }: {
  kind: 'customers' | 'suppliers' | 'products'; apiUrl: string; token: string; canCreate: boolean; companyId: string; branchId: string;
}) {
  const admin=useAdminPresentation(),creationLock=useRef(false);
  const [editing,setEditing]=useState<CatalogEntry|null>(null);
  const [rows, setRows] = useState<Entry[]>([]);
  const [search,setSearch]=useState(''),[appliedSearch,setAppliedSearch]=useState(''),[cursors,setCursors]=useState(['']),[nextCursor,setNextCursor]=useState<string|null>(null),[revision,setRevision]=useState(0);
  const cursor=cursors[cursors.length-1];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState({ name: '', taxId: '', email: '' });
  const [productDraft, setProductDraft] = useState({ name: '', categoryId: '', sku: '', price: '' });
  const [selectedCategory,setSelectedCategory] = useState<CategoryRow|null>(null);
  const [categoryRevision,setCategoryRevision] = useState(0);
  const [categoryError, setCategoryError] = useState('');
  const [categoryDraft, setCategoryDraft] = useState({ name: '', code: '' });
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryNotice, setCategoryNotice] = useState('');
  const [categoryNames,setCategoryNames]=useState<Record<string,string>>({});
  useEffect(()=>{
    const controller=new AbortController();setCategoryNames({});
    if(admin&&kind==='products'){
      const ids=[...new Set(rows.map(row=>row.categoryId).filter((id):id is string=>!!id))];
      if(ids.length)categoryLookup(apiUrl,token,controller.signal,ids).then(categories=>{if(!controller.signal.aborted)setCategoryNames(Object.fromEntries(categories.map(category=>[category.id,category.name])));}).catch(()=>undefined);
    }
    return()=>controller.abort();
  },[admin,kind,rows,apiUrl,token]);
  async function read(response: Response) {
    if (response.status === 401) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    if (response.status === 403) throw new Error('No tienes permiso para esta operación.');
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || 'No se pudo completar la operación.');
    return result.data;
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setRows([]); setNextCursor(null);
    fetch(`${apiUrl}/${kind}/page?${new URLSearchParams({search:appliedSearch,limit:'20',...(cursor?{cursor}:{})})}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(read).then((data) => {
        if (!data || !Array.isArray(data.items) || data.items.length>20 || !(data.nextCursor===null || typeof data.nextCursor==='string' && /^[a-f0-9]{24}$/i.test(data.nextCursor)) || data.items.some((row:Entry,index:number)=>!row || !/^[a-f0-9]{24}$/i.test(row.id) || typeof row.name!=='string' || (index>0 && row.id.toLowerCase()>=data.items[index-1].id.toLowerCase()) || (cursor && row.id.toLowerCase()>=cursor.toLowerCase())) || data.nextCursor!==null && (data.items.length!==20 || data.nextCursor!==data.items.at(-1)?.id)) throw new Error('El servidor devolvió una página inválida.');
        if (!controller.signal.aborted) {setRows(data.items);setNextCursor(data.nextCursor);}
      }).catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof TypeError ? 'No se pudo conectar con el servidor.' : cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [apiUrl, kind, token,appliedSearch,cursor,revision]);
  async function create(event: FormEvent) {
    event.preventDefault(); if (creationLock.current || saving || categorySaving || !canCreate) return;creationLock.current=true;
    setSaving(true); setError(''); setNotice('');
    try {
      const payload = kind !== 'products' ? draft : { ...productDraft, price: Number(productDraft.price) };
      if (kind === 'products' && (!selectedCategory || selectedCategory.id !== productDraft.categoryId || selectedCategory.status !== 'ACTIVE' || !productDraft.price.trim() || !Number.isFinite(Number(productDraft.price)) || Number(productDraft.price) < 0)) throw new Error('Selecciona una categoría y un precio válido.');
      const data = await read(await fetch(`${apiUrl}/${kind}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      }));
      if (!data?.id) throw new Error('No se pudo confirmar el alta.');
      setCursors(['']);setRevision(value=>value+1);
      setDraft({ name: '', taxId: '', email: '' });
      setProductDraft({ name: '', categoryId: '', sku: '', price: '' });
      setSelectedCategory(null);
      notifySuccess(kind==='products'?'Producto creado.':kind==='customers'?'Cliente creado.':'Proveedor creado.');
      setNotice(kind !== 'products' ? (kind==='customers'?'Cliente creado correctamente.':'Proveedor creado correctamente.') : 'Producto creado correctamente.');
    } catch (cause) { setError(cause instanceof TypeError ? 'No se pudo confirmar el guardado. Revisa el directorio antes de reintentar.' : cause instanceof Error ? cause.message : 'Error al guardar.'); }
    finally { creationLock.current=false;setSaving(false); }
  }
  async function createCategory(event: FormEvent) {
    event.preventDefault();
    if (creationLock.current || categorySaving || saving || !canCreate) return;creationLock.current=true;
    setCategorySaving(true); setCategoryError(''); setCategoryNotice('');
    try {
      const data = await read(await fetch(`${apiUrl}/categories`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({name:categoryDraft.name.trim(),code:categoryDraft.code.trim().toUpperCase()})
      }));
      if (!/^[a-f0-9]{24}$/i.test(data?.id ?? '') || data.status !== 'ACTIVE' || data.name !== categoryDraft.name.trim() || data.code !== categoryDraft.code.trim().toUpperCase()) throw new Error('No se pudo confirmar la categoría creada.');
      setSelectedCategory(data);setCategoryRevision(v=>v+1);
      setProductDraft((current) => ({ ...current, categoryId: data.id }));
      setCategoryDraft({ name: '', code: '' });
      setCategoryNotice('Categoría creada y seleccionada para el producto.');notifySuccess('Categoría creada y seleccionada para el nuevo producto.');
    } catch (cause) {
      setCategoryError(cause instanceof TypeError ? 'No se pudo confirmar el guardado. Revisa las categorías antes de reintentar.' : cause instanceof Error ? cause.message : 'No se pudo crear la categoría.');
    } finally { creationLock.current=false;setCategorySaving(false); }
  }
  return <><span hidden data-operation-pending={saving}/><section className="panel"><CatalogExportButtons base={apiUrl} token={token} kind={kind} search={appliedSearch} companyId={companyId} branchId={branchId} disabled={loading||saving||!!error}/>
    <div className="panel-title"><h3>{kind !== 'products' ? (kind==='customers'?'Clientes':'Proveedores') : 'Productos de la empresa'}</h3><span>{loading ? 'CARGANDO' : `PÁGINA ${cursors.length} · ${rows.length} REGISTROS`}</span></div>
    {editing&&canCreate&&<AdminActiveForm title="Editar registro" onClose={()=>setEditing(null)}><CatalogEdit key={editing.id} apiUrl={apiUrl} token={token} kind={kind} entry={editing} onCancel={()=>setEditing(null)} onSaved={()=>{setEditing(null);setCursors(['']);setRevision(v=>v+1);setNotice('Edición confirmada.');}}/></AdminActiveForm>}
    {kind !== 'products' && canCreate && !editing && <AdminCreatePanel completed={notice} title={kind==='customers'?'Nuevo cliente':'Nuevo proveedor'}><form onSubmit={create} aria-busy={saving}><fieldset disabled={saving || loading} style={{ border: 0, padding: 0 }}><legend>{kind==='customers'?'Nuevo cliente':'Nuevo proveedor'}</legend>
      <div className="field"><label htmlFor="supplier-name">Nombre</label><input id="supplier-name" required minLength={2} maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
      <div className="field"><label htmlFor="supplier-tax">Identificador fiscal</label><input id="supplier-tax" required minLength={3} maxLength={32} value={draft.taxId} onChange={(e) => setDraft({ ...draft, taxId: e.target.value })} /></div>
      <div className="field"><label htmlFor="supplier-email">Correo</label><input id="supplier-email" type="email" required maxLength={254} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
      <button className="primary-button" type="submit">{saving ? 'Guardando...' : (kind==='customers'?'Crear cliente':'Crear proveedor')}</button>
    </fieldset></form>{admin&&error&&<p role="alert">{error}</p>}{admin&&notice&&<p role="status">{notice}</p>}</AdminCreatePanel>}
    {kind === 'products' && canCreate && !editing && <AdminCreatePanel completed={categoryNotice} title="Nueva categoría" primary={false}><form onSubmit={createCategory} aria-busy={categorySaving} data-operation-pending={categorySaving}>
      <fieldset disabled={categorySaving || saving} style={{ border: 0, padding: 0 }}>
        <legend>Nueva categoría</legend>
        <div className="field"><label htmlFor="category-name">Nombre</label><input id="category-name" required minLength={2} maxLength={100} value={categoryDraft.name} onChange={(e) => setCategoryDraft({ ...categoryDraft, name: e.target.value })} /></div>
        <div className="field"><label htmlFor="category-code">Código</label><input id="category-code" required minLength={2} maxLength={24} value={categoryDraft.code} onChange={(e) => setCategoryDraft({ ...categoryDraft, code: e.target.value })} /></div>
        <button className="primary-button" type="submit">{categorySaving ? 'Guardando...' : 'Crear categoría'}</button>
      </fieldset>
      {categoryNotice && <p role="status">{categoryNotice}</p>}{categoryError && <p role="alert">{categoryError}</p>}
    </form></AdminCreatePanel>}
    {kind === 'products' && canCreate && !editing && <AdminCreatePanel completed={notice} title="Nuevo producto"><form onSubmit={create} aria-busy={saving}><fieldset disabled={saving || loading || categorySaving} style={{ border: 0, padding: 0 }}><legend>Nuevo producto</legend>
      <div className="field"><label htmlFor="product-name">Nombre</label><input id="product-name" required minLength={2} maxLength={120} value={productDraft.name} onChange={(e) => setProductDraft({ ...productDraft, name: e.target.value })} /></div>
      <CategorySelector key={categoryRevision} apiUrl={apiUrl} token={token} label="Categoría activa" selected={selectedCategory} disabled={saving || categorySaving} onSelect={row=>{setSelectedCategory(row);setProductDraft(current=>({...current,categoryId:row.id}));}}/>
      <div className="field"><label htmlFor="product-sku">Código del producto (SKU)</label><input id="product-sku" required maxLength={48} value={productDraft.sku} onChange={(e) => setProductDraft({ ...productDraft, sku: e.target.value })} /></div>
      <div className="field"><label htmlFor="product-price">Precio</label><input id="product-price" type="number" required min="0" step="0.01" value={productDraft.price} onChange={(e) => setProductDraft({ ...productDraft, price: e.target.value })} /></div>
      <button className="primary-button" type="submit">{saving ? 'Guardando...' : 'Crear producto'}</button>
    </fieldset>{categoryError && <p role="alert">{categoryError}</p>}</form>{admin&&error&&<p role="alert">{error}</p>}{admin&&notice&&<p role="status">{notice}</p>}</AdminCreatePanel>}
    {error && <p className="error-box" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <form className="admin-filter-toolbar" onSubmit={event=>{event.preventDefault();setAppliedSearch(search.trim());setCursors(['']);setRevision(value=>value+1);}}><div className="field"><label htmlFor={kind+'-search'}>Buscar en el catálogo</label><input id={kind+'-search'} maxLength={100} value={search} disabled={saving} onChange={event=>setSearch(event.target.value)}/></div><button type="submit" disabled={loading||saving}>Buscar</button><button type="button" disabled={loading||saving} onClick={()=>{setSearch('');setAppliedSearch('');setCursors(['']);setRevision(value=>value+1);}}>Ver todos</button></form>
    {!loading && !error && !rows.length && <p className="empty-state">{appliedSearch?'No encontramos coincidencias. Prueba con otro nombre.':kind==='products'?'Aún no hay productos. Empieza creando una categoría y agregando tu primer producto.':kind==='customers'?'Aún no hay clientes registrados.':'Aún no hay proveedores registrados.'}</p>}
    {admin?<AdminDataTable label={kind==='products'?'Productos':'Contactos'} rows={rows} rowKey={row=>row.id} columns={[
 {key:'name',label:'Nombre',render:row=><strong>{row.name}</strong>},
 ...(kind==='products'?[{key:'sku',label:'SKU',render:(row:Entry)=>row.sku},{key:'category',label:'Categoría',render:(row:Entry)=><>{categoryNames[row.categoryId??'']??'Nombre no disponible'}{row.categoryId&&<details className="record-details"><summary>Referencia</summary><small>{row.categoryId}</small></details>}</>},{key:'price',label:'Precio',render:(row:Entry)=><>{row.price?.toLocaleString('es-MX',{minimumFractionDigits:2})??'No informado'}<small>Moneda no informada</small></>}]:[{key:'tax',label:'Identificador fiscal',render:(row:Entry)=>row.taxId},{key:'email',label:'Correo',render:(row:Entry)=>row.email}]),
 {key:'status',label:'Estado',render:row=><StatusBadge status={row.status} label={row.status==='ACTIVE'?'Activo':'Inactivo'}/>},
 ...(canCreate?[{key:'actions',label:'Acciones',render:(row:Entry)=><button type="button" disabled={saving||!!editing} onClick={()=>setEditing(row as CatalogEntry)}>Editar</button>}]:[])
 ]}/>:<div className="data-list">{rows.map((row) => <div className="data-row" key={row.id}><span><strong>{row.name}</strong><small>{kind !== 'products' ? `${row.taxId} · ${row.email}` : row.sku}</small></span><strong>{kind === 'products' ? row.price?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : row.status==='ACTIVE'?'Activo':'Inactivo'}</strong>{canCreate&&<button type="button" disabled={saving||!!editing} onClick={()=>setEditing(row as CatalogEntry)}>Editar</button>}</div>)}</div>}
    <div className="admin-pagination" style={{display:'flex',gap:12,marginTop:16}}><button disabled={loading||saving||cursors.length===1} onClick={()=>setCursors(value=>value.slice(0,-1))}>Anterior</button><button disabled={loading||saving||!nextCursor} onClick={()=>{if(nextCursor)setCursors(value=>[...value,nextCursor]);}}>Siguiente</button><button disabled={loading||saving} onClick={()=>{setCursors(['']);setRevision(value=>value+1);}}>Actualizar</button></div>
  </section>{kind==='products'&&<CatalogAdmin key={'category-admin-'+categoryRevision} apiUrl={apiUrl} token={token} kind="categories" canEdit={canCreate} disabled={saving||categorySaving||!!editing} onChanged={()=>{setSelectedCategory(null);setProductDraft(v=>({...v,categoryId:''}));setCategoryRevision(v=>v+1);}}/>}</>;
}
