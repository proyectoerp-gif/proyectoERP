import {GarmentArt,type GarmentKind} from './GarmentArt';
import React,{useEffect,useRef,useState,type FormEvent} from 'react';
import {BotIcon,StoreChatWidget} from './StoreChatWidget';
import {loadPublicCatalog,type PublicCatalog,type PublicProduct,type PublicCategory,type PublicCatalogFilters} from './publicCatalogApi';
import './storefront.css';
import './storefrontStudio.css';
import {StoreIcon} from './StoreIcon';

const scrollBehavior=():ScrollBehavior=>window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
const demoPrice = new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',currencyDisplay:'code'});

function ProductArt({product,base}:{product:PublicProduct;base:string}){
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>setLoaded(false),[product.id,product.imageVersion]);
  return <div className="store-product-art fashion-product-art">
    {product.imageVersion&&<img className={'store-product-photo'+(loaded?' is-loaded':'')} src={base+'/demo-support/catalog/'+product.id+'/image?v='+encodeURIComponent(product.imageVersion)} alt={product.name} loading="lazy" decoding="async" onLoad={()=>setLoaded(true)} onError={()=>setLoaded(false)}/>}
    <div style={loaded?{visibility:'hidden',width:'100%'}:{width:'100%'}}><GarmentArt kind={product.apparel?.garment??'tee'} color={product.apparel?.colorHex}/></div>
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
        <p>{product.apparel?.description??'Consulta este artículo con el asistente de Albor Moda.'}</p>{product.apparel&&<div className="fashion-specs"><p><strong>Color</strong><span className="fashion-card-color"><i style={{backgroundColor:product.apparel.colorHex}} aria-hidden="true"/>{product.apparel.color}</span></p><p><strong>Material de ejemplo</strong><span>{product.apparel.material}</span></p><div><strong>Tallas del diseño</strong><div className="fashion-size-list">{product.apparel.sizes.map(size=><span key={size}>{size}</span>)}</div><small>Referencia de la colección; no representa disponibilidad en inventario.</small></div></div>}
        <button type="button" className="store-primary" onClick={onAsk}>Consultar este producto <span aria-hidden="true">↗</span></button>
        <details><summary>Disponibilidad y condiciones</summary><p>El precio corresponde al catálogo de demostración. La consulta no reserva existencias ni genera una compra. La disponibilidad requiere confirmación del equipo.</p></details>
      </div>
    </div>
  </dialog>;
}

function CollectionArt({name}:{name:string}){
  const kind:GarmentKind=/denim|pantal/i.test(name)?'jeans':/vestido|falda/i.test(name)?'dress':/chaqueta|abrigo/i.test(name)?'blazer':/accesorio/i.test(name)?'bag':/camisa|punto/i.test(name)?'shirt':'tee';
  return <GarmentArt kind={kind} color={/denim/i.test(name)?'#7c91a1':'#b7ac98'}/>;
}

