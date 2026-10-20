import {ActionButton} from './ModuleLayout';
import {FilterBar} from './ModuleLayout';
import {ModuleSection,RecordCard} from './ModuleLayout';
import {PagedExportButtons} from './PagedExportButtons';
import {transactionsDocument} from './listDocuments';
import {exportNames} from './exportNames';
import {MultiTransactionForm} from './MultiTransactionForm';
import {CommercialActivityPanel} from './CommercialActivityPanel';
import {transactionStatusLabel} from './transactionLabels';
import {transactionItems} from './transactionApi';
import {ReceiptView} from './ReceiptView';
import {SettlementForm} from './SettlementForm';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from './ui';
import { ApiError, catalogLookup, type CatalogEntry } from './api';
import { transactionPageRequest, transactionStatusOptions, updateTransactionStatusRequest, type Transaction, type TransactionKind } from './transactionApi';
export function TransactionPanel({ base, token, kind, accent, canCreate, canEdit, canSettle, onExpired, companyId, branchId }: { base: string; token: string; kind: TransactionKind; accent: string; canCreate: boolean; canEdit: boolean; canSettle: boolean; onExpired: () => void; companyId:string;branchId:string }) {
  const [activity,setActivity]=useState<Transaction|null>(null);
  const [receipt,setReceipt]=useState<Transaction|null>(null);
  const [settling,setSettling]=useState<Transaction|null>(null);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [partners, setPartners] = useState<CatalogEntry[]>([]);
  const [products, setProducts] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [nameError,setNameError]=useState('');
  const [revision, setRevision] = useState(0);
  const [cursors, setCursors] = useState<string[]>(['']);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const cursor = cursors[cursors.length - 1];
  const write = useRef<AbortController | null>(null), mounted = useRef(true);
  const sale = kind === 'sales';
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; write.current?.abort(); }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setNameError(''); setRows([]); setPartners([]); setProducts([]); setNextCursor(null);
    transactionPageRequest(base, token, kind, controller.signal, cursor, statusFilter)
      .then(async records => {
        if (controller.signal.aborted) return;
        setRows(records.items); setNextCursor(records.nextCursor);
        try {
          const [contacts, items] = await Promise.all([catalogLookup(base, sale ? 'customers' : 'suppliers', token, controller.signal, records.items.map(row => row.partnerId)), catalogLookup(base, 'products', token, controller.signal, records.items.map(row => row.productId))]);
          if (!controller.signal.aborted) { setPartners(contacts); setProducts(items); }
        } catch (failure) {
          if (!controller.signal.aborted) {
            if (failure instanceof ApiError && failure.status === 401) onExpired();
            else setNameError('Los registros siguen disponibles por identificador. No se pudieron consultar sus nombres.');
          }
        }
      })
      .catch((failure) => { if (!controller.signal.aborted) { if (failure instanceof ApiError && failure.status === 401) onExpired(); else setError(failure instanceof Error ? failure.message : 'No se pudo consultar.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [base, token, kind, sale, revision, cursor, statusFilter, onExpired]);
  async function changeStatus(row: Transaction, status: string) {
    if (!mounted.current || write.current || !canEdit) return;
    const controller = new AbortController(); write.current = controller; setSaving(true); setError(''); setNotice('');
    try {
      const updated = await updateTransactionStatusRequest(base, token, kind, row, status, controller.signal);
      if (controller.signal.aborted) return;
      setNotice('Estado confirmado: ' + updated.status); setCursors(['']); setRevision(value => value + 1);
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure instanceof ApiError && failure.status === 401) onExpired();
        else setError(failure instanceof Error ? failure.message : 'No se pudo confirmar el estado.');
      }
    } finally { write.current = null; if (!controller.signal.aborted) setSaving(false); }
  }
  function confirmStatus(row: Transaction, status: string) {
    if (saving || loading || write.current || !canEdit) return;
    Alert.alert('Confirmar cambio de estado', row.id + '\n' + row.status + ' → ' + status + '\nEsta acción actualiza el registro comercial. No procesa pagos, entradas ni salidas de inventario. Los estados finales no se reabren desde esta pantalla.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: status === 'CANCELADA' ? 'destructive' : 'default', onPress: () => { void changeStatus(row, status); } }
    ]);
  }
  const label = (id: string, options: CatalogEntry[]) => options.find((row) => row.id === id)?.name ?? id;
  if(activity)return <CommercialActivityPanel base={base} token={token} kind={kind} row={activity} accent={accent} canWrite={canSettle} onExpired={onExpired} onChanged={()=>{setCursors(['']);setRevision(v=>v+1);}} onClose={()=>setActivity(null)}/>;
  if(receipt)return <ReceiptView base={base} token={token} kind={kind} row={receipt} companyId={companyId} branchId={branchId} accent={accent} onExpired={onExpired} onClose={()=>setReceipt(null)}/>;
  if(settling)return <SettlementForm key={settling.id} base={base} token={token} kind={kind} row={settling} companyId={companyId} branchId={branchId} accent={accent} onExpired={onExpired} onCancel={()=>setSettling(null)} onDone={id=>{setSettling(null);setNotice('Operación conjunta confirmada. Comprobante: '+id);setCursors(['']);setRevision(v=>v+1);}}/>;
  return <ModuleSection style={styles.panel}>
    <Text style={styles.title}>{sale ? 'Ventas' : 'Compras'}</Text><PagedExportButtons<Transaction> scopeKey={[base,token,kind,statusFilter].join('|')} disabled={loading||saving||!!error} onExpired={onExpired} rowKey={r=>r.id} fetchPage={(cursor,signal)=>transactionPageRequest(base,token,kind,signal,cursor,statusFilter)} buildDocument={async(rows,signal)=>transactionsDocument(kind,rows,await exportNames(base,token,signal,[{kind:sale?'customers':'suppliers',prefix:'partner',ids:rows.map(r=>r.partnerId)}]),companyId,branchId,statusFilter?transactionStatusLabel(kind,statusFilter):'Todos')}/>
    <Text style={styles.note}>Importes sin moneda informada.</Text>
    {loading ? <Text style={styles.note}>Consultando…</Text> : null}
    {canCreate && <MultiTransactionForm base={base} token={token} kind={kind} accent={accent} onExpired={onExpired} onCreated={()=>{setCursors(['']);setRevision(v=>v+1);}}/>}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {notice ? <Text style={styles.note}>{notice}</Text> : null}
    {nameError ? <Text accessibilityRole="alert" style={styles.note}>{nameError}</Text> : null}
    <Text style={styles.note}>Filtrar estado</Text><FilterBar style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{['', 'PENDIENTE', ...(sale ? ['PAGADA'] : ['APROBADA','RECIBIDA']), 'CANCELADA'].map(status => <Pressable accessibilityRole="button" accessibilityState={{selected:statusFilter===status}} key={status || 'all'} disabled={saving || loading} onPress={() => {setStatusFilter(status);setCursors(['']);}}><Text style={[styles.option,{color:statusFilter===status?accent:'#8B99A8',marginRight:12}]}>{status?transactionStatusLabel(kind,status):'Todos'}</Text></Pressable>)}</FilterBar>
    {!loading && !error ? <><Text style={styles.note}>{rows.length} registros en esta página · Página {cursors.length} · Hasta 20, más recientes primero</Text>{rows.length === 0 ? <Text style={styles.note}>No hay registros.</Text> : null}{rows.map((row) => <RecordCard status={row.status} style={styles.record} key={row.id}><Text style={styles.text}>{label(row.partnerId, partners)}</Text><Text style={{fontSize:20,fontWeight:'700',color:accent}}>Total: {row.total.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}</Text>{transactionItems(row).map(item=><Text key={item.productId} style={styles.note}>{item.productName||label(item.productId,products)} · {item.quantity} × {item.unitPrice} = {item.total}</Text>)}<Text style={styles.note}>Total: {row.total}</Text><ActionButton onPress={()=>setActivity(row)}>Pagos, entregas y devoluciones</ActionButton><Text selectable style={styles.note}>{row.id}</Text>{!row.activityVersion&&<ActionButton accessibilityRole="button" disabled={saving} onPress={()=>setReceipt(row)}>Ver comprobante</ActionButton>}{canSettle&&!row.activityVersion&&row.total>0&&((sale&&row.status==='PENDIENTE')||(!sale&&row.status==='APROBADA'))?<ActionButton accessibilityRole="button" disabled={saving||loading} onPress={()=>setSettling(row)}>{sale?'Cobrar y entregar':'Recibir y pagar'}</ActionButton>:null}{canEdit&&!row.activityVersion ? transactionStatusOptions(kind, row.status).map(status => <ActionButton accessibilityRole="button" key={status} disabled={saving} onPress={() => confirmStatus(row, status)}>{status === 'APROBADA' ? 'Aprobar compra' : 'Cancelar registro'}</ActionButton>) : null}</RecordCard>)}<View style={{flexDirection:'row',justifyContent:'space-between'}}><ActionButton accessibilityRole="button" disabled={saving || loading || cursors.length === 1} onPress={() => setCursors(values => values.slice(0,-1))}>Anterior</ActionButton><ActionButton accessibilityRole="button" disabled={saving || loading || !nextCursor} onPress={() => {if(nextCursor)setCursors(values => [...values,nextCursor]);}}>Siguiente</ActionButton></View></> : null}
    <ActionButton accessibilityRole="button" disabled={loading || saving} onPress={() => {setCursors(['']);setRevision((value) => value + 1);}}>Actualizar</ActionButton>
  </ModuleSection>;
}
const styles = StyleSheet.create({ panel: { backgroundColor: '#111923', padding: 16, borderRadius: 18, marginBottom: 24 }, title: { color: '#F1F5F9', fontSize: 20, fontWeight: '700', marginVertical: 12 }, note: { color: '#8B99A8', fontSize: 12, lineHeight: 19 }, text: { color: '#F1F5F9' }, error: { color: '#F87171', marginVertical: 8 }, option: { paddingVertical: 12 }, input: { backgroundColor: '#0B1119', color: '#F1F5F9', padding: 12, borderRadius: 12, marginVertical: 8 }, record: { borderBottomColor: '#293746', borderBottomWidth: 1, paddingVertical: 12 } });
