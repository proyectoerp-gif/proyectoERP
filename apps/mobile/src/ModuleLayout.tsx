import {Children,cloneElement,isValidElement,useState,type ReactNode} from 'react';
import {StyleSheet,type ViewProps,type PressableProps} from 'react-native';
import {Pressable,Text,View} from './ui';
import {useNativeTheme} from './NativeTheme';

const statusNames:Record<string,string>={SENT:'No leído',READ:'Leído',BORRADOR:'Borrador',EMITIDA:'Emitida',PENDING:'Pendiente',IN_TRANSIT:'En tránsito',DELIVERED:'Entregado',CANCELLED:'Cancelado',QUALIFICATION:'Calificación',PROPOSAL:'Propuesta',NEGOTIATION:'Negociación',CLOSED_WON:'Ganada',CLOSED_LOST:'Perdida',scheduled:'Programado',running:'En producción',identified:'Identificado',mitigating:'En mitigación',closed:'Cerrado',dismissed:'Descartado',ACTIVE:'Activo',INACTIVE:'Retirado',PENDIENTE:'Pendiente',PAGADA:'Pagada',APROBADA:'Aprobada',RECIBIDA:'Recibida',CANCELADA:'Cancelada',PAUSED:'Pausado',CLOSED:'Cerrado',operational:'Operativo',maintenance:'Mantenimiento',offline:'Fuera de servicio',retired:'Retirado',open:'Abierto',in_progress:'En curso',resolved:'Resuelto',cancelled:'Cancelado',pending:'Pendiente',reviewing:'En revisión',completed:'Completado',draft:'Borrador',approved:'Aprobado',rejected:'Rechazado',planned:'Planificado',producing:'En producción',shipped:'Enviado',delivered:'Entregado',won:'Ganada',lost:'Perdida',new:'Nueva',qualified:'Calificada',negotiation:'Negociación'};
export function StatusBadge({status}:{status?:string}){
 const {theme:t}=useNativeTheme();if(!status)return null;
 const final=/cancel|reject|lost|offline/i.test(status),pending=/pend|plan|scheduled|draft|borrador|identified/i.test(status);
 const color=final?t.danger:pending?t.mode==='dark'?'#f6d487':'#755000':t.muted;
 const background=final?t.dangerSurface:pending?t.mode==='dark'?'#382e1a':'#fff5dd':t.soft;
 return <View style={{alignSelf:'flex-start',backgroundColor:background,borderWidth:1,borderColor:t.line,borderRadius:20,paddingHorizontal:10,paddingVertical:4}}><Text style={{fontSize:11,lineHeight:16,fontWeight:'600',color}}>{statusNames[status]??status}</Text></View>;
}
/** Each record exposes a short summary; the complete content stays available. */
export function RecordCard({children,status,previewCount=2,initialOpen=false,...props}:ViewProps&{status?:string;previewCount?:number;initialOpen?:boolean}){
 const {theme:t}=useNativeTheme(),[open,setOpen]=useState(initialOpen);
 const content=Children.toArray(children).filter(child=>typeof child!=='boolean'&&child!=null),summary=content.slice(0,previewCount),details=content.slice(previewCount);
 const first=summary[0],recordName=isValidElement(first)?Children.toArray((first.props as any).children).filter(v=>typeof v==='string'||typeof v==='number').join(' ').trim():'';
 return <View {...props} style={{backgroundColor:t.surface,borderWidth:1,borderColor:t.line,borderRadius:16,padding:16,marginVertical:6,gap:8}}>
  <StatusBadge status={status}/>
  {summary.map((child,index)=>{
   if(!isValidElement(child)||child.type!==Text)return child;
   const style=StyleSheet.flatten((child.props as any).style)??{},size=Math.max(13,style.fontSize??13);
   return cloneElement(child as React.ReactElement<any>,{numberOfLines:open||details.length===0?undefined:index===0?2:3,style:[style,index===0?{fontSize:16,lineHeight:23,fontWeight:'700',color:t.text,marginVertical:0}:{fontSize:size,lineHeight:Math.max(20,size*1.4),marginVertical:0}]});
  })}
  {details.length>0&&<><View style={{display:open?'flex':'none',gap:8}} importantForAccessibility={open?'auto':'no-hide-descendants'}>{details}</View><Pressable accessibilityLabel={(open?'Ocultar detalles':'Ver detalles y acciones')+(recordName?' de '+recordName:' del registro')} accessibilityState={{expanded:open}} onPress={()=>setOpen(v=>!v)} style={{backgroundColor:t.soft,borderRadius:10,paddingHorizontal:12,marginTop:4,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{fontSize:12,color:t.link,fontWeight:'600'}}>{open?'Ocultar detalles':'Ver detalles y acciones'}</Text><Text style={{color:t.link}}>{open?'⌃':'⌄'}</Text></Pressable></>}
 </View>;
}
/** A module is a workspace, rather than one large card containing all records. */
export function ModuleSection({children,style,...props}:ViewProps){
 const flat=StyleSheet.flatten(style)??{};
 return <View {...props} style={{marginTop:flat.marginTop,marginBottom:flat.marginBottom??20,gap:8}}>{children}</View>;
}
export function FilterBar({children,style,...props}:ViewProps){return <View {...props} style={[style,{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:8}]}>{children}</View>;}
export function DetailGrid({items}:{items:{label:string;value:string}[]}){const {theme:t}=useNativeTheme();return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:10}}>{items.map(i=><View key={i.label} style={{flexGrow:1,flexBasis:'45%',backgroundColor:t.soft,borderWidth:1,borderColor:t.line,borderRadius:12,padding:12}}><Text style={{color:t.muted,fontSize:11,lineHeight:17}}>{i.label}</Text><Text style={{fontSize:18,lineHeight:25,fontWeight:'700',marginTop:4}}>{i.value}</Text></View>)}</View>;}

export function ActionButton({children,variant='secondary',style,...props}:Omit<PressableProps,'children'>&{children:ReactNode;variant?:'primary'|'secondary'|'danger'}){
 const {theme:t}=useNativeTheme(),color=variant==='primary'?t.onAccent:variant==='danger'?t.danger:t.link;
 return <Pressable {...props} style={state=>[{borderWidth:1,borderColor:variant==='primary'?t.accent:t.line,backgroundColor:variant==='primary'?t.accent:variant==='danger'?t.dangerSurface:t.soft,paddingHorizontal:12,paddingVertical:8,marginVertical:3},typeof style==='function'?style(state):style]}><Text style={{color,fontWeight:'600',fontSize:13,lineHeight:20}}>{children}</Text></Pressable>;
}
