import React, {useEffect,useRef,useState,type FormEvent} from 'react';
import './demoSupport.css';

type Article={id:string;title:string;content:string;version:string;source:string};
type Info={business:{name:string;description:string;notice:string;mode:string;provider?:string|null;limits?:{conversation:number;visitorDaily:number;daily:number}};articles:Article[]};
type Message={requestId:string;question:string;answer:string;source:null|{id:string;title:string;version:string;name:string};needsHuman:boolean;engine?:string;limitReason?:string;sources?:{id:string;title:string;version:string;name:string}[]};
type Conversation={id:string;messages:Message[];ticketId:string|null;expiresAt:string;aiRemaining?:number};
async function request<T>(base:string,path:string,options:RequestInit={}):Promise<T>{
  const response=await fetch(base+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const json=await response.json().catch(()=>null);
  if(!response.ok||json?.ok!==true)throw new Error(json?.error?.friendlyMessage??json?.error?.message??'No se pudo completar la consulta. Intenta de nuevo.');
  return json.data as T;
}
function Manual({info}:{info:Info}){return <div className="demo-manual">{info.articles.map(article=><details key={article.id} id={'faq-'+article.id}><summary>{article.title}</summary><p>{article.content}</p><small>{article.source} · Versión {article.version}</small></details>)}</div>;}

export function DemoSupportPage({base,embedded=false,compact=false,suggestedQuestion}:{base:string;embedded?:boolean;compact?:boolean;suggestedQuestion?:{text:string;request:number;productId?:string}}){
  const [info,setInfo]=useState<Info>(),[loadError,setLoadError]=useState(''),[tab,setTab]=useState('chat');
  const [conversation,setConversation]=useState<Conversation>(),[token,setToken]=useState(''),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [productId,setProductId]=useState<string>();
  const [topic,setTopic]=useState(''),[menuOpen,setMenuOpen]=useState(true);
  const pending=useRef<{requestId:string;question:string;productId?:string;articleId?:string}>(),lock=useRef(false);
  const questionInput=useRef<HTMLTextAreaElement>(null),scrollArea=useRef<HTMLDivElement>(null),Container=embedded?'section':'main',Heading=embedded?'h2':'h1';
  useEffect(()=>{
    if(!suggestedQuestion)return;
    setTab('chat');setMenuOpen(false);
    if(lock.current||pending.current||conversation?.ticketId){setError('Termina la consulta pendiente o inicia una nueva conversación para preguntar por otro producto.');return;}
    setError('');setQuestion(suggestedQuestion.text);setProductId(suggestedQuestion.productId);
  },[suggestedQuestion]);
  useEffect(()=>{if(suggestedQuestion&&tab==='chat'&&questionInput.current?.getClientRects().length)questionInput.current.focus({preventScroll:true});},[suggestedQuestion,tab,info]);
  useEffect(()=>{const controller=new AbortController();request<Info>(base,'/demo-support/info',{signal:controller.signal}).then(setInfo).catch(e=>{if(!controller.signal.aborted)setLoadError(e.message);});return()=>controller.abort();},[base]);
  useEffect(()=>{const area=scrollArea.current;if(area)area.scrollTo({top:conversation?.messages.length?area.scrollHeight:0,behavior:conversation?.messages.length&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});},[conversation?.messages.length,conversation?.ticketId,busy,tab]);
  async function send(event?:FormEvent,article?:Article){
    event?.preventDefault();if(lock.current||(!pending.current&&!article&&question.trim().length<3))return;
    lock.current=true;setBusy(true);setMenuOpen(false);setTopic('');setError('');
    const payload=pending.current??{requestId:crypto.randomUUID(),question:article?.title??question.trim(),...(article?{articleId:article.id}:productId?{productId}:{})};pending.current=payload;
    try{
      let current=conversation,currentToken=token;
      if(!current){const created=await request<Conversation&{token:string}>(base,'/demo-support/conversations',{method:'POST',body:'{}'});current=created;currentToken=created.token;setConversation(created);setToken(created.token);}
      const updated=await request<Conversation>(base,'/demo-support/conversations/'+current.id+'/messages',{method:'POST',headers:{Authorization:'Bearer '+currentToken},body:JSON.stringify(payload)});
      setConversation(updated);pending.current=undefined;setQuestion('');if(payload.articleId)setProductId(undefined);
    }catch(e){setError(e instanceof Error?e.message:'No se pudo enviar.');}finally{lock.current=false;setBusy(false);}
  }
  async function handoff(){
    if(lock.current||!conversation)return;lock.current=true;setBusy(true);setError('');
    try{setConversation(await request<Conversation>(base,'/demo-support/conversations/'+conversation.id+'/handoff',{method:'POST',headers:{Authorization:'Bearer '+token},body:'{}'}));}
    catch(e){setError(e instanceof Error?e.message:'No se pudo solicitar ayuda.');}finally{lock.current=false;setBusy(false);}
  }
  function restart(){if(busy)return;setConversation(undefined);setToken('');pending.current=undefined;setQuestion('');setProductId(undefined);setMenuOpen(true);setTopic('');setError('');}
  const topics=[{id:'popular',icon:'✦',label:'Lo más consultado',detail:'Las dudas más comunes',articles:['horario','envios','devoluciones','humano']},{id:'products',icon:'◇',label:'Productos y precios',detail:'Catálogo y disponibilidad',articles:['productos','precios','existencias']},{id:'delivery',icon:'↗',label:'Entregas y horarios',detail:'Envíos, plazos y recogida',articles:['horario','envios','plazos','recoger']},{id:'payments',icon:'↶',label:'Pagos y devoluciones',detail:'Formas de pago y cambios',articles:['pagos','devoluciones','cambios','reembolso']}];
  const selectedTopic=topics.find(item=>item.id===topic);
  const remaining=conversation?.aiRemaining??info?.business.limits?.conversation??3;
  return <Container className={'demo-support-page'+(embedded?' demo-support-embedded':'')+(compact?' demo-support-compact':'')}>
    {!embedded&&<a href="/tienda" className="demo-back">← Volver al catálogo de Promaxima Demo</a>}
    <header><span className="demo-tag">PROTOTIPO EDUCATIVO · DATOS FICTICIOS</span><Heading>Atención al cliente</Heading><p>{info?.business.description??'Promaxima Demo'}</p></header>
    {loadError?<p role="alert">{loadError} Esta función solo está disponible en el entorno demo.</p>:!info?<p role="status">Cargando el manual ficticio…</p>:<>
      <details className="demo-disclosure"><summary><span className="demo-status-dot"/>{info.business.mode==='generative'?'Demo con IA · usa solo datos ficticios':'Demo · respuestas guiadas'}<span className="demo-disclosure-more">Más información</span></summary><div><p>{info.business.notice}</p>{info.business.mode==='generative'&&<p>Las preguntas escritas y el manual público se envían a {info.business.provider??'el proveedor de IA'}. No compartas datos personales. La IA puede equivocarse; revisa sus fuentes.</p>}<p>Hasta 20 preguntas por conversación. No se consultan pedidos personales ni se autorizan cancelaciones o reembolsos. Recargar o cerrar la página pierde el acceso local a esta sesión.</p></div></details>
      <nav className="demo-tabs" aria-label="Secciones de atención"><button aria-pressed={tab==='chat'} onClick={()=>setTab('chat')}>Conversación</button><button aria-pressed={tab==='manual'} onClick={()=>setTab('manual')}>Preguntas frecuentes</button></nav>
      {tab==='manual'?<div className="demo-manual-scroll"><p className="demo-manual-caption">Respuestas publicadas por la tienda. Consultarlas no consume IA.</p><Manual info={info}/></div>:<section className="demo-chat" aria-label="Chat de demostración">
        <div className="demo-chat-scroll" ref={scrollArea}>
          {!conversation?.messages.length&&<div className="demo-chat-intro"><span className="demo-welcome-icon" aria-hidden="true">✦</span><h2>Hola, ¿en qué te ayudo?</h2><p>Elige un tema o escribe tu pregunta.</p></div>}
          {menuOpen&&!conversation?.ticketId&&<div className="demo-help-menu" aria-label="Preguntas rápidas">
            {selectedTopic?<><div className="demo-menu-title"><button type="button" aria-label="Volver a todos los temas" onClick={()=>setTopic('')}>← Temas</button><strong>{selectedTopic.label}</strong></div><div className="demo-quick-questions">{info.articles.filter(a=>selectedTopic.articles.includes(a.id)).map(article=><button disabled={busy||!!pending.current} key={article.id} onClick={()=>void send(undefined,article)}><span>{article.title}</span><span aria-hidden="true">↗</span></button>)}</div></>:<div className="demo-topic-grid">{topics.map(item=><button key={item.id} disabled={busy||!!pending.current} onClick={()=>setTopic(item.id)}><span className="demo-topic-icon" aria-hidden="true">{item.icon}</span><strong>{item.label}</strong><small>{item.detail}</small></button>)}</div>}
            <p className="demo-menu-note">Respuestas rápidas, sin consumir IA.</p>
          </div>}
          <div className="demo-messages" role="log" aria-label="Conversación de prueba" aria-live="polite" aria-relevant="additions text">{conversation?.messages.map(message=>{const sources=message.sources?.length?message.sources:message.source?[message.source]:[];return <article key={message.requestId}>
            <div className="demo-question"><strong>Tú</strong><p>{message.question}</p></div>
            <div className="demo-answer"><strong><span className="demo-answer-mark" aria-hidden="true">✦</span> Promaxima <span className="demo-engine">{['openai','gemini'].includes(message.engine??'')?'IA':message.engine==='fallback'?'Respuesta de respaldo':'Respuesta guiada'}</span></strong><p>{message.answer}</p>{message.limitReason&&<p className="demo-inline-notice">{message.limitReason==='minute'?'La IA está ocupada por un momento.':'Se alcanzó un límite de IA.'} Puedes usar las preguntas rápidas o pedir ayuda al equipo.</p>}{sources.length>0?<details className="demo-sources"><summary>Ver fuentes ({sources.length})</summary>{sources.map(source=><small key={source.id}>{source.title}<br/>{source.name} · Versión {source.version}</small>)}</details>:<small>El equipo necesita revisar esta consulta.</small>}{message.needsHuman&&sources.length>0&&<p className="demo-review-note">El equipo debe confirmar esta información.</p>}</div>
          </article>;})}</div>
          {busy&&<p role="status" className="demo-thinking"><span aria-hidden="true">•••</span> Preparando respuesta…</p>}
          {conversation?.ticketId&&<div role="status" className="demo-ticket"><strong>✓ Solicitud registrada</strong><p>El equipo podrá revisar tu consulta en el ERP.</p><details><summary>Ver referencia</summary><p>{conversation.ticketId}</p></details><small>Esta demo no ofrece atención en tiempo real.</small></div>}
        </div>
        <div className="demo-chat-bottom">
          {error&&<div role="alert" className="demo-error"><p>{error}</p>{pending.current&&<button disabled={busy} onClick={()=>void send()}>Reintentar la misma pregunta</button>}</div>}
          {!conversation?.ticketId&&<>
            <div className="demo-composer-meta"><button className="demo-menu-toggle" type="button" aria-expanded={menuOpen} onClick={()=>{setMenuOpen(!menuOpen);setTopic('');scrollArea.current?.scrollTo({top:0});}} disabled={busy||!!pending.current}>☷ Preguntas rápidas</button>{info.business.mode==='generative'&&<span role="status" className={'demo-quota'+(remaining===0?' demo-quota-empty':'')} title="Las preguntas rápidas no descuentan consultas de IA">IA disponible: {remaining}</span>}</div>
            <form onSubmit={send} className="demo-composer"><label className="demo-sr-only" htmlFor="demo-question">Tu pregunta ficticia</label><textarea ref={questionInput} id="demo-question" value={question} onChange={e=>setQuestion(e.target.value)} minLength={3} maxLength={500} required disabled={busy||!!pending.current} rows={1} placeholder="Escribe tu pregunta…" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(!busy)void send();}}}/><button className="demo-primary demo-send" aria-label="Enviar pregunta" title="Enviar pregunta" disabled={busy||!!pending.current||question.trim().length<3}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 7-7 7 7M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button></form>
            <p className="demo-input-note">Solo datos ficticios · Máximo 500 caracteres</p>
          </>}
          <div className="demo-actions"><button disabled={busy||!conversation?.messages.length||!!conversation.ticketId||!!pending.current} onClick={()=>void handoff()}>Ayuda del equipo</button><button disabled={busy||(!conversation&&!question)} onClick={restart}>Nueva conversación</button></div>
        </div>
      </section>}
    </>}
  </Container>;
}

