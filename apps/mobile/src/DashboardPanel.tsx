import {Icon,type IconName} from './Icon';
import {useNativeTheme} from './NativeTheme';
import {Disclosure} from './Disclosure';
import {IconButton} from './NativeChrome';
import type {Page} from '../../../shared/constants/navigation';
import {ModuleSection} from './ModuleLayout';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from './ui';
import { ApiError, dashboardRequest, type DashboardSummary } from './api';

export function DashboardPanel({ base, token, accent, onExpired,onNavigate }: { base: string; token: string; accent: string; onExpired: () => void;onNavigate?:(page:Page)=>void }) {
  const {theme:t}=useNativeTheme();
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(''); setLoading(true);
    dashboardRequest(base, token, controller.signal).then((summary) => {
      if (!controller.signal.aborted) setData(summary);
    }).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      if (failure instanceof ApiError && failure.status === 401) onExpired();
      else setError(failure instanceof Error ? failure.message : 'No se pudieron consultar los indicadores.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [base, token, revision, onExpired]);

 const metrics=data?[
  {label:'Ventas',value:data.metrics.sales,type:'amount',icon:'shopping-bag',page:'sales'},
  {label:'Compras',value:data.metrics.purchases,type:'amount',icon:'shopping-cart',page:'purchases'},
  {label:'Flujo neto de caja',value:data.metrics.cash,type:'amount',icon:'credit-card',page:'finance'},
  {label:'Personal activo',value:data.metrics.employees,type:'count',icon:'users',page:'employees'},
  {label:'Productos activos',value:data.metrics.inventory,type:'count',icon:'package',page:'products'}
 ].filter(item=>item.value!==null):[];
 return <View style={{marginBottom:20}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12}}><View><Text style={{fontSize:16,fontWeight:'700'}}>Resumen de tu empresa</Text><Text style={{fontSize:10,color:t.muted}}>Información de tu operación</Text></View><IconButton icon="refresh-cw" label="Actualizar indicadores" onPress={()=>{if(!loading)setRevision(v=>v+1);}}/></View>{error&&<Text accessibilityRole="alert" style={{fontSize:12,color:t.danger,padding:12,backgroundColor:t.dangerSurface,borderRadius:10,marginBottom:12}}>{error}</Text>}{loading?<View accessibilityLabel="Cargando indicadores" style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{[1,2,3,4].map(i=><View key={i} style={{width:'48%',flexGrow:1,padding:16,backgroundColor:t.surface,borderWidth:1,borderColor:t.line,borderRadius:13,gap:12}}><View style={{width:30,height:30,backgroundColor:t.soft,borderRadius:9}}/><View style={{width:'70%',height:12,backgroundColor:t.soft,borderRadius:3}}/><View style={{width:'55%',height:26,backgroundColor:t.soft,borderRadius:4}}/></View>)}</View>:<View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{metrics.map((item,i)=><Pressable key={item.label} disabled={!onNavigate} onPress={()=>onNavigate?.(item.page as Page)} style={{width:'48%',flexGrow:1,padding:15,backgroundColor:t.surface,borderWidth:1,borderColor:t.line,borderRadius:13,gap:6,minHeight:140}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:4}}><View style={{width:30,height:30,borderRadius:9,backgroundColor:t.soft,alignItems:'center',justifyContent:'center'}}><Icon name={item.icon as IconName} size={16} color={t.link}/></View><Icon name="arrow-up-right" size={14}/></View><Text style={{fontSize:11,color:t.muted,fontWeight:'500'}}>{item.label}</Text><Text style={{fontSize:24,lineHeight:33,fontWeight:'800',letterSpacing:-.6}}>{item.value?.toLocaleString('es-MX',{minimumFractionDigits:item.type==='amount'?2:0,maximumFractionDigits:item.type==='amount'?2:0})}</Text><Text style={{fontSize:9,lineHeight:15,color:t.muted}}>{item.type==='amount'?'Acumulado · sin moneda informada':'Cantidad registrada'}</Text></Pressable>)}</View>}{data&&!loading&&!metrics.length&&<Text style={{fontSize:12,color:t.muted}}>Tu cuenta no tiene indicadores habilitados. Consulta con el administrador.</Text>}{data&&!loading&&<><Text style={{fontSize:9,lineHeight:16,color:t.muted,marginTop:10}}>Última actualización: {new Date(data.lastUpdated).toLocaleString('es-MX')}</Text><Disclosure title="Qué incluyen estos indicadores"><Text style={{fontSize:11,lineHeight:18,color:t.muted}}>Ventas y compras excluyen cancelaciones. Los productos son el catálogo activo, no las existencias. El flujo neto no representa utilidad ni saldo bancario. La API no informa moneda.</Text></Disclosure></>}</View>;
}
