import {useEffect,useId,useRef,useState} from 'react';
import {requestData} from './webApi';
import {confirmAction,notifySuccess} from './interaction';

export function ProductThumbnail({base,token,id,version,name}:{base:string;token:string;id:string;version?:string;name:string}){
  const [url,setUrl]=useState('');
  useEffect(()=>{
    setUrl('');
    if(!version)return;
    const controller=new AbortController();
    let objectUrl='';
    fetch(base+'/products/'+id+'/image',{headers:{Authorization:'Bearer '+token},signal:controller.signal})
      .then(async response=>{
        if(!response.ok)return;
        const blob=await response.blob();
        if(controller.signal.aborted)return;
        objectUrl=URL.createObjectURL(blob);
        setUrl(objectUrl);
      }).catch(()=>undefined);
    return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[base,token,id,version]);
  return url?<img className="product-thumbnail" src={url} alt={name}/>:<span className="product-thumbnail product-thumbnail-empty" aria-label="Sin imagen">Sin imagen</span>;
}

async function prepareImage(file:File):Promise<string>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Usa JPEG, PNG o WebP de hasta 5 MB.');
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  try{
    if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>12_000_000)throw new Error('La imagen supera 12 megapíxeles. Usa una versión más pequeña.');
    const ratio=Math.min(1,640/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*ratio));
    canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
    const context=canvas.getContext('2d');
    if(!context)throw new Error('No se pudo preparar la imagen.');
    context.fillStyle='#ffffff';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/jpeg',0.78);
    if(data.length>480_000)throw new Error('La imagen tiene demasiado detalle. Usa una versión más pequeña.');
    return data;
  }finally{bitmap.close();}
}

export function ProductImageInput({value,onChange,onBusy,disabled=false}:{value:string|null;onChange:(value:string|null)=>void;onBusy:(busy:boolean)=>void;disabled?:boolean}){
  const id=useId(),generation=useRef(0),input=useRef<HTMLInputElement>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>()=>{generation.current++;},[]);
  async function select(file?:File){
    const current=++generation.current;
    setError('');
    if(!file)return;
    setBusy(true);onBusy(true);
    try{
      const data=await prepareImage(file);
      if(current===generation.current)onChange(data);
    }catch(cause){
      if(current===generation.current)setError(cause instanceof Error?cause.message:'No se pudo leer la imagen.');
    }finally{
      if(current===generation.current){setBusy(false);onBusy(false);}
    }
  }
  return <div className="product-image-field" data-operation-pending={busy} aria-busy={busy}>
    <label htmlFor={id}>Imagen del producto</label>
    <p id={id+'-help'}>JPEG, PNG o WebP · Hasta 5 MB y 12 megapíxeles. Se optimiza automáticamente.</p>
    <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||busy}
      aria-describedby={id+'-help'} onChange={event=>void select(event.target.files?.[0])}/>
    {busy&&<p role="status">Preparando imagen…</p>}
    {value&&<div className="product-image-preview"><img src={value} alt="Vista previa de la imagen seleccionada"/><button type="button" disabled={disabled||busy} onClick={()=>{generation.current++;onChange(null);setError('');if(input.current)input.current.value='';}}>Quitar selección</button></div>}
    {error&&<p role="alert" className="error-box">{error}</p>}
  </div>;
}

export function ProductImageEditor({base,token,product,onSaved}:{base:string;token:string;product:{id:string;name:string;imageVersion?:string};onSaved:()=>void}){
  const [value,setValue]=useState<string|null>(null),[preparing,setPreparing]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const lock=useRef(false),controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  async function save(remove=false){
    if(lock.current||preparing||(!remove&&!value))return;
    if(remove&&!await confirmAction('Se quitará la imagen de '+product.name+'.',{title:'Quitar imagen',confirmLabel:'Quitar imagen',danger:true}))return;
    lock.current=true;setSaving(true);setError('');
    const request=new AbortController();controller.current=request;
    try{
      const result=await requestData(base+'/products/'+product.id,'/image',{method:'PATCH',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({imageData:remove?null:value,expectedVersion:product.imageVersion??null}),signal:request.signal});
      if(request.signal.aborted)return;
      if(!result||typeof result!=='object'||!('id'in result)||result.id!==product.id)throw new Error('Actualiza el catálogo para confirmar el cambio de imagen.');
      notifySuccess(remove?'Imagen eliminada.':'Imagen guardada.');
      onSaved();
    }catch(cause){if(!request.signal.aborted)setError(cause instanceof Error?cause.message:'No se pudo guardar la imagen. Actualiza el catálogo antes de reintentar.');}
    finally{lock.current=false;if(!request.signal.aborted)setSaving(false);}
  }
  return <section className="panel" data-operation-pending={saving||preparing}>
    <h3>{product.name}</h3>
    {product.imageVersion&&<><p>Imagen actual</p><ProductThumbnail base={base} token={token} id={product.id} version={product.imageVersion} name={product.name}/></>}
    <ProductImageInput value={value} onChange={setValue} onBusy={setPreparing} disabled={saving}/>
    <div className="erp-row-actions">
      <button type="button" className="primary-button" disabled={saving||preparing||!value} onClick={()=>void save()}>{saving?'Guardando…':'Guardar imagen'}</button>
      {product.imageVersion&&<button type="button" disabled={saving||preparing} onClick={()=>void save(true)}>Quitar imagen actual</button>}
    </div>
    {error&&<p role="alert" className="error-box">{error}</p>}
  </section>;
}
