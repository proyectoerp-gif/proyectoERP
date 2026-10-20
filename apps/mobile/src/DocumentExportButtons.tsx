import {useContext} from 'react';
import {ExportIdentityContext,identifyExport} from './ExportIdentity';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from './ui';
import type { ExportDocument } from './exportDocument';
import { shareDocument } from './shareDocument';

export function DocumentExportButtons({ document, accent }: { document: ExportDocument; accent: string }) {
  const identity=useContext(ExportIdentityContext);
  const lock = useRef(false),active=useRef<AbortController|null>(null);
  useEffect(()=>()=>active.current?.abort(),[]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function exportFile(format: 'pdf' | 'xlsx') {
    if (lock.current) return;
    lock.current = true; const controller=new AbortController();active.current=controller; setBusy(true); setMessage('Preparando archivo…');
    try { await shareDocument(identifyExport(document,identity), format,controller.signal); if(controller.signal.aborted)return;setMessage('Archivo preparado. Elige dónde guardarlo o compartirlo.'); }
    catch (error) { if(controller.signal.aborted)return;setMessage(error instanceof Error ? error.message : 'No se pudo exportar.'); }
    finally { lock.current = false; active.current=null;if(!controller.signal.aborted)setBusy(false); }
  }
  return <View><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{(['pdf', 'xlsx'] as const).map(format => <Pressable accessibilityRole="button" key={format} disabled={busy} onPress={() => exportFile(format)} style={{ paddingVertical: 16 }}><Text style={{ color: busy ? '#718096' : accent }}>Exportar {format === 'pdf' ? 'PDF' : 'Excel'}</Text></Pressable>)}</View>{!!message && <Text accessibilityRole="alert" style={{ color: '#F1F5F9' }}>{message}</Text>}</View>;
}
