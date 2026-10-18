import {requestData,ApiError} from './webApi';
export type RemovableKind='products'|'customers'|'suppliers'|'bank-accounts';
export async function changeCatalogState(base:string,token:string,kind:RemovableKind,entry:{id:string;name:string;status:string},signal?:AbortSignal){
 if(!['products','customers','suppliers','bank-accounts'].includes(kind)||!/^[a-f0-9]{24}$/i.test(entry.id)||!['ACTIVE','INACTIVE'].includes(entry.status))throw new ApiError('Actualiza el registro antes de continuar.');
 const status=entry.status==='ACTIVE'?'INACTIVE':'ACTIVE';
 const data=await requestData(base,`/${kind}/${entry.id}/status`,{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({expectedStatus:entry.status,status,expectedName:entry.name}),signal});
 if(!data||typeof data!=='object'||!('id' in data)||!('name' in data)||!('status' in data)||data.id!==entry.id||data.name!==entry.name||data.status!==status)throw new ApiError('No se pudo confirmar el cambio. Actualiza el listado antes de repetir.');
 return data;
}
