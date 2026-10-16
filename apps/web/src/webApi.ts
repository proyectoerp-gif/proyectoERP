export class ApiError extends Error {constructor(message:string,public status=0){super(message);}}
export async function requestData(base:string,path:string,options:RequestInit={}) : Promise<unknown> {
 const response=await fetch(base+path,options);
 if(response.status===401)throw new ApiError('Tu sesión expiró. Vuelve a iniciar sesión.',401);
 if(response.status===403)throw new ApiError('No tienes permiso para esta operación.',403);
 if(!response.ok){
   const body=await response.json().catch(()=>null),error=body?.error;
   const safe=response.status>=400&&response.status<500&&body?.ok===false&&['VALIDATION_ERROR','CONFLICT','NOT_FOUND','RATE_LIMITED'].includes(error?.code)&&typeof error?.message==='string'&&error.message.trim().length>0&&error.message.length<=500&&!/[\r\n\u0000-\u001f]/.test(error.message);
   const fallback=response.status===409?'El registro cambió o ya existe. Actualiza antes de reintentar.':response.status===400?'Revisa los datos ingresados.':response.status===429?'Demasiadas solicitudes. Espera un momento antes de reintentar.':'No se pudo confirmar la operación. Actualiza antes de reintentar.';
   throw new ApiError(safe?error.message:fallback,response.status);
 }
 const result=await response.json();if(!result||!('data' in result))throw new ApiError('No se pudo confirmar la respuesta.');return result.data;
}
