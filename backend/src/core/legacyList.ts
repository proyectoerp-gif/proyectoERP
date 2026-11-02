import {AppError} from '../errors/AppError.js';
export function boundedLegacyRows<T>(rows:T[]):T[]{
 if(rows.length>200)throw new AppError({code:'VALIDATION_ERROR',statusCode:413,message:'Legacy listing exceeds safe bound',friendlyMessage:'Este listado antiguo supera 200 registros. Usa la aplicación actualizada con búsqueda y paginación.'});
 return rows;
}
