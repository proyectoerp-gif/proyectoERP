import React,{useEffect,useRef,useState,type FormEvent} from 'react';
import {BotIcon,StoreChatWidget} from './StoreChatWidget';
import {loadPublicCatalog,type PublicCatalog,type PublicProduct,type PublicCategory,type PublicCatalogFilters} from './publicCatalogApi';
import './storefront.css';

const demoPrice = new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',currencyDisplay:'code'});

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

function ProductQuickView({product,base,onClose,onAsk}:{product:PublicProduct;base:string;onClose:()=>void;onAsk:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const opener=document.activeElement;
    dialog.current?.showModal();
    return()=>{
      dialog.current?.close();
      if(opener instanceof HTMLElement&&opener.isConnected)opener.focus({preventScroll:true});
    };
  },[]);
  return <dialog ref={dialog} className="store-product-dialog" aria-labelledby="product-detail-title" onClose={event=>{if(!event.currentTarget.open)onClose();}}>
    <button type="button" className="store-detail-close" aria-label="Cerrar detalle del producto" onClick={onClose}>×</button>
    <div className="store-detail-layout">
      <ProductArt product={product} base={base}/>
      <div className="store-detail-copy">
        <p className="store-eyebrow">{product.category}</p>
        <h2 id="product-detail-title">{product.name}</h2>
        <p className="store-detail-price">{demoPrice.format(product.price)}</p>
        <p className="store-detail-ref">Referencia {product.sku}</p>
        <p>Consulta este artículo con el asistente de Albor. Podrás preguntar por su precio y revisar las condiciones de ejemplo.</p>
        <button type="button" className="store-primary" onClick={onAsk}>Consultar este producto <span aria-hidden="true">↗</span></button>
        <details><summary>Disponibilidad y condiciones</summary><p>El precio corresponde al catálogo de demostración. La consulta no reserva existencias ni genera una compra. La disponibilidad requiere confirmación del equipo.</p></details>
      </div>
    </div>
  </dialog>;
}

function CollectionArt({name}:{name:string}){
  const code=/papeler/i.test(name)?'LIB':/organizaci/i.test(name)?'ORG':/iluminaci|hogar/i.test(name)?'LAM':'SIL';
  return <svg viewBox="0 0 240 150" aria-hidden="true"><g fill="none" stroke="#343b35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{productScenes[code]}</g></svg>;
}