export function DemoSupportStaff({base,token,companyId,branchId}:{base:string;token:string;companyId:string;branchId:string}){
  const [info,setInfo]=useState<Info>(),[rows,setRows]=useState<Conversation[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{const controller=new AbortController();request<Info>(base,'/demo-support/info',{signal:controller.signal}).then(setInfo).catch(()=>undefined);return()=>controller.abort();},[base]);
  async function load(){setBusy(true);setError('');try{setRows(await request<Conversation[]>(base,'/demo-support/conversations',{headers:{Authorization:'Bearer '+token}}));}catch(e){setError(e instanceof Error?e.message:'No se pudo consultar.');}finally{setBusy(false);}}
  if(!info||companyId!=='company-promaxima-demo'||branchId!=='branch-promaxima-demo')return null;
  return <section className="panel demo-staff"><h2>Atención al cliente · Demo</h2><p>{info.business.mode==='generative'?'Promaxima Demo es una tienda ficticia. El asistente usa IA con el manual publicado y conserva las fuentes para revisión.':'Promaxima Demo es una tienda ficticia. Este prototipo usa un manual de respuestas guiadas, sin IA generativa.'}</p><a href="/tienda" target="_blank" rel="noreferrer">Abrir catálogo y atención al cliente ↗</a>
    <details><summary>Manual publicado · {info.articles.length} preguntas</summary><Manual info={info}/></details>
    <details><summary>Conversaciones y casos derivados</summary><p>Consulta hasta las 30 conversaciones más recientes disponibles. Los tickets se atienden en la mesa de ayuda de abajo; no se envían mensajes al visitante desde esta pantalla.</p><button disabled={busy} onClick={()=>void load()}>{busy?'Consultando…':'Consultar conversaciones'}</button>{error&&<p role="alert">{error}</p>}{rows.map(row=><details key={row.id}><summary>{row.messages[0]?.question??'Conversación sin preguntas'}{row.ticketId?' · Con ticket':''}</summary><p>Conversación: {row.id}</p>{row.ticketId&&<p>Ticket: {row.ticketId}</p>}{row.messages.map(message=><div key={message.requestId}><strong>{message.question}</strong><p>{message.answer}</p><small>{message.source?.title??'Sin fuente suficiente'}</small></div>)}</details>)}</details>
  </section>;
}
