import React,{useEffect,useRef,useState} from 'react';
import {confirmationBroker,listenForNotices,type Confirmation} from './interaction';
import './interactions.css';

export function InteractionHost(){
  const [prompt,setPrompt]=useState<Confirmation|null>(null),[notice,setNotice]=useState<{message:string;kind:'success'|'info'}|null>(null);
  const dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null);
  useEffect(()=>confirmationBroker.attach(setPrompt),[]);
  useEffect(()=>listenForNotices(setNotice),[]);
  useEffect(()=>{const element=dialog.current;if(prompt){element?.showModal();cancel.current?.focus();}else element?.close();},[prompt]);
  useEffect(()=>{const beforeUnload=(event:BeforeUnloadEvent)=>{if(document.querySelector('[data-operation-pending="true"],[data-form-dirty="true"]')){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',beforeUnload);return()=>window.removeEventListener('beforeunload',beforeUnload);},[]);
  const settle=(confirmed:boolean)=>{if(prompt)confirmationBroker.settle(prompt.id,confirmed);};
  return <><dialog ref={dialog} className="erp-confirm-dialog" aria-labelledby="erp-confirm-title" aria-describedby="erp-confirm-description" onCancel={event=>{event.preventDefault();settle(false);}} onClose={()=>{if(!dialog.current?.open)settle(false);}}>
    <span className="eyebrow">Confirmación de la operación</span><h2 id="erp-confirm-title">{prompt?.title}</h2><p id="erp-confirm-description">{prompt?.message}</p><div className="erp-confirm-actions"><button ref={cancel} type="button" onClick={()=>settle(false)}>Volver y revisar</button><button type="button" className={prompt?.danger?'erp-danger-button':'primary-button'} onClick={()=>settle(true)}>{prompt?.confirmLabel}</button></div>
  </dialog>{notice&&<aside className={'erp-notice erp-notice-'+notice.kind} role="status"><div><strong>{notice.kind==='success'?'Operación confirmada':'Espera un momento'}</strong><p>{notice.message}</p></div><button type="button" aria-label="Cerrar mensaje" onClick={()=>setNotice(null)}>×</button></aside>}</>;
}
