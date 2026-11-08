import React,{useEffect,useRef,useState,type FormEvent} from 'react';
import {BotIcon,StoreChatWidget} from './StoreChatWidget';
import {loadPublicCatalog,type PublicCatalog,type PublicProduct} from './publicCatalogApi';
import './storefront.css';

const demoPrice = new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',currencyDisplay:'code'});

function WorkspaceScene(){return <svg viewBox="0 0 520 420" fill="none" role="img" aria-label="Ilustración de un espacio de trabajo con escritorio, lámpara y planta"><rect x="42" y="26" width="436" height="344" rx="200" fill="#dce5d9"/><path d="M64 337H463" stroke="#284c43" strokeWidth="2"/><rect x="113" y="260" width="314" height="15" rx="7" fill="#31554a"/><path d="M134 276L121 367M404 276L416 367" stroke="#31554a" strokeWidth="10" strokeLinecap="round"/><rect x="213" y="132" width="144" height="102" rx="10" fill="#fcfaf3" stroke="#31554a" strokeWidth="4"/><rect x="227" y="147" width="116" height="71" rx="3" fill="#a9c7b7"/><path d="M276 236V258M253 258H301" stroke="#31554a" strokeWidth="5" strokeLinecap="round"/><path d="M159 256V170L204 121" stroke="#31554a" strokeWidth="6" strokeLinecap="round"/><path d="M185 118C198 94 232 100 238 125L185 118Z" fill="#df855f"/><rect x="139" y="251" width="40" height="9" rx="4" fill="#31554a"/><rect x="370" y="226" width="34" height="34" rx="6" fill="#df855f"/><path d="M387 225V165M387 197C362 193 360 174 361 171C381 169 389 184 387 197ZM389 183C411 181 418 163 415 159C396 161 387 171 389 183Z" fill="#507b5f"/><path d="M222 342V311C222 293 289 293 289 311V342" fill="#d99b76" stroke="#31554a" strokeWidth="3"/><path d="M230 343L222 380M282 343L290 380" stroke="#31554a" strokeWidth="5" strokeLinecap="round"/><circle cx="425" cy="92" r="23" fill="#f2cd90"/><path d="M92 108H136M114 86V130" stroke="#789987" strokeWidth="2"/></svg>;}

const productScenes: Record<string, React.ReactNode> = {
  SIL: <><rect x="90" y="22" width="61" height="60" rx="17" fill="#9dbdad"/><path d="M78 82h84l-9 18H88z" fill="#d68f69"/><path d="M121 100v24m-35 5 35-5 35 5M78 81V64m84 17V64"/></>,
  ESC: <><rect x="51" y="62" width="138" height="15" rx="5" fill="#cb906b"/><path d="m67 77-7 52m113-52 7 52"/><rect x="118" y="27" width="45" height="28" rx="4" fill="#a6c3b3"/><path d="M140 55v7m-48 0V45l-15-8"/></>,
  REP: <><rect x="51" y="58" width="138" height="13" rx="3" fill="#d9a07a"/><rect x="62" y="71" width="13" height="45" fill="#b97e5b"/><rect x="166" y="71" width="13" height="45" fill="#b97e5b"/><rect x="82" y="36" width="68" height="22" rx="3" fill="#a6c3b3"/></>,
  LIB: <><rect x="75" y="23" width="82" height="105" rx="8" fill="#d69773"/><path d="M90 24v102m15-75h36m-36 14h36m-36 14h26"/><path d="m167 105 17-65" stroke="#648472" strokeWidth="7"/></>,
  SET: <><rect x="61" y="42" width="120" height="68" rx="13" fill="#e5c295"/><path d="m83 84 74-20m-69 30 74-20" stroke="#648472" strokeWidth="7"/><path d="m86 73 74-20" stroke="#c37a56" strokeWidth="7"/></>,
  PLA: <><rect x="67" y="30" width="107" height="95" rx="8" fill="#faf5e8"/><path d="M67 57h107M91 22v19m59-19v19M85 74h72M85 92h72m-55-18v34m19-34v34m18-34v34"/><path d="m91 98 4 4 7-8" stroke="#ba7051"/></>,
  ORG: <><path d="M54 70h132v50H54z" fill="#cc9270"/><path d="M54 70l16-19h102l14 19m-87 0v50m44-50v50"/><path d="M75 62V33m13 30V25m68 39V38" stroke="#648472" strokeWidth="6"/></>,
  CAJ: <><path d="M63 62h114l-7 62H70z" fill="#a5bbaa"/><rect x="58" y="49" width="124" height="16" rx="6" fill="#d6a483"/><rect x="102" y="80" width="36" height="15" rx="5" fill="#faf5e8"/></>,
  ARC: <><path d="M57 97h126v26H57zm10-36h106v35H67z" fill="#dca180"/><path d="M69 61l12-20h78l14 20m-70 13h34m-34 37h34"/><path d="M87 41V30h66v11" fill="#f6e9ce"/></>,
  LAM: <><path d="M85 122h72m-36-1V61l26-27"/><path d="M131 42c8-23 32-26 45-5l8 19z" fill="#d8936a"/><path d="m155 64-4 12m18-9 1 12" stroke="#bd8149"/></>,
  REL: <><circle cx="120" cy="75" r="49" fill="#d79b78"/><circle cx="120" cy="75" r="40" fill="#faf4e5"/><path d="M120 45v30l21 11m-21-49v4m38 34h-4m-34 38v-4m-38-34h4"/></>,
  MAC: <><path d="M92 88h57l-10 38h-36z" fill="#d59470"/><path d="M120 89V48m0 19c-23-1-32-15-28-30 19 2 28 10 28 30zm0 6c22-1 34-13 32-28-20 0-30 11-32 28z" fill="#8eaf94"/></>,
};

