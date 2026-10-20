import {ActionButton} from './ModuleLayout';
import {EditorSheet,FormSection} from './EditorSheet';
import {useEditorBusy} from './EditorSheet';
import {useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from './ui';
import {useEmployeeEdit} from './useEmployeeEdit';
import type {Employee} from './employeeApi';
type Props={base:string;token:string;employee:Employee;onSaved:()=>void;accent:string;onExpired:()=>void};
export function EmployeeEdit(p:Props){const [open,setOpen]=useState(false);return open?<EditorSheet title="Editar colaborador" icon="user" onClose={()=>{setOpen(false);p.onSaved();}}><Form {...p} onClose={()=>{setOpen(false);p.onSaved();}}/></EditorSheet>:<ActionButton accessibilityRole="button" onPress={()=>setOpen(true)}>Editar nombre y puesto</ActionButton>;}
function Form({base,token,employee,onSaved,onClose,accent,onExpired}:Props&{onClose:()=>void}){
 const s=useEmployeeEdit(base,token,employee,onSaved,onExpired);const input={color:'#F1F5F9',backgroundColor:'#0B1118',padding:12,borderRadius:12};const note={color:'#8B99A8',marginVertical:8};
 useEditorBusy(!!s.busy);return <FormSection title="Información del registro" icon="edit-3"><Text style={note}>Editar nombre completo</Text><TextInput accessibilityLabel="Editar nombre completo" editable={!s.busy&&!s.blocked} maxLength={120} value={s.fullName} onChangeText={s.setFullName} style={input}/><Text style={note}>Editar puesto</Text><TextInput accessibilityLabel="Editar puesto" editable={!s.busy&&!s.blocked} maxLength={100} value={s.position} onChangeText={s.setPosition} style={input}/>{s.error&&<Text accessibilityRole="alert" style={{color:'#F87171'}}>{s.error}</Text>}<ActionButton accessibilityRole="button" disabled={!s.ready} onPress={()=>Alert.alert('Confirmar edición',`Nombre: ${s.fullName.trim()}\nPuesto: ${s.position.trim()}`,[{text:'Cancelar',style:'cancel'},{text:'Guardar',onPress:()=>void s.save()}])}>Guardar cambios</ActionButton><ActionButton accessibilityRole="button" disabled={s.busy} onPress={onClose}>Cerrar edición y actualizar</ActionButton></FormSection>;
}
