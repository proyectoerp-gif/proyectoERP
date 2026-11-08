import sharp from 'sharp';
import {AppError} from '../../errors/AppError.js';

export const maxImageDataLength=480_000;
export async function normalizeProductImage(value:unknown):Promise<string>{
  const invalid=()=>new AppError({code:'VALIDATION_ERROR',statusCode:400,message:'Invalid product image',friendlyMessage:'Selecciona una imagen JPEG, PNG o WebP válida. Prueba con una imagen más pequeña.'});
  if(typeof value!=='string'||value.length>maxImageDataLength)throw invalid();
  const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if(!match)throw invalid();
  const input=Buffer.from(match[2],'base64');
  if(input.toString('base64')!==match[2])throw invalid();
  try{
    const image=sharp(input,{limitInputPixels:12_000_000,failOn:'warning'});
    const metadata=await image.metadata();
    if(!['jpeg','png','webp'].includes(metadata.format??'')||(metadata.pages??1)>1)throw invalid();
    const output=await image.rotate().resize(640,640,{fit:'inside',withoutEnlargement:true})
      .flatten({background:'#ffffff'}).jpeg({quality:78}).toBuffer();
    const result='data:image/jpeg;base64,'+output.toString('base64');
    if(result.length>maxImageDataLength)throw invalid();
    return result;
  }catch{throw invalid();}
}