function ProductArt({product,base}:{product:PublicProduct;base:string}){
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>setLoaded(false),[product.id,product.imageVersion]);
  const code = /^ALB-([A-Z]{3})-\d+$/.exec(product.sku)?.[1] ?? '';
  const tone = /papelería/i.test(product.category) ? 1 : /organizaci/i.test(product.category) ? 2 : /iluminaci/i.test(product.category) ? 3 : 0;
  return <div className={`store-product-art art-${tone}`}>
    <span>{product.category}</span>
    {product.imageVersion&&<img className={'store-product-photo'+(loaded?' is-loaded':'')} src={base+'/demo-support/catalog/'+product.id+'/image?v='+encodeURIComponent(product.imageVersion)} alt={product.name} loading="lazy" decoding="async" onLoad={()=>setLoaded(true)} onError={()=>setLoaded(false)}/>}
    <svg className="store-category-icon" style={loaded?{visibility:'hidden'}:undefined} viewBox="0 0 240 150" aria-hidden="true">
      <ellipse cx="120" cy="75" rx="92" ry="63" fill="#fffdf1" opacity=".64"/>
      <g fill="none" stroke="#31554a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {productScenes[code] ?? <><path d="M76 56h88v65H76z" fill="#a9c7b7"/><path d="M76 56l13-17h62l13 17m-55 24h22"/></>}
      </g>
    </svg>
    {!loaded&&<small>Ilustración</small>}
  </div>;
}

