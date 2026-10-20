import {ActionButton} from './ModuleLayout';
import {useEffect,useRef,useState} from 'react';
import {Alert,Pressable,Text} from './ui';
import {ApiError} from './api';
import {changeCatalogState,type RemovableKind} from './catalogLifecycleApi';
import {useNavigationGuard} from './NavigationGuard';
export function CatalogLifecycleButton({base,token,kind,row,accent,disabled=false,onChanged,onExpired}:{base:string;token:string;kind:RemovableKind;row:{id:string;name:string;status:string};accent:string;disabled?:boolean;onChanged:()=>void;onExpired:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),write=useRef<AbortController|null>(null);useEffect(()=>()=>write.current?.abort(),[]);useNavigationGuard(busy);
 async function save(){if(write.current||disabled)return;const c=new AbortController();write.current=c;setBusy(true);setError('');try{await changeCatalogState(base,token,kind,row,c.signal);if(!c.signal.aborted)onChanged();}catch(e){if(!c.signal.aborted){if(e instanceof ApiError&&e.status===401)onExpired();else setError(e instanceof Error?e.message:'Actualiza antes de repetir.');}}finally{write.current=null;if(!c.signal.aborted)setBusy(false);}}
 const label=row.status==='ACTIVE'?'Eliminar del catálogo':'Restaurar';
 return <><ActionButton variant={row.status==='ACTIVE'?'danger':'secondary'} disabled={disabled||busy} onPress={()=>Alert.alert(label+' · '+row.name,row.status==='ACTIVE'?'Se conservarán el registro y su historial. Dejará de estar disponible para nuevas operaciones y podrás restaurarlo.':'El registro volverá a estar disponible para nuevas operaciones.',[{text:'Volver',style:'cancel'},{text:label,onPress:()=>void save()}])}>{busy?'Guardando…':label}</ActionButton>{!!error&&<Text accessibilityRole="alert" style={{color:'#F87171'}}>{error}</Text>}</>;
}
