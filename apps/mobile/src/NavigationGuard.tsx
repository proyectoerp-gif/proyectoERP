import {createContext,useContext,useEffect,useId,useRef,type ReactNode} from 'react';
import {Alert} from './ui';
type Entry={busy:boolean;dirty:boolean};
const Context=createContext({register:(_key:string,_entry:Entry|null)=>{},navigate:(run:()=>void)=>run()});
export function NavigationGuardProvider({children}:{children:ReactNode}){
 const entries=useRef(new Map<string,Entry>());
 const value=useRef({register:(key:string,entry:Entry|null)=>{if(entry)entries.current.set(key,entry);else entries.current.delete(key);},navigate:(run:()=>void)=>{if([...entries.current.values()].some(v=>v.busy)){Alert.alert('Operación pendiente','Espera la confirmación o reintenta la misma solicitud antes de salir de esta pantalla.');return;}if([...entries.current.values()].some(v=>v.dirty)){Alert.alert('Cambios sin guardar','Si sales de esta sección, se perderá este borrador.',[{text:'Seguir editando',style:'cancel'},{text:'Salir de la sección',onPress:run}]);return;}run();}}).current;
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useNativeNavigation=()=>useContext(Context);
export function useNavigationGuard(busy:boolean,dirty=false){const key=useId(),{register}=useNativeNavigation();useEffect(()=>{register(key,{busy,dirty});return()=>register(key,null);},[key,register,busy,dirty]);}
