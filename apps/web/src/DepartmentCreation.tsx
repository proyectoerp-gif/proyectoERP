import {confirmAction,notifySuccess} from './interaction';
import {useDepartmentCreation} from './useDepartmentCreation';
import type {CreatedDepartment} from './departmentCreationApi';
export function DepartmentCreation({base,token,companyId,branchId,onCreated}:{base:string;token:string;companyId:string;branchId:string;onCreated:(row:CreatedDepartment)=>void}){
 const s=useDepartmentCreation(base,token,companyId,branchId,row=>{notifySuccess('Departamento creado.');onCreated(row);});
 return <fieldset data-operation-pending={s.busy} aria-busy={s.busy} disabled={s.busy||s.blocked}><legend>Nuevo departamento de esta sucursal</legend><label>Nombre<input maxLength={120} value={s.name} onChange={e=>s.setName(e.target.value)}/></label><label>Código único<input maxLength={32} value={s.code} onChange={e=>s.setCode(e.target.value)}/></label>{s.message&&<p role="status">{s.message}</p>}<button disabled={!s.ready} onClick={async ()=>{if((await confirmAction(`Crear departamento ${s.name.trim()} (${s.code.trim().toUpperCase()}) en esta sucursal?`)))void s.save();}}>Crear departamento</button></fieldset>;
}
