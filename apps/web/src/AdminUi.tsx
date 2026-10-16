import React,{createContext,useContext,useEffect,useId,useRef,type ReactNode} from 'react';
import {statusTone} from './adminPresentation';
export const AdminPresentationContext=createContext(false);
export const useAdminPresentation=()=>useContext(AdminPresentationContext);

// A native modal retains its form tree and draft when closed. Browser handles focus and background inertness.
export function AdminCreatePanel({title,children,primary=true,preserveInline=false}:{title:string;children:ReactNode;primary?:boolean;preserveInline?:boolean}){
  const admin=useAdminPresentation(),dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),id=useId();
  const close=()=>{if(dialog.current?.querySelector('[aria-busy="true"]'))return;dialog.current?.close();trigger.current?.focus();};
  useEffect(()=>()=>{dialog.current?.close();},[]);
  const originalTitle:Record<string,string>={'Nueva venta':'Crear una venta','Nueva orden':'Crear una orden de compra','Nuevo cliente':'Agregar un cliente','Nuevo proveedor':'Agregar un proveedor','Nueva categoría':'Crear una categoría','Nuevo producto':'Agregar un producto'};
  if(!admin)return preserveInline?<>{children}</>:<details className="action-disclosure"><summary>{originalTitle[title]??title}<span className="disclosure-marker" aria-hidden="true">+</span></summary><div className="action-disclosure-body">{children}</div></details>;
  return <div className="admin-create-action"><button type="button" ref={trigger} className={primary?'primary-button':''} aria-haspopup="dialog" onClick={()=>{dialog.current?.showModal();dialog.current?.querySelector<HTMLElement>('input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')?.focus();}}><span aria-hidden="true">＋</span>{title}</button>
    <dialog ref={dialog} className="admin-form-dialog" aria-labelledby={id} onCancel={event=>{event.preventDefault();close();}}>
      <div className="admin-dialog-heading"><div><span className="eyebrow">Núcleo · Administrar</span><h2 id={id}>{title}</h2></div><button type="button" aria-label={'Cerrar '+title} onClick={close}>×</button></div>
      {children}<div className="admin-dialog-footer"><p>Revisa los datos antes de confirmar. Cerrar conserva el borrador en esta pantalla.</p><button type="button" onClick={close}>Cerrar panel</button></div>
    </dialog>
  </div>;
}
export function AdminActiveForm({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
  const admin=useAdminPresentation(),dialog=useRef<HTMLDialogElement>(null),id=useId();
  useEffect(()=>{if(!admin)return;const element=dialog.current;element?.showModal();element?.querySelector<HTMLElement>('input:not(:disabled),select:not(:disabled),textarea:not(:disabled)')?.focus();return()=>element?.close();},[admin]);
  const close=()=>{if(!dialog.current?.querySelector('[aria-busy="true"]'))onClose();};
  if(!admin)return <>{children}</>;
  return <dialog ref={dialog} className="admin-form-dialog" aria-labelledby={id} onCancel={event=>{event.preventDefault();close();}}><div className="admin-dialog-heading"><h2 id={id}>{title}</h2><button type="button" aria-label={'Cerrar '+title} onClick={close}>×</button></div>{children}</dialog>;
}
export function AdminEntitySelector({label,selected,children}:{label:string;selected?:{id:string;name:string}|null;children:ReactNode}){
  const admin=useAdminPresentation(),ref=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{if(selected&&ref.current)ref.current.open=false;},[selected?.id]);
  if(!admin)return <>{children}</>;
  return <details ref={ref} className="admin-entity-selector"><summary><span>{label}</span><strong>{selected?.name??'Seleccionar…'}</strong><span aria-hidden="true">⌄</span></summary>{children}</details>;
}
export function StatusBadge({status,label}:{status:string;label:string}){return <span className={'admin-status admin-status-'+statusTone(status)}><span aria-hidden="true"/>{label}</span>;}
export type AdminColumn<T>={key:string;label:string;render:(row:T)=>ReactNode};
export function AdminDataTable<T>({label,columns,rows,rowKey}:{label:string;columns:AdminColumn<T>[];rows:T[];rowKey:(row:T)=>string}){
  return <div className="admin-table-wrap"><table className="admin-data-table"><caption className="sr-only">{label}</caption><thead><tr>{columns.map(column=><th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={rowKey(row)}>{columns.map(column=><td key={column.key} data-label={column.label}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>;
}