export function DemoStorefront({base}:{base:string}){
  const [page,setPage]=useState<PublicCatalog>();
  const [favorites,setFavorites]=useState<string[]>(()=>{try{const value=JSON.parse(localStorage.getItem('albor-fashion-favorites-v1')??'[]');return Array.isArray(value)?[...new Set(value.filter((id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9]{24}$/i.test(id)))].slice(0,40):[];}catch{return [];}});
  const [savedOnly,setSavedOnly]=useState(false);
  const [audience,setAudience]=useState(''),[size,setSize]=useState(''),[color,setColor]=useState(''),[sort,setSort]=useState('recent');
  useEffect(()=>{try{localStorage.setItem('albor-fashion-favorites-v1',JSON.stringify(favorites));}catch{/* Favorites remain available for this visit. */}},[favorites]);
  function toggleFavorite(id:string){setFavorites(values=>values.includes(id)?values.filter(value=>value!==id):values.length<40?[...values,id]:values);if(savedOnly)setCursors(['']);}
  function chooseAudience(value:string){setAudience(value);setSavedOnly(false);setFilters({audience:value});setCategory('');setSize('');setColor('');setSort('recent');setSearch('');setApplied('');setMinPrice('');setMaxPrice('');setCursors(['']);catalogTitle.current?.focus();document.getElementById('catalogo')?.scrollIntoView({behavior:scrollBehavior()});}
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
  const activeFilters=Boolean(applied||filters.category||filters.minPrice||filters.maxPrice||filters.audience||filters.size||filters.color||savedOnly);

  useEffect(()=>{
    const previous=document.title;
    document.title='Albor Moda · Viste a tu manera';
    const meta=document.querySelector('meta[name="description"]'),theme=document.querySelector('meta[name="theme-color"]');
    const previousDescription=meta?.getAttribute('content'),previousTheme=theme?.getAttribute('content');
    meta?.setAttribute('content','Descubre Albor Moda: ropa y accesorios ficticios para mujer, hombre y unisex. Explora diseños, tallas, colores y precios en MXN.');theme?.setAttribute('content','#f7f6f1');
    return()=>{document.title=previous;if(previousDescription!==null&&previousDescription!==undefined)meta?.setAttribute('content',previousDescription);if(previousTheme!==null&&previousTheme!==undefined)theme?.setAttribute('content',previousTheme);};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError('');setPage(undefined);
    (savedOnly&&!favorites.length?Promise.resolve<PublicCatalog>({items:[],nextCursor:null,currency:'MXN'}):loadPublicCatalog(base,applied,cursor,controller.signal,{...filters,...(savedOnly?{ids:favorites.join(',')}:{})})).then(data=>{
      if(controller.signal.aborted)return;
      setPage(data);
      if(data.categories)setCategories(data.categories);
    }).catch(cause=>{
      if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'No pudimos cargar el catálogo.');
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[base,applied,cursor,revision,filters,savedOnly,favorites]);

  function find(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setFilterError('');
    if(minPrice&&maxPrice&&Number(minPrice)>Number(maxPrice)){
      setFilterError('El precio mínimo debe ser menor o igual al máximo.');
      return;
    }
    setApplied(search.trim());
    setFilters({category,minPrice,maxPrice,audience,size,color,sort});
    setCursors(['']);setRevision(value=>value+1);
    event.currentTarget.querySelector('details')?.removeAttribute('open');
    catalogTitle.current?.focus();
  }
  function resetFilters(){
    setSearch('');setApplied('');setCategory('');setMinPrice('');setMaxPrice('');
    setFilters({});setAudience('');setSize('');setColor('');setSort('recent');setSavedOnly(false);setFilterError('');setCursors(['']);setRevision(value=>value+1);
  }
  function chooseCollection(id:string){
    setCategory(id);setFilters({category:id});setAudience('');setSize('');setColor('');setSort('recent');setSavedOnly(false);
    setSearch('');setApplied('');setMinPrice('');setMaxPrice('');setFilterError('');
    setCursors(['']);setRevision(value=>value+1);
    catalogTitle.current?.focus();document.getElementById('catalogo')?.scrollIntoView({behavior:scrollBehavior()});
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
    <div className="store-demo-notice"><span>ALBOR MODA · ESTUDIO DE ESTILO</span><span>Colección de demostración / MXN</span></div>
    <header className="store-header store-container">
      <div className="store-header-caption">ROPA & ACCESORIOS<small>Para cada forma de ser.</small></div>
      <a href="/tienda" className="store-brand" aria-label="Albor, inicio">albor<span>MODA PARA EXPRESARTE</span></a>
      <div className="store-header-actions"><button type="button" className="store-search-trigger" aria-label="Buscar prendas" onClick={()=>{document.getElementById('catalogo')?.scrollIntoView({behavior:scrollBehavior()});document.getElementById('store-search')?.focus({preventScroll:true});}}><StoreIcon name="search"/><span>Buscar</span></button><button type="button" className="fashion-saved-toggle" aria-label={`Favoritos (${favorites.length})`} aria-pressed={savedOnly} onClick={()=>{setSavedOnly(value=>!value);setCursors(['']);document.getElementById('catalogo')?.scrollIntoView({behavior:scrollBehavior()});}}><StoreIcon name="heart"/><span>Favoritos</span><b>{favorites.length}</b></button></div>
    </header>
    <nav className="store-category-nav" aria-label="Navegación de la tienda"><div className="store-container"><div className="store-nav-links"><button type="button" aria-pressed={!audience&&!savedOnly&&!category} onClick={()=>{resetFilters();document.getElementById('catalogo')?.scrollIntoView({behavior:scrollBehavior()});}}>Ver todo</button>{['Mujer','Hombre','Unisex'].map(value=><button key={value} type="button" aria-pressed={audience===value} onClick={()=>chooseAudience(value)}>{value}</button>)}<a href="#colecciones">Colecciones</a></div><button type="button" className="store-nav-chat" onClick={()=>ask()}><StoreIcon name="spark"/><span>Tu asistente de estilo</span></button></div></nav>
    <main>
      <section className="store-hero" aria-labelledby="store-title">
        <div className="store-hero-photo"><img src="/store/fashion-boutique.webp" width="1200" height="1800" fetchPriority="high" alt="Inspiración de tienda: prendas en tonos neutros, percheros y una lámpara esférica en un interior cálido"/></div>
        <div className="store-hero-copy"><p className="store-eyebrow"><span/> COLECCIÓN ESENCIA / ALBOR ESTUDIO</p><h1 id="store-title"><span>Tu estilo.</span><br/><em>Tus reglas.</em></h1><p>No hay una sola forma de vestir. Encuentra las prendas que se sienten como tú.</p><div className="store-hero-actions"><a className="store-primary" href="#catalogo">Explora la colección <StoreIcon name="arrow"/></a><a className="store-hero-secondary" href="#negocio">Conoce Albor</a></div><span className="store-hero-edition">MUJER <i/> HOMBRE <i/> UNISEX</span></div>
        <div className="store-hero-stamp" aria-hidden="true">A<span>EST. ALBOR / MX</span></div><span className="store-hero-caption">UN NUEVO PUNTO DE VISTA. EL TUYO.</span>
      </section>
      <div className="store-promises store-container"><div><span>01</span><p>Encuentra tu forma<small>Ropa y accesorios para tu día a día.</small></p></div><div><span>02</span><p>Hazlo a tu ritmo<small>Guarda lo que te gusta en favoritos.</small></p></div><div><span>03</span><p>Hablemos de tu selección<small>Albor te ayuda con precios y prendas.</small></p></div></div>
      <section id="catalogo" className="store-catalog store-container" aria-labelledby="catalog-title" aria-busy={loading}>
        <div className="store-section-heading">
          <div><p className="store-eyebrow">PIEZAS PARA HACERLAS TUYAS</p><h2 id="catalog-title" ref={catalogTitle} tabIndex={-1}>La selección Albor.</h2></div>
          <p>Prendas con personalidad.<br/>Precios en pesos mexicanos.</p>
        </div>
        <form className="store-catalog-toolbar" onSubmit={find}>
          <div className="store-search-field"><label htmlFor="store-search">Buscar en el catálogo</label><div><input id="store-search" type="search" maxLength={80} value={search} onChange={event=>setSearch(event.target.value)} placeholder="¿Qué estás buscando?"/><button type="submit" disabled={loading} aria-label="Buscar productos">↗</button></div></div>
          <details className="store-filter-panel">
            <summary>Filtrar <span aria-hidden="true">+</span></summary>
            <div className="store-filter-content">
              <div className="store-filter-field"><label htmlFor="store-category">Categoría</label><select id="store-category" value={category} onChange={event=>setCategory(event.target.value)}><option value="">Todas las categorías</option>{categories.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
              <div className="store-filter-field"><label htmlFor="fashion-audience">Colección</label><select id="fashion-audience" value={audience} onChange={e=>setAudience(e.target.value)}><option value="">Todas</option>{['Mujer','Hombre','Unisex'].map(value=><option key={value}>{value}</option>)}</select></div>
              <div className="store-filter-field"><label htmlFor="fashion-size">Talla</label><select id="fashion-size" value={size} onChange={e=>setSize(e.target.value)}><option value="">Todas las tallas</option>{['XS','S','M','L','XL','XXL','Única'].map(value=><option key={value}>{value}</option>)}</select></div>
              <div className="store-filter-field"><label htmlFor="fashion-color">Color</label><select id="fashion-color" value={color} onChange={e=>setColor(e.target.value)}><option value="">Todos los colores</option>{['Marfil','Negro','Beige','Azul','Verde','Rosa','Marrón','Gris'].map(value=><option key={value}>{value}</option>)}</select></div>
              <div className="store-filter-field"><label htmlFor="fashion-sort">Ordenar por</label><select id="fashion-sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Más recientes</option><option value="price-asc">Precio: menor a mayor</option><option value="price-desc">Precio: mayor a menor</option></select></div>
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
          :<div className="store-product-grid">{page.items.map(product=><article key={product.id} className="store-product"><button type="button" className="fashion-favorite" aria-label={(favorites.includes(product.id)?'Quitar de favoritos: ':'Guardar en favoritos: ')+product.name} aria-pressed={favorites.includes(product.id)} disabled={!favorites.includes(product.id)&&favorites.length>=40} onClick={()=>toggleFavorite(product.id)}>{favorites.includes(product.id)?'♥':'♡'}</button>
            <button type="button" className="store-product-open" aria-label={'Ver detalles de '+product.name} onClick={()=>setSelectedProduct(product)}><ProductArt product={product} base={base}/><span>Vista rápida <span aria-hidden="true">+</span></span></button>
            <div className="store-product-copy"><p className="store-product-category">{product.apparel?.audience??product.category}</p><h3><button type="button" onClick={()=>setSelectedProduct(product)}>{product.name}</button></h3><p className="store-product-price">{demoPrice.format(product.price)}</p>{product.apparel&&<p className="fashion-card-color"><i style={{backgroundColor:product.apparel.colorHex}} aria-hidden="true"/>{product.apparel.color} · {product.apparel.sizes.join(' / ')}</p>}<button type="button" className="store-product-consult" onClick={()=>ask(product)} aria-label={'Consultar sobre '+product.name}>Consultar con Albor <StoreIcon name="arrow"/></button></div>
          </article>)}</div>}
        <div className="store-pagination"><span>Página {cursors.length}</span><div><button disabled={loading||cursors.length===1} onClick={()=>turnPage('previous')}>← Anterior</button><button disabled={loading||!page?.nextCursor} onClick={()=>turnPage('next')}>Siguiente →</button></div></div>
        <p className="store-catalog-note">Catálogo de demostración. Las consultas no reservan existencias ni generan pedidos.</p>
      </section>
      <section id="colecciones" className="store-collections store-container" aria-labelledby="collections-title">
        <div className="store-section-heading"><div><p className="store-eyebrow">EXPLORA A TU MANERA</p><h2 id="collections-title">Una categoría. Mil posibilidades.</h2></div><a href="#catalogo">Ver todo <span aria-hidden="true">↗</span></a></div>
        <div className="store-collection-grid">
          {categories.slice(0,6).map((item,index)=><button type="button" key={item.id} className={'store-collection collection-'+index} onClick={()=>chooseCollection(item.id)}>
            <div><CollectionArt name={item.name}/></div><span><span>{item.name}</span><span aria-hidden="true">↗</span></span>
          </button>)}
          {!categories.length&&<a className="store-collection-placeholder" href="#catalogo">Explorar todos los artículos <span aria-hidden="true">↗</span></a>}
        </div>
      </section>
      <section id="negocio" className="store-about store-container">
        <div className="store-about-image"><img src="/store/fashion-flatlay.webp" alt="Inspiración de conjunto: camiseta a rayas, falda verde y zapatillas sobre madera clara" width="1100" height="1100" loading="lazy"/><small>Imagen de ambiente</small></div>
        <div className="store-about-copy"><p className="store-eyebrow">EL UNIVERSO ALBOR</p><h2>Vestir también<br/>es <em>expresarte.</em></h2><p>Creemos en vestir con libertad. En la camisa que combina con todo, un denim que acompaña el día y esa textura que hace especial lo sencillo.</p><p>Albor Moda es una marca ficticia. Sus prendas, materiales y precios son ejemplos; las ilustraciones representan diseños conceptuales de la colección.</p><button type="button" onClick={()=>ask()}>Conversa con Albor <span aria-hidden="true">↗</span></button></div>
      </section>
      <section id="atencion" className="store-attention store-container" aria-labelledby="attention-title">
        <div><p className="store-eyebrow">UN POCO DE AYUDA, MUCHO ESTILO</p><h2 id="attention-title">¿Lo combinamos?</h2><p>Pregunta por una prenda, compara precios o calcula cuánto costaría tu selección. El asistente está para ayudarte.</p></div>
        <div className="store-attention-actions"><button type="button" className="store-primary" onClick={()=>ask()} aria-controls="store-chat" aria-expanded={showChat}>Abrir asistente <span aria-hidden="true">↗</span></button><small>Asistente automatizado · Sin atención en vivo</small></div>
      </section>
      <section className="store-faq store-container" aria-labelledby="store-faq-title">
        <div className="store-section-heading"><h2 id="store-faq-title">Antes de continuar.</h2><p>Respuestas para explorar con claridad.</p></div>
        <details><summary>¿Cómo consulto un producto?</summary><p>Abre su ficha para ver la imagen, el precio y la referencia. Pulsa «Consultar este producto» para continuar con el asistente.</p></details>
        <details><summary>¿Puedo comprar desde esta página?</summary><p>Este catálogo de demostración permite explorar artículos y consultar información. La compra, el pago y la reserva de existencias no están habilitados.</p></details>
        <details><summary>¿Cómo elijo mi talla?</summary><p>Abre la ficha para ver las tallas de cada diseño. Esta colección ficticia no cuenta con medidas corporales verificadas. Consulta al equipo antes de elegir; las tallas no indican existencias.</p></details><details><summary>¿Qué horario tiene Albor?</summary><p>El horario de ejemplo es de lunes a viernes de 9:00 a 18:00 y los sábados de 9:00 a 14:00, hora de Ciudad de México.</p></details>
        <details><summary>¿Necesito una cuenta para consultar?</summary><p>Puedes usar el asistente sin iniciar sesión. Evita incluir contraseñas, información de pago y datos personales en tus mensajes.</p></details>
      </section>
    </main>
    <footer className="store-footer"><div className="store-footer-endmark store-container" aria-hidden="true">albor.</div><div className="store-container store-footer-main"><div><a className="store-footer-brand" href="/tienda">albor</a><p>Viste a tu manera.</p></div><nav aria-label="Enlaces al pie"><div><strong>EXPLORAR</strong><a href="#colecciones">Colecciones</a><a href="#catalogo">Catálogo</a><a href="#negocio">Nuestra esencia</a></div><div><strong>ESTAMOS AQUÍ</strong><a href="#atencion">Atención</a><a href="#store-faq-title">Preguntas frecuentes</a><a href="/">Acceso del personal ↗</a></div></nav></div><div className="store-container store-footer-bottom"><span>Albor Moda · Proyecto de demostración</span><a href="/store/credits.txt" target="_blank" rel="noreferrer">Fotografías y créditos ↗</a><span>México · MXN</span></div></footer>
    {selectedProduct&&<ProductQuickView key={selectedProduct.id} product={selectedProduct} base={base} onClose={()=>setSelectedProduct(null)} onAsk={()=>ask(selectedProduct)}/>}
    <StoreChatWidget base={base} open={showChat} onClose={()=>setShowChat(false)} question={question}/>
    <button className="store-chat-launcher" onClick={()=>setShowChat(value=>!value)} aria-label={showChat?'Minimizar asistente de atención':'Abrir asistente de atención'} aria-expanded={showChat} aria-controls="store-chat"><BotIcon/><span>{showChat?'Minimizar':'Asistente Albor'}</span></button>
  </div>;
}
