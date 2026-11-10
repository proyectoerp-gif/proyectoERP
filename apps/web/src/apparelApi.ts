import {ApiError,requestData} from './webApi';
export const apparelSizes=['XS','S','M','L','XL','XXL','Única'] as const;
export const garments={tee:'Camiseta o top',shirt:'Camisa',knit:'Prenda de punto',trousers:'Pantalón',jeans:'Jeans',skirt:'Falda',dress:'Vestido',blazer:'Blazer',jacket:'Chaqueta',coat:'Abrigo',bag:'Bolso',cap:'Gorra',scarf:'Bufanda'};
export type Apparel={audience:'Mujer'|'Hombre'|'Unisex';sizes:Array<typeof apparelSizes[number]>;color:string;colorHex:string;material:string;description:string;garment:keyof typeof garments};
export function apparelErrors(value:Apparel):Partial<Record<keyof Apparel,string>> {
  const errors:Partial<Record<keyof Apparel,string>>={};
  if(!['Mujer','Hombre','Unisex'].includes(value.audience))errors.audience='Elige una colección.';
  if(!Object.hasOwn(garments,value.garment))errors.garment='Elige un tipo de prenda.';
  if(!Array.isArray(value.sizes)||!value.sizes.length||value.sizes.length>7||new Set(value.sizes).size!==value.sizes.length||value.sizes.some(size=>!apparelSizes.includes(size)))errors.sizes='Selecciona al menos una talla sin repetir.';
  for(const [key,min,max,label] of [['color',2,40,'color'],['material',2,100,'material'],['description',10,700,'descripción']] as const){if(typeof value[key]!=='string'||value[key].trim().length<min||value[key].trim().length>max)errors[key]=`Escribe ${label} entre ${min} y ${max} caracteres.`;}
  if(!/^#[a-f0-9]{6}$/i.test(value.colorHex))errors.colorHex='Elige un color válido.';
  return errors;
}
export function parseApparel(raw:unknown):Apparel {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new ApiError('La ficha de moda no es válida.');
  const value=raw as Apparel;
  if(Object.keys(apparelErrors(value)).length)throw new ApiError('La ficha de moda no es válida.');
  return {audience:value.audience,sizes:[...value.sizes],color:value.color,colorHex:value.colorHex,material:value.material,description:value.description,garment:value.garment};
}
export async function saveApparel(base:string,token:string,id:string,value:Apparel,expected:Apparel|null,signal:AbortSignal) {
  const apparel=parseApparel({...value,color:value.color.trim(),material:value.material.trim(),description:value.description.trim()});
  if(!/^[a-f0-9]{24}$/i.test(id))throw new ApiError('Selecciona un producto válido.');
  const raw=await requestData(base,'/products/'+id+'/apparel',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({apparel,expected:expected?parseApparel(expected):null}),signal});
  const data=raw as {id?:string;apparel?:unknown}|null;
  if(!data||data.id!==id||JSON.stringify(parseApparel(data.apparel))!==JSON.stringify(apparel))throw new ApiError('No se pudo confirmar la ficha. Actualiza el catálogo antes de reintentar.');
}
