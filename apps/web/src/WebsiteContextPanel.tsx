import './websiteContext.css';

export function WebsiteContextPanel(){
  return <section className="panel website-context" aria-labelledby="website-context-title">
    <div className="website-context-heading">
      <div><span className="eyebrow">CONTEXTO COMERCIAL</span><h2 id="website-context-title">Up! · Información del sitio web</h2>
        <p>Resumen de la información pública que el ERP debe tener presente al atender consultas de la tienda.</p></div>
      <a className="website-context-link" href="/tienda" target="_blank" rel="noreferrer">Abrir página web ↗</a>
    </div>
    <div className="website-context-grid">
      <article><h3>Marca y catálogo</h3><p>Up! ofrece ropa y accesorios para mujer, hombre y unisex, con una propuesta de vestir con libertad y prendas para el día a día.</p><p>El catálogo público muestra productos, categorías y precios en MXN. Se puede buscar, filtrar por colección, categoría, talla, color y precio, ordenar por precio y guardar favoritos.</p></article>
      <article><h3>Información de producto</h3><p>Las fichas pueden incluir imagen, referencia, precio, color, material y tallas del diseño. La información visible corresponde al catálogo activo.</p><p>Las tallas describen el diseño y no confirman existencias por variante. El equipo debe verificar disponibilidad.</p></article>
      <article><h3>Alcance de la atención web</h3><p>El asistente responde preguntas sobre productos y precios, suma artículos y compara precios del catálogo.</p><p>La página no procesa compras, pagos ni reservas. El asistente no consulta pedidos personales ni inventario por talla.</p></article>
    </div>
    <details className="website-context-unpublished"><summary>Información que el sitio no publica</summary><p>Horario y dirección, formas de pago, envíos y plazos, recogida en tienda, cambios, devoluciones, garantías y facturación. El asistente debe derivar estas preguntas al equipo en vez de asumir una política.</p></details>
  </section>;
}