export function DemoStorefront({base}:{base:string}){
  const [page,setPage]=useState<PublicCatalog>();
  const [categories,setCategories]=useState<PublicCategory[]>([]);
  const [search,setSearch]=useState(''),[applied,setApplied]=useState('');
  const [filters,setFilters]=useState<PublicCatalogFilters>({});
  const [category,setCategory]=useState(''),[minPrice,setMinPrice]=useState(''),[maxPrice,setMaxPrice]=useState('');
  const [filterError,setFilterError]=useState('');
  const [cursors,setCursors]=useState(['']),[revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(true),[error,setError]=useState('');
  const [selectedProduct,setSelectedProduct]=useState<PublicProduct|null>(null);
  const [question,setQuestion]=useState<{text:string;request:number;productId?:string}>(),[showChat,setShowChat]=useState(false);
  const catalogTitle=useRef<HTMLHeadingElement>(null);
  const cursor=cursors[cursors.length-1];
  const activeFilters=Boolean(applied||filters.category||filters.minPrice||filters.maxPrice);

  useEffect(()=>{
    const previous=document.title;
    document.title='Albor · Objetos para habitar tu día';
    return()=>{document.title=previous;};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError('');setPage(undefined);
    loadPublicCatalog(base,applied,cursor,controller.signal,filters).then(data=>{
      if(controller.signal.aborted)return;
      setPage(data);
      if(data.categories)setCategories(data.categories);
    }).catch(cause=>{
      if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'No pudimos cargar el catálogo.');
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[base,applied,cursor,revision,filters]);

  function find(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setFilterError('');
    if(minPrice&&maxPrice&&Number(minPrice)>Number(maxPrice)){
      setFilterError('El precio mínimo debe ser menor o igual al máximo.');
      return;
    }
    setApplied(search.trim());
    setFilters({category,minPrice,maxPrice});
    setCursors(['']);setRevision(value=>value+1);
    event.currentTarget.querySelector('details')?.removeAttribute('open');
  }
  function resetFilters(){
    setSearch('');setApplied('');setCategory('');setMinPrice('');setMaxPrice('');
    setFilters({});setFilterError('');setCursors(['']);setRevision(value=>value+1);
  }
  function chooseCollection(id:string){
    setCategory(id);setFilters({category:id});
    setSearch('');setApplied('');setMinPrice('');setMaxPrice('');setFilterError('');
    setCursors(['']);setRevision(value=>value+1);
    catalogTitle.current?.focus();
  }
  function turnPage(direction:'previous'|'next'){
    if(loading)return;
    if(direction==='previous'&&cursors.length>1)setCursors(values=>values.slice(0,-1));
    else if(direction==='next'&&page?.nextCursor){
      const next=page.nextCursor;setCursors(values=>[...values,next]);
    }else return;
    catalogTitle.current?.focus();
  }
  function ask(product?:PublicProduct){
    setSelectedProduct(null);
    setShowChat(true);
    setQuestion(product?{
      text:`¿Cuál es el precio de ${product.name} (referencia ${product.sku})?`,
      productId:product.id,request:Date.now(),
    }:undefined);
  }
  return <div className="storefront">
    <a className="store-skip" href="#catalogo">Ir al catálogo</a>
    <div className="store-demo-notice">Albor Oficina y Hogar <span>·</span> Colección de demostración</div>
    <header className="store-header store-container">
      <a href="/tienda" className="store-brand" aria-label="Albor, inicio">albor<span>OFICINA & HOGAR</span></a>
      <nav aria-label="Navegación de la tienda">
        <a href="#colecciones">Colecciones</a><a href="#catalogo">Catálogo</a><a href="#negocio">Nuestra esencia</a>
      </nav>
      <button type="button" className="store-contact" onClick={()=>ask()}>Hablemos <span aria-hidden="true">↗</span></button>
    </header>
    <main>
      <section className="store-hero" aria-labelledby="store-title">
        <div className="store-hero-copy">
          <p className="store-eyebrow">EL ARTE DE LO COTIDIANO</p>
          <h1 id="store-title">Tu espacio.<br/>Tu manera<br/><em>de habitarlo.</em></h1>
          <p>Objetos que encuentran su lugar en tu día. Para trabajar, crear y hacer una pausa.</p>
          <a className="store-primary" href="#catalogo">Descubre el catálogo <span aria-hidden="true">↗</span></a>
          <span className="store-hero-edition">01 / ESPACIOS CON INTENCIÓN</span>
        </div>
        <div className="store-hero-photo">
          <img src="/store/workspace-editorial.webp" width="1600" height="1050" alt="Escritorio blanco con lámpara y objetos decorativos en un espacio sereno"/>
          <span>Una mirada a lo esencial.</span>
        </div>
      </section>
      <div className="store-manifesto store-container">
        <p>Menos ruido.<br/><em>Más espacio para ti.</em></p>
        <span>Mobiliario, papelería y pequeños detalles que acompañan la vida en casa y en la oficina.</span>
        <a href="#colecciones">Explora las colecciones <span aria-hidden="true">↓</span></a>
      </div>
      <section id="colecciones" className="store-collections store-container" aria-labelledby="collections-title">
        <div className="store-section-heading"><div><p className="store-eyebrow">CADA OBJETO, UN PROPÓSITO</p><h2 id="collections-title">Encuentra tu lugar.</h2></div><a href="#catalogo">Ver todo <span aria-hidden="true">↗</span></a></div>
        <div className="store-collection-grid">
          {categories.slice(0,4).map((item,index)=><button type="button" key={item.id} className={'store-collection collection-'+index} onClick={()=>chooseCollection(item.id)}>
            <div><CollectionArt name={item.name}/></div><span><span>{item.name}</span><span aria-hidden="true">↗</span></span>
          </button>)}
          {!categories.length&&<a className="store-collection-placeholder" href="#catalogo">Explorar todos los artículos <span aria-hidden="true">↗</span></a>}
        </div>
      </section>
      <section id="catalogo" className="store-catalog store-container" aria-labelledby="catalog-title" aria-busy={loading}>
        <div className="store-section-heading">
          <div><p className="store-eyebrow">LA SELECCIÓN ALBOR</p><h2 id="catalog-title" ref={catalogTitle} tabIndex={-1}>Objetos para tu día.</h2></div>
          <p>Explora, encuentra y consulta.<br/>Precios en pesos mexicanos.</p>
        </div>
        <form className="store-catalog-toolbar" onSubmit={find}>
          <div className="store-search-field"><label htmlFor="store-search">Buscar en el catálogo</label><div><input id="store-search" type="search" maxLength={80} value={search} onChange={event=>setSearch(event.target.value)} placeholder="¿Qué estás buscando?"/><button type="submit" disabled={loading} aria-label="Buscar productos">↗</button></div></div>
          <details className="store-filter-panel">
            <summary>Filtrar <span aria-hidden="true">+</span></summary>
            <div className="store-filter-content">
              <label htmlFor="store-category">Categoría</label><select id="store-category" value={category} onChange={event=>setCategory(event.target.value)}><option value="">Todas las categorías</option>{categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <fieldset><legend>Precio en MXN</legend><div><label>Mínimo<input type="number" min="0" max="1000000000" step="0.01" placeholder="Desde" value={minPrice} onChange={event=>setMinPrice(event.target.value)}/></label><label>Máximo<input type="number" min="0" max="1000000000" step="0.01" placeholder="Hasta" value={maxPrice} onChange={event=>setMaxPrice(event.target.value)}/></label></div></fieldset>
              <button className="store-primary" disabled={loading}>Aplicar filtros</button>
              {filterError&&<p role="alert">{filterError}</p>}
            </div>
          </details>
          {activeFilters&&<button type="button" className="store-clear-filters" disabled={loading} onClick={resetFilters}>Limpiar filtros ×</button>}
        </form>
        <div className="store-catalog-feedback" role="status">
          {loading?'Consultando el catálogo…':page?`${page.items.length} ${page.items.length===1?'artículo':'artículos'} en esta página${applied?' · '+applied:''}${filters.category?' · '+(categories.find(item=>item.id===filters.category)?.name??'Categoría seleccionada'):''}`:''}
        </div>
        {error?<div className="store-empty" role="alert"><h3>No pudimos abrir el catálogo</h3><p>{error}</p><button onClick={()=>setRevision(value=>value+1)}>Volver a intentar</button></div>
          :loading?<div className="store-loading" aria-hidden="true"><span/><span/><span/><span/></div>
          :!page?.items.length?<div className="store-empty"><h3>No encontramos artículos para esta selección.</h3><p>Prueba otro nombre, categoría o rango de precio.</p>{activeFilters&&<button onClick={resetFilters}>Ver todos los artículos</button>}<button onClick={()=>ask()}>Consultar al asistente</button></div>
          :<div className="store-product-grid">{page.items.map(product=><article key={product.id} className="store-product">
            <button type="button" className="store-product-open" aria-label={'Ver detalles de '+product.name} onClick={()=>setSelectedProduct(product)}><ProductArt product={product} base={base}/><span>Ver detalle <span aria-hidden="true">+</span></span></button>
            <div className="store-product-copy"><p className="store-product-category">{product.category}</p><h3><button type="button" onClick={()=>setSelectedProduct(product)}>{product.name}</button></h3><p className="store-product-price">{demoPrice.format(product.price)}</p><button type="button" className="store-product-consult" onClick={()=>ask(product)} aria-label={'Consultar sobre '+product.name}>Consultar <span aria-hidden="true">↗</span></button></div>
          </article>)}</div>}
        <div className="store-pagination"><span>Página {cursors.length}</span><div><button disabled={loading||cursors.length===1} onClick={()=>turnPage('previous')}>← Anterior</button><button disabled={loading||!page?.nextCursor} onClick={()=>turnPage('next')}>Siguiente →</button></div></div>
        <p className="store-catalog-note">Catálogo de demostración. Las consultas no reservan existencias ni generan pedidos.</p>
      </section>
      <section id="negocio" className="store-about store-container">
        <div className="store-about-image"><img src="/store/workspace-editorial.webp" alt="Detalle de una lámpara y un escritorio de líneas sencillas" width="1600" height="1050" loading="lazy"/><small>Imagen de ambiente</small></div>
        <div className="store-about-copy"><p className="store-eyebrow">NUESTRA ESENCIA</p><h2>Lo que eliges<br/>también habla<br/><em>de ti.</em></h2><p>Creemos en los espacios que se sienten propios. En un escritorio que invita a empezar, una libreta para la próxima idea y ese pequeño detalle que cambia el día.</p><p>Albor es una tienda ficticia de oficina y hogar. Una colección para imaginar cómo quieres vivir y trabajar.</p><button type="button" onClick={()=>ask()}>Conversa con Albor <span aria-hidden="true">↗</span></button></div>
      </section>
      <section id="atencion" className="store-attention store-container" aria-labelledby="attention-title">
        <div><p className="store-eyebrow">CERCA DE TUS IDEAS</p><h2 id="attention-title">Hablemos de<br/><em>lo que necesitas.</em></h2><p>Consulta un producto, explora las condiciones de ejemplo o registra una solicitud para el equipo.</p></div>
        <div className="store-attention-actions"><button type="button" className="store-primary" onClick={()=>ask()} aria-controls="store-chat" aria-expanded={showChat}>Abrir asistente <span aria-hidden="true">↗</span></button><small>Asistente automatizado · Sin atención en vivo</small></div>
      </section>
      <section className="store-faq store-container" aria-labelledby="store-faq-title">
        <div className="store-section-heading"><h2 id="store-faq-title">Antes de continuar.</h2><p>Respuestas para explorar con claridad.</p></div>
        <details><summary>¿Cómo consulto un producto?</summary><p>Abre su ficha para ver la imagen, el precio y la referencia. Pulsa «Consultar este producto» para continuar con el asistente.</p></details>
        <details><summary>¿Puedo comprar desde esta página?</summary><p>Este catálogo de demostración permite explorar artículos y consultar información. La compra, el pago y la reserva de existencias no están habilitados.</p></details>
        <details><summary>¿Qué horario tiene Albor?</summary><p>El horario de ejemplo es de lunes a viernes de 9:00 a 18:00 y los sábados de 9:00 a 14:00, hora de Ciudad de México.</p></details>
        <details><summary>¿Necesito una cuenta para consultar?</summary><p>Puedes usar el asistente sin iniciar sesión. Evita incluir contraseñas, información de pago y datos personales en tus mensajes.</p></details>
      </section>
    </main>
    <footer className="store-footer"><div className="store-container store-footer-main"><div><a className="store-footer-brand" href="/tienda">albor</a><p>Objetos para habitar tu día.</p></div><nav aria-label="Enlaces al pie"><div><strong>EXPLORAR</strong><a href="#colecciones">Colecciones</a><a href="#catalogo">Catálogo</a><a href="#negocio">Nuestra esencia</a></div><div><strong>ESTAMOS AQUÍ</strong><a href="#atencion">Atención</a><a href="#store-faq-title">Preguntas frecuentes</a><a href="/">Acceso del personal ↗</a></div></nav></div><div className="store-container store-footer-bottom"><span>Albor Oficina y Hogar · Proyecto de demostración</span><a href="https://commons.wikimedia.org/wiki/File:Minimal_desk_and_painting_(Unsplash).jpg" target="_blank" rel="noreferrer">Fotografía de ambiente · Breather / CC0 ↗</a><span>México · MXN</span></div></footer>
    {selectedProduct&&<ProductQuickView key={selectedProduct.id} product={selectedProduct} base={base} onClose={()=>setSelectedProduct(null)} onAsk={()=>ask(selectedProduct)}/>}
    <StoreChatWidget base={base} open={showChat} onClose={()=>setShowChat(false)} question={question}/>
    <button className="store-chat-launcher" onClick={()=>setShowChat(value=>!value)} aria-label={showChat?'Minimizar asistente de atención':'Abrir asistente de atención'} aria-expanded={showChat} aria-controls="store-chat"><BotIcon/><span>{showChat?'Minimizar':'Asistente Albor'}</span></button>
  </div>;
}
