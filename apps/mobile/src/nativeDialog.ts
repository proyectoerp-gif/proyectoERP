import {Alert as NativeAlert,type AlertButton,type AlertOptions} from 'react-native';
export type DialogRequest={title:string;message?:string;buttons:AlertButton[];options?:AlertOptions};
let present:((request:DialogRequest)=>void)|null=null;
export function connectDialogs(listener:(request:DialogRequest)=>void){present=listener;return()=>{if(present===listener)present=null;};}
export const Alert={alert(title:string,message?:string,buttons?:AlertButton[],options?:AlertOptions){if(!present){NativeAlert.alert(title,message,buttons,options);return;}present({title,message,buttons:buttons?.length?buttons:[{text:'Aceptar'}],options});}};
