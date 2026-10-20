import {ActionButton} from './ModuleLayout';
import {Children,cloneElement,isValidElement,createContext,useContext,useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {KeyboardAvoidingView,Modal,Platform} from 'react-native';
import {Pressable,ScrollView,Text,View} from './ui';
import {Icon,type IconName} from './Icon';
import {useNativeTheme} from './NativeTheme';
import {useNativeNavigation,useNavigationGuard} from './NavigationGuard';
const BusyContext=createContext({register:(_id:string,_busy:boolean|null)=>{}});
export function useEditorBusy(busy:boolean){const id=useId(),{register}=useContext(BusyContext);useEffect(()=>{register(id,busy);return()=>register(id,null);},[register,id,busy]);useNavigationGuard(busy);}
export function EditorSheet({children,title,subtitle='Completa la información y revisa los datos antes de guardar.',onClose,busy:externalBusy=false,visible=true,guardClose=true,icon='edit-3'}:{children:ReactNode;title:string;subtitle?:string;onClose:()=>void;busy?:boolean;visible?:boolean;guardClose?:boolean;icon?:IconName}){
 const {theme:t}=useNativeTheme(),navigation=useNativeNavigation(),[busy,setBusy]=useState(false),entries=useRef(new Map<string,boolean>()),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const register=useRef((id:string,value:boolean|null)=>{if(value===null)entries.current.delete(id);else entries.current.set(id,value);if(alive.current)setBusy([...entries.current.values()].some(Boolean));}).current;
 const locked=busy||externalBusy,close=()=>{if(!locked){if(guardClose)navigation.navigate(onClose);else onClose();}};
 return <BusyContext.Provider value={{register}}><Modal visible={visible} animationType="slide" onRequestClose={close} presentationStyle="fullScreen"><KeyboardAvoidingView accessibilityViewIsModal style={{flex:1,backgroundColor:t.background,paddingTop:Platform.OS==='ios'?24:0}} behavior={Platform.OS==='ios'?'padding':undefined}><View style={{backgroundColor:t.surface,borderBottomWidth:1,borderColor:t.line,paddingHorizontal:18,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:12,flexWrap:'nowrap'}}><Pressable accessibilityLabel="Cerrar formulario" disabled={locked} onPress={close} style={{width:44,height:44,alignItems:'center',backgroundColor:t.soft,borderRadius:12}}><Icon name="arrow-left" size={21}/></Pressable><View style={{flex:1}}><Text style={{fontSize:9,lineHeight:15,letterSpacing:1,color:t.muted,fontWeight:'700'}}>NÚCLEO ERP</Text><Text accessibilityRole="header" style={{fontSize:18,lineHeight:25,fontWeight:'700'}}>{title}</Text></View><Icon name={icon} size={22} color={t.link}/></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:18,paddingBottom:40,gap:12}}>{!!subtitle&&<Text style={{fontSize:12,lineHeight:19,color:t.muted}}>{subtitle}</Text>}{children}</ScrollView>{locked&&<View accessibilityLiveRegion="polite" style={{padding:12,backgroundColor:t.surface,borderTopWidth:1,borderColor:t.line}}><Text style={{fontSize:12,color:t.muted,textAlign:'center'}}>Espera la confirmación de la operación antes de salir.</Text></View>}</KeyboardAvoidingView></Modal></BusyContext.Provider>;
}
export function FormSection({title,icon='edit-3',children,description}:{title:string;icon?:IconName;children:ReactNode;description?:string}){const {theme:t}=useNativeTheme();return <View style={{backgroundColor:t.surface,borderWidth:1,borderColor:t.line,borderRadius:12,padding:16,marginVertical:5,gap:10}}><View style={{flexDirection:'row',alignItems:'center',gap:9,marginBottom:3}}><Icon name={icon} size={17} color={t.link}/><Text style={{fontWeight:'700',fontSize:14}}>{title}</Text></View>{!!description&&<Text style={{fontSize:12,lineHeight:19,color:t.muted}}>{description}</Text>}{children}</View>;}

export function CreateAction({title,children,initialOpen=false,busy=false,completionKey}:{title:string;children:ReactNode;initialOpen?:boolean;busy?:boolean;completionKey?:unknown}){
 const [open,setOpen]=useState(initialOpen),previous=useRef(completionKey);
 useEffect(()=>{if(!busy&&previous.current!==completionKey){previous.current=completionKey;if(completionKey)setOpen(false);}},[completionKey,busy]);
 const contents=Children.map(children,child=>{
  if(!isValidElement<Record<string,unknown>>(child))return child;
  const replacements:Record<string,unknown>={};
  for(const name of ['onSaved','onCreated'])if(typeof child.props[name]==='function'){const fn=child.props[name] as (...args:unknown[])=>void;replacements[name]=(...args:unknown[])=>{fn(...args);setOpen(false);};}
  return Object.keys(replacements).length?cloneElement(child,replacements):child;
 });
 return <><ActionButton icon="plus" variant="primary" disabled={busy} onPress={()=>setOpen(true)}>{title}</ActionButton><EditorSheet title={title} visible={open} busy={busy} onClose={()=>setOpen(false)}>{contents}</EditorSheet></>;
}
