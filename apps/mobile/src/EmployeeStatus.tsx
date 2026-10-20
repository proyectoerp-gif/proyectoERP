import {ActionButton} from './ModuleLayout';
import {Alert,Pressable,Text,View} from './ui';
import type {Employee} from './employeeApi';
import {useEmployeeStatus} from './useEmployeeStatus';
export function EmployeeStatus({base,token,employee,onSaved,accent,onExpired}:{base:string;token:string;employee:Employee;onSaved:()=>void;accent:string;onExpired:()=>void}){
 const s=useEmployeeStatus(base,token,employee,onSaved,onExpired);
 const label=employee.status==='ACTIVE'?'Desactivar empleado':'Reactivar empleado';
 return <View><ActionButton accessibilityRole="button" disabled={s.busy||s.blocked} onPress={()=>Alert.alert(label,`${employee.fullName}. El registro laboral conserva su historial. Esto no cambia el acceso de su cuenta al ERP. Para reactivar, el usuario y departamento deben estar activos.`,[{text:'Cancelar',style:'cancel'},{text:label,onPress:()=>void s.save()}])}>{s.busy?'Guardando estado…':label}</ActionButton>{s.error&&<Text accessibilityRole="alert" style={{color:'#F87171'}}>{s.error}</Text>}{s.blocked&&<ActionButton accessibilityRole="button" onPress={onSaved}>Actualizar estado desde el servidor</ActionButton>}</View>;
}
