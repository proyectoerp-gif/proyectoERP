import React,{createContext,useContext,useEffect,useMemo,useState,useRef,type ReactNode} from 'react';
import * as FileSystem from 'expo-file-system';
import {defaultAppearance,makeTheme,parseAppearance,type Appearance} from './themeModel';
const Context=createContext({theme:makeTheme(defaultAppearance),setAppearance:(_value:Appearance)=>{}});
export function NativeThemeProvider({children}:{children:ReactNode}){
 const [appearance,setAppearance]=useState(defaultAppearance),[loaded,setLoaded]=useState(false);
 const writes=useRef(Promise.resolve());
 const uri=FileSystem.documentDirectory?FileSystem.documentDirectory+'nucleo-appearance.json':null;
 useEffect(()=>{let mounted=true;(async()=>{try{if(uri){const info=await FileSystem.getInfoAsync(uri);if(info.exists){const value=JSON.parse(await FileSystem.readAsStringAsync(uri));if(mounted)setAppearance(parseAppearance(value));}}}catch{/* An invalid preference never blocks access. */}finally{if(mounted)setLoaded(true);}})();return()=>{mounted=false;};},[uri]);
 useEffect(()=>{if(loaded&&uri){const saved=JSON.stringify(appearance);writes.current=writes.current.then(()=>FileSystem.writeAsStringAsync(uri,saved)).catch(()=>undefined);}},[appearance,loaded,uri]);
 const value=useMemo(()=>({theme:makeTheme(appearance),setAppearance:(v:Appearance)=>setAppearance(parseAppearance(v))}),[appearance]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useNativeTheme=()=>useContext(Context);
