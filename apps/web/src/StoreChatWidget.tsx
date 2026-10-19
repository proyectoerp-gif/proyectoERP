import React,{useEffect,useRef} from 'react';
import {DemoSupportPage} from './DemoSupport';

export function BotIcon(){return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 5V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="16" cy="4" r="2" fill="currentColor"/><rect x="5" y="9" width="22" height="18" rx="7" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="17" r="2" fill="currentColor"/><circle cx="21" cy="17" r="2" fill="currentColor"/><path d="M12 23H20M2 16V21M30 16V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;}

export function StoreChatWidget({base,open,onClose,question}:{base:string;open:boolean;onClose:()=>void;question?:{text:string;request:number;productId?:string}}){
  const panel=useRef<HTMLElement>(null),previous=useRef<HTMLElement|null>(null),close=useRef(onClose);close.current=onClose;
  useEffect(()=>{
    if(!open)return;
    if(!panel.current?.contains(document.activeElement))previous.current=document.activeElement as HTMLElement|null;
    const focusTarget=question?panel.current?.querySelector<HTMLElement>('textarea:not(:disabled)'):null;
    (focusTarget??panel.current?.querySelector<HTMLElement>('.store-widget-close'))?.focus({preventScroll:true});
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close.current();}};
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('keydown',escape);if(previous.current?.isConnected)previous.current.focus({preventScroll:true});};
  },[open]);
  return <section ref={panel} id="store-chat" className="store-chat-widget" role="dialog" aria-modal="false" aria-labelledby="store-widget-title" hidden={!open}>
    <div className="store-widget-heading"><span className="store-widget-avatar"><BotIcon/></span><div><h2 id="store-widget-title">Asistente Albor</h2><p>Demo · Atención al cliente</p></div><button type="button" className="store-widget-close" aria-label="Minimizar chat" onClick={onClose}>−</button></div>
    <div className="store-widget-body"><DemoSupportPage base={base} embedded compact suggestedQuestion={question}/></div>
    <p className="store-widget-footnote">Puedes seguir explorando. Cerrar conserva esta conversación.</p>
  </section>;
}
