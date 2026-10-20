import {catalogServerPage,type CatalogKind} from './api';
import {catalogDocument} from './exportDocument';
import {PagedExportButtons} from './PagedExportButtons';

export function CatalogExportButtons({base,token,kind,search,status='',companyId,branchId,disabled,onExpired}:{
 base:string;token:string;kind:CatalogKind;search:string;status?:'ACTIVE'|'INACTIVE'|'';companyId:string;branchId:string;accent:string;disabled:boolean;onExpired:()=>void;
}){
 return <PagedExportButtons scopeKey={JSON.stringify([base,token,kind,search,status,companyId,branchId])} disabled={disabled}
  fetchPage={(cursor,signal)=>catalogServerPage(base,kind,token,signal,search,cursor,status)}
  rowKey={row=>row.id}
  buildDocument={rows=>catalogDocument(kind,rows,companyId,branchId,[search,status].filter(Boolean).join(' · '))}
  onExpired={onExpired}/>;
}
