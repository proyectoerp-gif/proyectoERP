import {ActionButton} from './ModuleLayout';
import {useEditorBusy} from './EditorSheet';
import {Alert,Pressable,Text,TextInput,View} from './ui';
import {useDepartmentCreation} from './useDepartmentCreation';
import type {CreatedDepartment} from './departmentCreationApi';
export function DepartmentCreation({base,token,companyId,branchId,onCreated,accent,onExpired,disabled}:{base:string;token:string;companyId:string;branchId:string;onCreated:(row:CreatedDepartment)=>void;accent:string;onExpired:()=>void;disabled:boolean}){
 const s=useDepartmentCreation(base,token,companyId,branchId,onCreated,onExpired);const locked=disabled||s.busy||s.blocked;const input={color:'#F1F5F9',backgroundColor:'#0B1118',padding:12,borderRadius:12};const note={color:'#8B99A8',marginVertical:8};
 useEditorBusy(!!s.busy);return <View><Text style={{color:'#F1F5F9',fontSize:18,fontWeight:'700'}}>Nuevo departamento de esta sucursal</Text><Text style={note}>Nombre</Text><TextInput accessibilityLabel="Nombre del departamento" editable={!locked} maxLength={120} value={s.name} onChangeText={s.setName} style={input}/><Text style={note}>Código único</Text><TextInput accessibilityLabel="Código del departamento" editable={!locked} autoCapitalize="characters" maxLength={32} value={s.code} onChangeText={s.setCode} style={input}/>{s.message&&<Text accessibilityRole="alert" style={note}>{s.message}</Text>}<ActionButton accessibilityRole="button" disabled={locked||!s.ready} onPress={()=>Alert.alert('Confirmar departamento',`${s.name.trim()} (${s.code.trim().toUpperCase()})\nSe creará en esta sucursal.`,[{text:'Cancelar',style:'cancel'},{text:'Crear',onPress:()=>void s.save()}])}>Crear departamento</ActionButton></View>;
}