export function DemoStorefront({base}:{base:string}){
  const [page,setPage]=useState<PublicCatalog>(),[search,setSearch]=useState(''),[applied,setApplied]=useState(''),[cursors,setCursors]=useState(['']),[revision,setRevision]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [question,setQuestion]=useState<{text:string;request:number;productId?:string}>(),[showChat,setShowChat]=useState(false);
  const catalogTitle=useRef<HTMLHeadingElement>(null);
  const cursor=cursors[cursors.length-1];
  useEffect(()=>{const previous=document.title;document.title='Albor Oficina y Hogar · Oficina, hogar y atención';return()=>{document.title=previous;};},[]);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');setPage(undefined);loadPublicCatalog(base,applied,cursor,controller.signal).then(data=>{if(!controller.signal.aborted)setPage(data);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[base,applied,cursor,revision]);
  function find(event:FormEvent){event.preventDefault();setApplied(search.trim());setCursors(['']);setRevision(value=>value+1);}
  function turnPage(direction:'previous'|'next'){
    if(loading)return;
    if(direction==='previous'&&cursors.length>1)setCursors(values=>values.slice(0,-1));
    else if(direction==='next'&&page?.nextCursor){const next=page.nextCursor;setCursors(values=>[...values,next]);}
    else return;
    catalogTitle.current?.focus();
  }
  function ask(product?:PublicProduct){setShowChat(true);if(product)setQuestion({text:`¿Cuál es el precio de ${product.name} (referencia ${product.sku})?`,productId:product.id,request:Date.now()});}
  return <div className="storefront">
    <a className="store-skip" href="#catalogo">Ir al catálogo</a>
    <div className="store-demo-notice">Sitio de demostración de Albor</div>
    <header className="store-header store-container"><a href="/tienda" className="store-brand" aria-label="Albor Oficina y Hogar, inicio"><span aria-hidden="true">a<span>·</span></span><div>albor<small>OFICINA + HOGAR</small></div></a><nav aria-label="Navegación de la tienda"><a href="#catalogo">Catálogo</a><a href="#negocio">La tienda</a><button className="store-contact" onClick={()=>ask()}>Hablemos <span aria-hidden="true">↗</span></button></nav></header>
    <main>
      <section className="store-hero store-container" aria-labelledby="store-title"><div className="store-hero-copy"><p className="store-eyebrow"><span/> UN ESPACIO PARA TUS IDEAS</p><h1 id="store-title">Equipa tu oficina.<br/><em>Haz tuyo tu espacio.</em></h1><p>Encuentra muebles, papelería, organizadores y accesorios para tus espacios de trabajo y descanso.</p><div className="store-hero-actions"><a className="store-primary" href="#catalogo">Explorar catálogo <span aria-hidden="true">↗</span></a><button onClick={()=>ask()}>Tengo una pregunta <span aria-hidden="true">→</span></button></div></div><div className="store-hero-art"><WorkspaceScene/><div className="store-art-note"><span aria-hidden="true">✦</span><div>Pequeños detalles.<br/><strong>Grandes ideas.</strong></div></div></div></section>
      <div className="store-benefits"><div className="store-container"><span><b aria-hidden="true">01</b> Muebles y accesorios</span><span><b aria-hidden="true">02</b> Consulta por producto</span><span><b aria-hidden="true">03</b> Asistente de catálogo</span></div></div>
      <section id="catalogo" className="store-catalog store-container" aria-labelledby="catalog-title" aria-busy={loading}><div className="store-section-heading"><div><p className="store-eyebrow">OFICINA Y HOGAR</p><h2 id="catalog-title" ref={catalogTitle} tabIndex={-1}>Catálogo</h2></div><p>Busca por nombre o referencia para encontrar un artículo.</p></div>
        <form className="store-search" onSubmit={find}><div><label htmlFor="store-search">¿Qué estás buscando?</label><input id="store-search" type="search" maxLength={80} value={search} onChange={event=>setSearch(event.target.value)} placeholder="Nombre o referencia del producto"/></div><button className="store-primary" disabled={loading}>Buscar <span aria-hidden="true">↗</span></button>{applied&&<button type="button" disabled={loading} onClick={()=>{setSearch('');setApplied('');setCursors(['']);setRevision(value=>value+1);}}>Ver todos</button>}</form>
        <div className="store-catalog-feedback" role="status">{loading?'Consultando el catálogo…':page?`${page.items.length} ${page.items.length===1?'producto':'productos'} en esta página${applied?' · Búsqueda: '+applied:''}`:''}</div>
        {error?<div className="store-empty" role="alert"><h3>No pudimos abrir el catálogo</h3><p>{error}</p><button onClick={()=>setRevision(value=>value+1)}>Volver a intentar</button></div>:loading?<div className="store-loading" aria-hidden="true"><span/><span/><span/></div>:!page?.items.length?<div className="store-empty"><h3>{applied?'Todavía no encontramos eso.':'Estamos preparando el catálogo.'}</h3><p>{applied?'Prueba otro nombre o referencia. También puedes preguntarnos.':'Por ahora no hay productos publicados. Puedes abrir el asistente para consultar sobre el catálogo.'}</p><button onClick={()=>ask()}>Hacer una pregunta →</button></div>:<div className="store-product-grid">{page.items.map(product=><article key={product.id} className="store-product"><ProductArt product={product} base={base}/><div className="store-product-copy"><p className="store-product-sku">REF. {product.sku}</p><h3>{product.name}</h3><p className="store-product-price">{demoPrice.format(product.price)}<small>Importe de referencia</small></p><button onClick={()=>ask(product)} aria-label={'Consultar sobre '+product.name}>Consultar producto <span aria-hidden="true">↗</span></button></div></article>)}</div>}
        <div className="store-pagination"><span>Página {cursors.length}</span><div><button disabled={loading||cursors.length===1} onClick={()=>turnPage('previous')}>← Anterior</button><button disabled={loading||!page?.nextCursor} onClick={()=>turnPage('next')}>Siguiente →</button></div></div><p className="store-catalog-note">Catálogo informativo. Las consultas no reservan existencias ni generan pedidos.</p>
      </section>
      <section id="negocio" className="store-about store-container"><div><p className="store-eyebrow">SOBRE ALBOR</p><h2>Todo para organizar<br/>tu espacio.</h2><p>Albor reúne artículos para organizar el escritorio, amueblar la oficina y darle un toque personal al hogar. Consulta el catálogo y abre el asistente si quieres saber más sobre un producto.</p></div><div className="store-hours"><span aria-hidden="true">◷</span><h3>Horario de referencia</h3><p>Lunes a viernes · 9:00 a 18:00<br/>Sábado · 9:00 a 14:00</p><small>Horario de ejemplo · Ciudad de México</small></div></section>
      <section id="atencion" className="store-attention store-container" aria-labelledby="attention-title"><div className="store-section-heading"><div><p className="store-eyebrow">TE ESCUCHAMOS</p><h2 id="attention-title">¿En qué te ayudamos?</h2></div><p>Consulta el catálogo y las condiciones de ejemplo sin crear una cuenta.</p></div><div className="store-assistant-card"><div><span className="store-assistant-icon" aria-hidden="true">✳</span><h3>Asistente de Albor</h3><p>Pregunta por un producto o explora las respuestas sobre entregas y devoluciones. Desde la conversación puedes registrar una solicitud en el ERP de demostración.</p><small>Asistente automatizado</small></div><button className="store-primary" aria-expanded={showChat} aria-controls="store-chat" onClick={()=>setShowChat(value=>!value)}>{showChat?'Minimizar conversación':'Abrir conversación'} <span aria-hidden="true">{showChat?'−':'↗'}</span></button></div></section>
      <section className="store-faq store-container" aria-labelledby="store-faq-title">
        <div className="store-section-heading">
          <div><p className="store-eyebrow">ANTES DE CONSULTAR</p><h2 id="store-faq-title">Preguntas frecuentes</h2></div>
          <p>Información para navegar y consultar el catálogo de Albor.</p>
        </div>
        <details><summary>¿Cómo encuentro un producto?</summary><p>Escribe su nombre o la referencia que aparece en la ficha. Usa «Consultar producto» para abrir el asistente con el artículo seleccionado.</p></details>
        <details><summary>¿Puedo hacer un pedido desde el catálogo?</summary><p>El catálogo permite explorar artículos y consultar información. La compra, el pago y la reserva de existencias no están habilitados.</p></details>
        <details><summary>¿Necesito una cuenta para usar el asistente?</summary><p>Puedes consultar sin iniciar sesión. Evita incluir datos personales, contraseñas o información de pago en tus mensajes.</p></details>
      </section>
    </main>
    <footer className="store-footer"><div className="store-container"><div><strong>albor<span>·</span></strong><p>Un espacio para trabajar. Un lugar para crear.</p></div><div><span>Albor Oficina y Hogar · Sitio de demostración</span><nav aria-label="Enlaces al pie"><a href="#catalogo">Catálogo</a><a href="#atencion">Atención</a><a href="/">Acceso del personal ↗</a></nav></div></div></footer>
    <StoreChatWidget base={base} open={showChat} onClose={()=>setShowChat(false)} question={question}/><button className="store-chat-launcher" onClick={()=>setShowChat(value=>!value)} aria-label={showChat?"Minimizar asistente de atención":"Abrir asistente de atención"} aria-expanded={showChat} aria-controls="store-chat"><BotIcon/><span>{showChat?"Minimizar chat":"¿Te ayudamos?"}</span></button>
  </div>;
}
