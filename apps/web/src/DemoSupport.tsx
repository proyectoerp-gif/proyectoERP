import React, {useEffect,useRef,useState,type FormEvent} from 'react';
import './demoSupport.css';

type Article={id:string;title:string;content:string;version:string;source:string};
type Info={business:{name:string;description:string;notice:string;mode:string};articles:Article[]};
type Message={requestId:string;question:string;answer:string;source:null|{id:string;title:string;version:string;name:string};needsHuman:boolean};
type Conversation={id:string;messages:Message[];ticketId:string|null;expiresAt:string};
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
  const pending=useRef<{requestId:string;question:string;productId?:string}>(),lock=useRef(false),lastMessage=useRef<HTMLDivElement>(null);
  const questionInput=useRef<HTMLTextAreaElement>(null),Container=embedded?'section':'main',Heading=embedded?'h2':'h1';
  useEffect(()=>{
    if(!suggestedQuestion)return;
    setTab('chat');
    if(lock.current||pending.current||conversation?.ticketId){setError('Termina la consulta pendiente o inicia una nueva conversación para preguntar por otro producto.');return;}
    setError('');setQuestion(suggestedQuestion.text);setProductId(suggestedQuestion.productId);
  },[suggestedQuestion]);
  useEffect(()=>{if(suggestedQuestion&&tab==='chat'&&questionInput.current?.getClientRects().length){questionInput.current.focus({preventScroll:true});questionInput.current.scrollIntoView({block:'nearest'});}},[suggestedQuestion,tab]);
  useEffect(()=>{const controller=new AbortController();request<Info>(base,'/demo-support/info',{signal:controller.signal}).then(setInfo).catch(e=>{if(!controller.signal.aborted)setLoadError(e.message);});return()=>controller.abort();},[base]);
  useEffect(()=>{lastMessage.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[conversation?.messages.length]);
  async function send(event?:FormEvent){
    event?.preventDefault();if(lock.current||(!pending.current&&question.trim().length<3))return;
    lock.current=true;setBusy(true);setError('');
    const payload=pending.current??{requestId:crypto.randomUUID(),question:question.trim(),...(productId?{productId}:{})};pending.current=payload;
    try{
      let current=conversation,currentToken=token;
      if(!current){const created=await request<Conversation&{token:string}>(base,'/demo-support/conversations',{method:'POST',body:'{}'});current=created;currentToken=created.token;setConversation(created);setToken(created.token);}
      const updated=await request<Conversation>(base,'/demo-support/conversations/'+current.id+'/messages',{method:'POST',headers:{Authorization:'Bearer '+currentToken},body:JSON.stringify(payload)});
      setConversation(updated);pending.current=undefined;setQuestion('');
    }catch(e){setError(e instanceof Error?e.message:'No se pudo enviar.');}finally{lock.current=false;setBusy(false);}
  }
  async function handoff(){
    if(lock.current||!conversation)return;lock.current=true;setBusy(true);setError('');
    try{setConversation(await request<Conversation>(base,'/demo-support/conversations/'+conversation.id+'/handoff',{method:'POST',headers:{Authorization:'Bearer '+token},body:'{}'}));}
    catch(e){setError(e instanceof Error?e.message:'No se pudo solicitar ayuda.');}finally{lock.current=false;setBusy(false);}
  }
  function restart(){if(busy)return;setConversation(undefined);setToken('');pending.current=undefined;setQuestion('');setProductId(undefined);setError('');}
  return <Container className={'demo-support-page'+(embedded?' demo-support-embedded':'')+(compact?' demo-support-compact':'')}>
    {!embedded&&<a href="/tienda" className="demo-back">← Volver al catálogo de Promaxima Demo</a>}
    <header><span className="demo-tag">PROTOTIPO EDUCATIVO · DATOS FICTICIOS</span><Heading>Atención al cliente</Heading><p>{info?.business.description??'Promaxima Demo'}</p></header>
    {loadError?<p role="alert">{loadError} Esta función solo está disponible en el entorno demo.</p>:!info?<p role="status">Cargando el manual ficticio…</p>:<>
      {compact?<details className="demo-disclosure"><summary>Demo: respuestas guiadas, sin IA generativa</summary><p>{info.business.notice}</p><p>Recargar o cerrar la página pierde el acceso local a la conversación.</p></details>:<aside className="demo-disclosure"><strong>Respuestas guiadas, sin IA generativa</strong><p>{info.business.notice}</p><p>La sesión del visitante se pierde al cerrar o recargar esta página. El personal conserva el registro durante su periodo de disponibilidad.</p></aside>}
      <nav className="demo-tabs" aria-label="Secciones de atención"><button aria-pressed={tab==='chat'} onClick={()=>setTab('chat')}>Hacer una pregunta</button><button aria-pressed={tab==='manual'} onClick={()=>setTab('manual')}>{compact?'Preguntas frecuentes':'Manual y 20 preguntas'}</button></nav>
      {tab==='manual'?<Manual info={info}/>:<section className="demo-chat" aria-label="Chat de demostración">
        <div className="demo-chat-intro"><h2>¿En qué podemos ayudarte?</h2><p>Consulta el horario, las entregas o una política de ejemplo. Si falta información, puedes crear un caso para el equipo.</p><div className="demo-suggestions">{info.articles.filter(a=>['horario','devoluciones','envios'].includes(a.id)).map(article=><button disabled={busy||!!pending.current||!!conversation?.ticketId} key={article.id} onClick={()=>setQuestion(article.title)}>{article.title}</button>)}</div></div>
        <div className="demo-messages" role="log" aria-label="Conversación de prueba" aria-live="polite" aria-relevant="additions text">{conversation?.messages.map(message=><article key={message.requestId}>
          <div className="demo-question"><strong>Tú</strong><p>{message.question}</p></div>
          <div className="demo-answer"><strong>Asistente de demostración</strong><p>{message.answer}</p>{message.source?<small>Fuente: {message.source.name} · {message.source.title} · Versión {message.source.version}</small>:<small>Sin fuente suficiente: requiere atención humana.</small>}</div>
        </article>)}<div ref={lastMessage}/></div>
        {conversation?.ticketId?<div role="status" className="demo-ticket"><strong>Solicitud registrada</strong><p>Referencia: {conversation.ticketId}</p><p>El equipo puede revisarla en el ERP. Esta demo no garantiza atención en tiempo real.</p></div>:<form onSubmit={send}><label htmlFor="demo-question">Tu pregunta ficticia</label><textarea ref={questionInput} id="demo-question" value={question} onChange={e=>setQuestion(e.target.value)} minLength={3} maxLength={500} required disabled={busy||!!pending.current} placeholder="Por ejemplo: ¿Cuál es su horario?"/><p className="demo-hint">Máximo 500 caracteres. No incluyas información personal.</p>{!pending.current&&<button className="demo-primary" disabled={busy||question.trim().length<3}>{busy?'Consultando…':'Enviar pregunta'}</button>}</form>}
        {error&&<div role="alert" className="demo-error"><p>{error}</p>{pending.current&&<button disabled={busy} onClick={()=>void send()}>Reintentar la misma pregunta</button>}</div>}
        <div className="demo-actions"><button disabled={busy||!conversation?.messages.length||!!conversation.ticketId||!!pending.current} onClick={()=>void handoff()}>Solicitar ayuda humana</button><button disabled={busy} onClick={restart}>Nueva conversación</button></div>
        <p className="demo-hint">Hasta 20 preguntas por conversación. No se consultan pedidos personales ni se autorizan cancelaciones o reembolsos.</p>
      </section>}
    </>}
  </Container>;
}

