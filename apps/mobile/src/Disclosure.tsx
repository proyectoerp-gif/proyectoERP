import {useState,type ReactNode} from 'react';
import {Pressable,Text,View} from './ui';
import {useNativeTheme} from './NativeTheme';
export function Disclosure({title,children,initialOpen=false}:{title:string;children:ReactNode;initialOpen?:boolean}){const [open,setOpen]=useState(initialOpen),{theme:t}=useNativeTheme();return <View style={{borderWidth:1,borderColor:t.line,borderRadius:10,paddingHorizontal:12,marginVertical:5}}><Pressable accessibilityState={{expanded:open}} onPress={()=>setOpen(!open)}><Text style={{color:t.link,fontWeight:'700'}}>{open?'▾':'＋'} {title}</Text></Pressable><View style={{display:open?'flex':'none',paddingBottom:open?12:0,gap:8}} importantForAccessibility={open?'auto':'no-hide-descendants'}>{children}</View></View>;}
