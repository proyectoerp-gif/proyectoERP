import {EditorSheet,FormSection} from './EditorSheet';
import {DataField} from './ModuleLayout';
import {QueryBar} from './QueryBar';
import {FilterBar} from './ModuleLayout';
import {ActionButton} from './ModuleLayout';
import {ModuleSection,RecordCard} from './ModuleLayout';
import {useNavigationGuard,useNativeNavigation} from './NavigationGuard';
import {CategoriesPanel} from './CategoriesPanel';
import {CatalogLifecycleButton} from './CatalogLifecycleButton';
import { CatalogExportButtons } from './CatalogExportButtons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from './ui';
import { ApiError, catalogServerPage, createPartner, updatePartner, type CatalogEntry, type CatalogKind } from './api';
import { ProductForm } from './ProductForm';

const titles: Record<CatalogKind, string> = { customers: 'Clientes', suppliers: 'Proveedores', products: 'Productos' };
export function CatalogPanel({ base, token, kind, companyId, branchId, accent, canCreate, canEdit=canCreate, onExpired, onClose, onEdit }: {
  base: string; token: string; kind: CatalogKind; companyId: string; branchId: string; accent: string; canCreate: boolean; canEdit?:boolean; onExpired: () => void; onClose: () => void; onEdit: () => void;
}) {
  const [formOpen,setFormOpen]=useState(false);
  const [status,setStatus]=useState<'ACTIVE'|'INACTIVE'|''>('ACTIVE');
  const [productBusy, setProductBusy] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogEntry | null>(null);
  const [rows, setRows] = useState<CatalogEntry[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [cursors, setCursors] = useState<string[]>(['']);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const cursor = cursors[cursors.length - 1];
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState({ name: '', taxId: '', email: '' });
  const [editingOriginal,setEditingOriginal]=useState<CatalogEntry|null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const saveController = useRef<AbortController | null>(null);
  useEffect(() => () => saveController.current?.abort(), []);
  async function save() {
    if (kind === 'products' || !(editingId?canEdit:canCreate) || saveController.current) return;
    const controller = new AbortController();
    saveController.current = controller;
    setSaving(true); setSaveError(''); setNotice('');
    try {
      if (editingId) await updatePartner(base, kind, token, editingId, draft, controller.signal, editingOriginal ?? undefined);
      else await createPartner(base, kind, token, draft, controller.signal);
      if (controller.signal.aborted) return;
      setFormOpen(false);setDraft({ name: '', taxId: '', email: '' }); setQuery(''); setSearch(''); setCursors(['']);
      setNotice(editingId ? 'Contacto actualizado correctamente.' : 'Registro creado correctamente.'); setEditingOriginal(null); setEditingId(null); setRevision((value) => value + 1);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setSaveError(failure instanceof Error ? failure.message : 'No se pudo confirmar el guardado.');
    } finally {
      saveController.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    setRows([]); setNextCursor(null); setLoading(true); setError('');
    catalogServerPage(base, kind, token, controller.signal, search, cursor, status).then((data) => {
      if (!controller.signal.aborted) { setRows(data.items); setNextCursor(data.nextCursor); }
    }).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setError(failure instanceof Error ? failure.message : 'No se pudo consultar el catálogo.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [base, token, kind, revision, search, cursor, status, onExpired]);
  const busy = saving || productBusy;
  const navigation=useNativeNavigation();
  useNavigationGuard(busy,formOpen&&kind!=='products'&&(editingOriginal?draft.name!==editingOriginal.name||draft.taxId!==editingOriginal.taxId||draft.email!==editingOriginal.email:!!draft.name||!!draft.taxId||!!draft.email));

  return <ModuleSection style={styles.panel}>
    <Text style={styles.title}>{titles[kind]}</Text>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12}}>{canCreate&&!formOpen&&<ActionButton icon="plus" variant="primary" disabled={busy} onPress={()=>setFormOpen(true)}>{kind==='products'?'Nuevo producto':kind==='customers'?'Nuevo cliente':'Nuevo proveedor'}</ActionButton>}<CatalogExportButtons base={base} token={token} kind={kind} search={search} status={status} companyId={companyId} branchId={branchId} accent={accent} disabled={loading || busy || !!error} onExpired={onExpired}/></View>
    {kind==='products'&&<CategoriesPanel base={base} token={token} accent={accent} onExpired={onExpired} canCreate={canCreate} canEdit={canEdit}/>}
    {kind === 'products' && formOpen && (editingProduct?canEdit:canCreate) ? <EditorSheet title={editingProduct?'Editar producto':'Nuevo producto'} icon="package" busy={productBusy} onClose={()=>{setEditingProduct(null);setFormOpen(false);}}><ProductForm onBusy={setProductBusy} key={editingProduct?.id ?? 'new-product'} editing={editingProduct} onCancel={() => navigation.navigate(()=>{setEditingProduct(null);setFormOpen(false);})} base={base} token={token} accent={accent} onExpired={onExpired} onCreated={() => { setFormOpen(false);setNotice(editingProduct ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.'); setEditingProduct(null); setQuery(''); setSearch(''); setCursors(['']); setRevision((value) => value + 1); }} /></EditorSheet> : null}
    {kind === 'products' && notice ? <Text accessibilityRole="alert" style={styles.note}>{notice}</Text> : null}
    <Text style={styles.note}>{kind === 'products' ? 'Catálogo de la empresa; no representa existencias.' : 'Contactos de tu empresa y sucursal.'}</Text>
    {kind !== 'products' && formOpen && (editingId?canEdit:canCreate) ? <EditorSheet title={editingId?'Editar contacto':kind==='customers'?'Nuevo cliente':'Nuevo proveedor'} icon="users" busy={saving} onClose={()=>{setFormOpen(false);setEditingOriginal(null);setEditingId(null);setDraft({name:'',taxId:'',email:''});setSaveError('');}}>
<FormSection title="Datos del contacto" icon="user">
      <Text style={styles.name}>{editingId ? 'Editar contacto' : kind === 'customers' ? 'Nuevo cliente' : 'Nuevo proveedor'}</Text>
      {(['name', 'taxId', 'email'] as const).map((field) => <View key={field}>
        <Text style={styles.note}>{field === 'name' ? 'Nombre' : field === 'taxId' ? 'Identificador fiscal' : 'Correo electrónico'}</Text>
        <TextInput accessibilityLabel={field === 'name' ? 'Nombre del contacto' : field === 'taxId' ? 'Identificador fiscal del contacto' : 'Correo del contacto'} editable={!saving} autoCapitalize={field === 'email' ? 'none' : field === 'taxId' ? 'characters' : 'words'} keyboardType={field === 'email' ? 'email-address' : 'default'} maxLength={field === 'name' ? 120 : field === 'taxId' ? 32 : 254} value={draft[field]} onChangeText={(value) => setDraft((current) => ({ ...current, [field]: value }))} style={styles.input} />
      </View>)}
      {saveError ? <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text> : null}
      {notice ? <Text style={styles.note}>{notice}</Text> : null}
      <ActionButton accessibilityRole="button" disabled={saving || loading || !!error} onPress={save} style={styles.actions}>{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar contacto'}</ActionButton>
    {formOpen ? <ActionButton disabled={saving} onPress={() => { setFormOpen(false);setEditingOriginal(null); setEditingId(null); setDraft({ name: '', taxId: '', email: '' }); setSaveError(''); setNotice(''); }}>Cancelar edición</ActionButton> : null}
    </FormSection></EditorSheet> : kind !== 'products' && !canCreate&&!canEdit ? <Text style={styles.note}>Tu cuenta puede consultar estos contactos.</Text> : null}
    <QueryBar accessibilityLabel="Buscar en el catálogo" placeholder={kind==='products'?'Buscar producto o SKU…':'Buscar nombre o correo…'} maxLength={100} editable={!busy} value={query} onChangeText={setQuery} busy={busy||loading} onSearch={()=>{setSearch(query.trim());setCursors(['']);setRevision(v=>v+1);}}/>
    {loading ? <Text style={styles.note}>Consultando catálogo…</Text> : error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : <>
      <Text style={styles.note}>{rows.length} registros en esta página · Página {cursors.length}</Text>
      {!rows.length ? <Text style={styles.note}>{search ? 'No hay coincidencias en esta página.' : 'No hay registros en esta página.'}</Text> : null}
      <FilterBar style={{flexDirection:'row',gap:12,marginVertical:10}}>{([['ACTIVE','Activos'],['INACTIVE','Retirados'],['','Todos']] as const).map(([value,label])=><Pressable key={value} disabled={busy} accessibilityState={{selected:status===value}} onPress={()=>{setStatus(value);setCursors(['']);}}><Text style={{color:accent,fontWeight:status===value?'700':'400'}}>{label}</Text></Pressable>)}</FilterBar>
      {rows.map((row) => <RecordCard status={row.status} style={styles.row} key={row.id}>
        <Text style={styles.name}>{row.name}</Text>{kind==='products'?<Text style={{fontSize:18,fontWeight:'700',color:accent}}>{row.price?.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>:<Text style={styles.note}>{row.email||row.taxId||'Sin información de contacto'}</Text>}
        {kind === 'products' && canEdit && row.categoryId ? <ActionButton accessibilityRole="button" disabled={productBusy} onPress={() => { setFormOpen(true);setNotice(''); setEditingProduct(row); onEdit(); }}>Editar producto</ActionButton> : null}
        {kind !== 'products' && canEdit ? <ActionButton accessibilityRole="button" disabled={saving} onPress={() => { setFormOpen(true);setEditingOriginal(row); setEditingId(row.id); setDraft({ name: row.name, taxId: row.taxId ?? '', email: row.email ?? '' }); setSaveError(''); setNotice(''); onEdit(); }}>Editar contacto</ActionButton> : null}
        {canEdit&&<CatalogLifecycleButton base={base} token={token} kind={kind} row={row} accent={accent} disabled={busy} onExpired={onExpired} onChanged={()=>{setCursors(['']);setRevision(v=>v+1);}}/>}
        {kind==='products'?<><DataField label="Código (SKU)" value={row.sku??'Sin código'}/><DataField label="Precio" value={row.price?.toFixed(2)??'Sin informar'}/><Text style={styles.note}>Moneda no informada · Las existencias se consultan en Inventario.</Text></>:<><DataField label="Identificador fiscal" value={row.taxId??'Sin registrar'}/><DataField label="Correo electrónico" value={row.email??'Sin registrar'}/></>}
      </RecordCard>)}
      <View style={styles.actions}>
        <ActionButton accessibilityRole="button" disabled={busy || loading || cursors.length === 1} onPress={() => setCursors(values => values.slice(0, -1))}>Anterior</ActionButton>
        <ActionButton accessibilityRole="button" disabled={busy || loading || !nextCursor} onPress={() => { if (nextCursor) setCursors(values => [...values, nextCursor]); }}>Siguiente</ActionButton>
      </View>
    </>}
    <View style={styles.actions}><ActionButton accessibilityRole="button" disabled={loading || busy} onPress={() => { if (!busy) { setCursors(['']); setRevision((value) => value + 1); } }}>{busy ? 'Guardado en curso…' : loading ? 'Consultando…' : error ? 'Reintentar' : 'Actualizar'}</ActionButton><ActionButton accessibilityRole="button" disabled={busy} onPress={() => { if (!busy) onClose(); }}>Volver al panel</ActionButton></View>
  </ModuleSection>;
}
const styles = StyleSheet.create({
  panel: { backgroundColor: '#111923', padding: 16, borderRadius: 18, marginBottom: 24 },
  title: { color: '#F1F5F9', fontWeight: '700', fontSize: 20, marginBottom: 10 },
  name: { color: '#F1F5F9', fontSize: 15, fontWeight: '600' },
  note: { color: '#8B99A8', fontSize: 12, lineHeight: 19 },
  error: { color: '#F87171', fontSize: 12 },
  input: { color: '#F1F5F9', backgroundColor: '#0B1016', borderRadius: 10, padding: 12, marginVertical: 4 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#293746' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }
});
