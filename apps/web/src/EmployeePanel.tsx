import {PagedExportButtons} from './PagedExportButtons';
import {listDocument} from './listDocuments';
import {employeePage,type Employee} from './employeeApi';
import {DirectoryPagination} from './DirectoryPagination';
import {AdminDataTable,StatusBadge,AdminCreatePanel} from './AdminUi';
import {EmployeeDepartment} from './EmployeeDepartment';
import {EmployeeStatus} from './EmployeeStatus';
import {EmployeeEdit} from './EmployeeEdit';
import {EmployeeCreation} from './EmployeeCreation';
import {useEmployees} from './useEmployees';
export function EmployeePanel({base,token,companyId,branchId,canCreate,canManageDepartments,canEdit}:{base:string;token:string;companyId:string;branchId:string;canCreate:boolean;canManageDepartments:boolean;canEdit:boolean}){
 const s=useEmployees(base,token,companyId,branchId);
 return <section className="panel"><h2>Empleados de tu sucursal</h2><div className="directory-toolbar"><PagedExportButtons<Employee> scopeKey={[base,token,companyId,branchId,s.filter.search,s.filter.status].join('|')} disabled={s.loading||!!s.error} rowKey={r=>r.id} fetchPage={(cursor,signal)=>employeePage(base,token,companyId,branchId,{...s.filter,cursor},signal)} buildDocument={rows=>listDocument('Empleados',['Nombre','Puesto','Departamento','Estado'],rows.map(r=>[r.fullName,r.position,r.departmentName??'Nombre no disponible',r.status==='ACTIVE'?'Activo':'Inactivo']),[s.filter.search,s.filter.status].filter(Boolean).join(' · '),companyId,branchId)}/>{canCreate&&<AdminCreatePanel preserveInline title="Nuevo empleado"><EmployeeCreation key={token} canManageDepartments={canManageDepartments} base={base} token={token} companyId={companyId} branchId={branchId} onSaved={s.refresh} /></AdminCreatePanel>}</div><div className="admin-list-filters"><label>Nombre o puesto<input maxLength={100} value={s.search} onChange={e=>s.setSearch(e.target.value)}/></label><label>Estado<select value={s.status} onChange={e=>s.setStatus(e.target.value)}><option value="">Todos</option><option value="ACTIVE">Activos</option><option value="INACTIVE">Inactivos</option></select></label><button disabled={s.loading} onClick={s.apply}>Buscar</button></div>{s.loading&&<p>Consultando…</p>}{s.error&&<p role="alert">{s.error}</p>}{!s.loading&&!s.error&&!s.page.items.length&&<p>No hay empleados para estos filtros. Prueba otro nombre o muestra todos los estados.</p>}<AdminDataTable label="Empleados" rows={s.page.items} rowKey={row=>row.id} columns={[
 {key:'name',label:'Nombre y puesto',render:row=><><strong>{row.fullName}</strong><small>{row.position}</small></>},
 {key:'department',label:'Departamento',render:row=><>{row.departmentName??'Nombre no disponible'}<details className="record-details"><summary>Referencia</summary><small>{row.departmentId}</small></details></>},
 {key:'status',label:'Estado',render:row=><StatusBadge status={row.status} label={row.status==='ACTIVE'?'Activo':'Inactivo'}/>},
 ...(canEdit?[{key:'actions',label:'Acciones',render:(row:Employee)=><div className="erp-record-actions"><EmployeeEdit base={base} token={token} employee={row} onSaved={s.refresh}/><EmployeeStatus base={base} token={token} employee={row} onSaved={s.refresh}/><EmployeeDepartment base={base} token={token} employee={row} onSaved={s.refresh}/></div>}]:[])
 ]}/><DirectoryPagination page={s.pageNumber} count={s.page.items.length} loading={s.loading} hasNext={!!s.page.nextCursor} error={!!s.error} onPrevious={s.previous} onNext={s.next} onRefresh={s.refresh}/></section>;
}