export function DemoSupportStaff({base,token,companyId,branchId}:{base:string;token:string;companyId:string;branchId:string}){
  const [info,setInfo]=useState<Info>(),[rows,setRows]=useState<Conversation[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{const controller=new AbortController();request<Info>(base,'/demo-support/info',{signal:controller.signal}).then(setInfo).catch(()=>undefined);return()=>controller.abort();},[base]);
  async function load(){setBusy(true);setError('');try{setRows(await request<Conversation[]>(base,'/demo-support/conversations',{headers:{Authorization:'Bearer '+token}}));}catch(e){setError(e instanceof Error?e.message:'No se pudo consultar.');}finally{setBusy(false);}}
  if(!info||companyId!=='company-promaxima-demo'||branchId!=='branch-promaxima-demo')return null;
  return <section className="panel demo-staff"><h2>Atención al cliente · Demo</h2><p>Promaxima Demo es una tienda ficticia. Este prototipo usa un manual de respuestas guiadas, sin IA generativa.</p><a href="/tienda" target="_blank" rel="noreferrer">Abrir catálogo y atención al cliente ↗</a>
    <details><summary>Manual publicado · {info.articles.length} preguntas</summary><Manual info={info}/></details>
    <details><summary>Conversaciones y casos derivados</summary><p>Consulta hasta las 30 conversaciones más recientes disponibles. Los tickets se atienden en la mesa de ayuda de abajo; no se envían mensajes al visitante desde esta pantalla.</p><button disabled={busy} onClick={()=>void load()}>{busy?'Consultando…':'Consultar conversaciones'}</button>{error&&<p role="alert">{error}</p>}{rows.map(row=><details key={row.id}><summary>{row.messages[0]?.question??'Conversación sin preguntas'}{row.ticketId?' · Con ticket':''}</summary><p>Conversación: {row.id}</p>{row.ticketId&&<p>Ticket: {row.ticketId}</p>}{row.messages.map(message=><div key={message.requestId}><strong>{message.question}</strong><p>{message.answer}</p><small>{message.source?.title??'Sin fuente suficiente'}</small></div>)}</details>)}</details>
  </section>;
}
