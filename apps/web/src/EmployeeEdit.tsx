import {ValidatedInput} from './ValidatedInput';
import {AdminActiveForm} from './AdminUi';
import {confirmAction} from './interaction';
import {useState} from 'react';
import {useEmployeeEdit} from './useEmployeeEdit';
import type {Employee} from './employeeApi';
type Props={base:string;token:string;employee:Employee;onSaved:()=>void};
export function EmployeeEdit(p:Props){const [open,setOpen]=useState(false);return open?<AdminActiveForm title="Editar empleado" onClose={()=>{setOpen(false);p.onSaved();}}><Form {...p} onClose={()=>{setOpen(false);p.onSaved();}}/></AdminActiveForm>:<button onClick={()=>setOpen(true)}>Editar nombre y puesto</button>;}
function Form({base,token,employee,onSaved,onClose}:Props&{onClose:()=>void}){
 const s=useEmployeeEdit(base,token,employee,onSaved);
 return <fieldset data-operation-pending={s.busy}><legend>Editar empleado</legend><label>Nombre completo<ValidatedInput disabled={s.busy||s.blocked} required minLength={2} placeholder="Ej. Ana Flores" maxLength={120} value={s.fullName} onChange={e=>s.setFullName(e.target.value)}/></label><label>Puesto<ValidatedInput disabled={s.busy||s.blocked} required minLength={2} placeholder="Ej. Asesora de ventas" maxLength={100} value={s.position} onChange={e=>s.setPosition(e.target.value)}/></label>{s.error&&<p role="alert">{s.error}</p>}<button disabled={!s.ready} onClick={async ()=>{if((await confirmAction(`Guardar el nombre ${s.fullName.trim()} y puesto ${s.position.trim()}?`)))void s.save();}}>Guardar cambios</button><button disabled={s.busy} onClick={async()=>{if(s.fullName===employee.fullName&&s.position===employee.position||await confirmAction('Cerrar sin guardar los cambios del empleado?',{title:'Descartar cambios',confirmLabel:'Cerrar sin guardar',danger:true}))onClose();}}>Cerrar edición y actualizar</button></fieldset>;
}
