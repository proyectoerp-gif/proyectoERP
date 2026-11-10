import {useEffect,useId,useRef,useState,type FormEvent} from 'react';
import {apparelErrors,apparelSizes,garments,saveApparel,type Apparel} from './apparelApi';
import {confirmAction,notifySuccess} from './interaction';
import {ApiError} from './webApi';
export function ApparelEditor({base,token,product,onSaved,onCancel}:{base:string;token:string;product:{id:string;name:string;apparel?:Apparel};onSaved:()=>void;onCancel:()=>void}) {
  const [draft,setDraft]=useState<Apparel>(()=>product.apparel?{...product.apparel,sizes:[...product.apparel.sizes]}:{audience:'Unisex',sizes:[],color:'',colorHex:'#808080',material:'',description:'',garment:'tee'});
  const [submitted,setSubmitted]=useState(false),[busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false),[error,setError]=useState('');
  const controller=useRef<AbortController|null>(null),form=useRef<HTMLFormElement>(null),id=useId();
  useEffect(()=>()=>controller.current?.abort(),[]);
  const initial=useRef(JSON.stringify(draft));
  const errors=apparelErrors(draft),dirty=JSON.stringify(draft)!==initial.current;
  const update=<K extends keyof Apparel>(key:K,value:Apparel[K])=>setDraft(current=>({...current,[key]:value}));
  async function submit(event:FormEvent){
    event.preventDefault();if(controller.current||blocked)return;setSubmitted(true);setError('');
    if(Object.keys(errors).length){requestAnimationFrame(()=>form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());return;}
    if(!await confirmAction(`Guardar la ficha de moda de ${product.name}?\nLos cambios de descripción se verán en el catálogo público si el producto está publicado. Las tallas son descriptivas; no se modifica inventario.`,{title:'Revisar ficha de moda',confirmLabel:'Guardar ficha'}))return;
    const c=new AbortController();controller.current=c;setBusy(true);
    try{await saveApparel(base,token,product.id,draft,product.apparel??null,c.signal);if(!c.signal.aborted){notifySuccess('Ficha de moda guardada.');onSaved();}}
    catch(e){if(!c.signal.aborted){setError(e instanceof Error?e.message:'No se pudo guardar la ficha.');setBlocked(!(e instanceof ApiError&&[400,403].includes(e.status)));}}
    finally{controller.current=null;if(!c.signal.aborted)setBusy(false);}
  }
  const attributes=(key:keyof Apparel)=>({id:id+'-'+key,'aria-invalid':submitted&&!!errors[key]||undefined,'aria-describedby':submitted&&errors[key]?id+'-'+key+'-error':undefined});
  const feedback=(key:keyof Apparel)=>submitted&&errors[key]?<small id={id+'-'+key+'-error'} className="field-error">{errors[key]}</small>:null;
  return <form ref={form} noValidate onSubmit={event=>void submit(event)} aria-busy={busy} data-operation-pending={busy}>
    <p>Ficha de <strong>{product.name}</strong>. Los campos son obligatorios. Guarda primero el producto y después completa su ficha de moda.</p>
    <p className="erp-next-step">Tallas descriptivas: no representan existencias por talla ni medidas verificadas. Guardar esta ficha no mueve dinero ni inventario.</p>
    <fieldset disabled={busy||blocked}><legend>Características de la prenda</legend>
      <div className="field"><label htmlFor={id+'-audience'}>Colección</label><select {...attributes('audience')} value={draft.audience} onChange={e=>update('audience',e.target.value as Apparel['audience'])}>{['Mujer','Hombre','Unisex'].map(value=><option key={value}>{value}</option>)}</select>{feedback('audience')}</div>
      <div className="field"><label htmlFor={id+'-garment'}>Tipo de prenda</label><select {...attributes('garment')} value={draft.garment} onChange={e=>update('garment',e.target.value as Apparel['garment'])}>{Object.entries(garments).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>{feedback('garment')}</div>
      <fieldset className="apparel-size-options"><legend>Tallas descriptivas</legend>{apparelSizes.map((size,index)=><label key={size}><input {...(index===0?attributes('sizes'):{})} type="checkbox" checked={draft.sizes.includes(size)} onChange={e=>update('sizes',e.target.checked?[...draft.sizes,size]:draft.sizes.filter(value=>value!==size))}/>{size}</label>)}{feedback('sizes')}</fieldset>
      <div className="field"><label htmlFor={id+'-color'}>Nombre del color</label><input {...attributes('color')} required maxLength={40} placeholder="Ej. Azul marino" value={draft.color} onChange={e=>update('color',e.target.value)}/>{feedback('color')}</div>
      <div className="field"><label htmlFor={id+'-colorHex'}>Muestra de color aproximada</label><input {...attributes('colorHex')} type="color" value={draft.colorHex} onChange={e=>update('colorHex',e.target.value)}/>{feedback('colorHex')}</div>
      <div className="field"><label htmlFor={id+'-material'}>Material</label><input {...attributes('material')} required maxLength={100} placeholder="Ej. Algodón · dato de demostración" value={draft.material} onChange={e=>update('material',e.target.value)}/>{feedback('material')}</div>
      <div className="field"><label htmlFor={id+'-description'}>Descripción de la prenda</label><textarea {...attributes('description')} required minLength={10} maxLength={700} placeholder="Describe el corte, estilo y cuidados conocidos." value={draft.description} onChange={e=>update('description',e.target.value)}/><small>{draft.description.length}/700 caracteres</small>{feedback('description')}</div>
      <div className="erp-form-actions"><button type="submit" className="primary-button" disabled={!dirty}>{busy?'Guardando…':'Revisar y guardar ficha'}</button><button type="button" onClick={async()=>{if(!dirty||await confirmAction('Cerrar sin guardar los cambios de la ficha?',{title:'Descartar cambios',confirmLabel:'Cerrar sin guardar',danger:true}))onCancel();}}>Cancelar</button></div>
    </fieldset>{error&&<p role="alert" className="error-box">{error}</p>}{blocked&&<p>Cierra esta ficha y pulsa Actualizar en el catálogo para cargar la versión del servidor.</p>}
  </form>;
}
