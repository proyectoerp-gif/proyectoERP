import {useEffect,useState} from 'react';
import {Modal,Pressable,ScrollView,Text,View} from './ui';
import {connectDialogs,type DialogRequest} from './nativeDialog';
import {useNativeTheme} from './NativeTheme';
export function NativeDialogHost(){
 const {theme:t}=useNativeTheme(),[queue,setQueue]=useState<DialogRequest[]>([]),request=queue[0];
 useEffect(()=>connectDialogs(r=>setQueue(v=>[...v,r])),[]);
 function dismiss(){if(!request)return;const cancel=request.buttons.find(b=>b.style==='cancel');if(cancel||request.options?.cancelable){setQueue(v=>v.slice(1));cancel?.onPress?.();request.options?.onDismiss?.();}}
 return <Modal visible={!!request} transparent animationType="fade" onRequestClose={dismiss}><View style={{flex:1,justifyContent:'center',backgroundColor:'#020d18bb',padding:20}}><View accessibilityViewIsModal style={{backgroundColor:t.surface,borderRadius:16,borderWidth:1,borderColor:t.line,maxHeight:'85%',padding:22}}><ScrollView><Text accessibilityRole="header" style={{fontSize:22,fontWeight:'700',lineHeight:30,marginBottom:16}}>{request?.title}</Text><Text style={{color:t.muted,lineHeight:24,marginBottom:20}}>{request?.message}</Text>{request?.buttons.map((b,i)=><Pressable key={i} onPress={()=>{setQueue(v=>v.slice(1));b.onPress?.();}} style={{padding:12,marginTop:10,alignItems:'center',borderWidth:1,borderColor:b.style==='destructive'?t.danger:t.line,backgroundColor:b.style==='cancel'?t.soft:b.style==='destructive'?t.dangerSurface:t.accent}}><Text style={{fontWeight:'700',textAlign:'center',color:b.style==='cancel'?t.text:b.style==='destructive'?t.danger:t.onAccent}}>{b.text??'Aceptar'}</Text></Pressable>)}</ScrollView></View></View></Modal>;
}
