export const demoScope = { companyId: 'company-promaxima-demo', branchId: 'branch-promaxima-demo' } as const;
export const demoBusiness = { name: 'Up!', description: 'Ropa y accesorios para mujer, hombre y unisex. Prendas que se mueven contigo y vestir con libertad.', mode: 'guided_faq', version: '2026-11-20', notice: 'El asistente responde con información publicada en el sitio y el catálogo activo. No consulta pedidos ni existencias por variante, y no realiza compras, pagos o reservas. Para confirmar disponibilidad o condiciones comerciales, solicita ayuda al equipo.' } as const;

const entries = [
  ['tallas', '¿Qué tallas tienen?', 'talla tallas medida medidas', 'Las fichas de Up! muestran las tallas publicadas para cada diseño. Esa información describe el diseño y no confirma existencias por talla. Solicita ayuda al equipo para verificar disponibilidad y medidas.'],
  ['cuidados', '¿Cómo cuido las prendas?', 'cuidado cuidados lavar lavado tela material materiales', 'Consulta el material indicado en la ficha del producto y sigue las instrucciones de cuidado de su etiqueta. Si la ficha no incluye instrucciones específicas, solicita ayuda al equipo.'],
  ['horario', '¿Cuál es su horario?', 'horario abren cierran apertura', 'El sitio no publica un horario de atención. Solicita ayuda al equipo para confirmar cuándo puede atenderte.'],
  ['ubicacion', '¿Dónde se encuentra la tienda?', 'ubicacion direccion ubicados tienda', 'El sitio no publica una dirección de tienda. Solicita ayuda al equipo para obtener información de ubicación.'],
  ['marca', '¿Qué es Up!?', 'marca estilo esencia filosofia libertad movimiento', 'Up! ofrece ropa y accesorios para mujer, hombre y unisex. Su propuesta es vestir con libertad con prendas para el día a día, desde camisas y denim hasta piezas con texturas especiales.'],
  ['productos', '¿Qué productos venden?', 'productos catalogo articulos colecciones categorias', 'Up! presenta ropa y accesorios para mujer, hombre y unisex. En el catálogo puedes buscar productos, explorar categorías y filtrar por colección, talla, color y precio; también puedes ordenar por precio y guardar artículos en favoritos. Las fichas muestran el precio publicado, color, material y tallas del diseño cuando esa información está disponible.'],
  ['precios', '¿Cómo consulto un precio?', 'precio precios cuesta costo cotizacion', 'Dime el nombre o la referencia de los productos y las cantidades. Puedo consultar los precios publicados en el catálogo y sumar subtotales. La estimación usa los precios visibles y no incluye cargos o descuentos que no estén publicados. No crea una compra ni reserva artículos.'],
  ['existencias', '¿Hay productos disponibles?', 'stock existencias disponible disponibilidad', 'El catálogo no confirma existencias por talla o variante. Solicita ayuda al equipo para verificar la disponibilidad actual.'],
  ['pagos', '¿Qué métodos de pago aceptan?', 'pago pagos tarjeta efectivo transferencia', 'El sitio no publica los métodos de pago. Solicita ayuda al equipo para confirmar las opciones disponibles. No compartas datos bancarios o de tarjeta por el chat.'],
  ['envios', '¿Realizan envíos?', 'envio envios envian entrega domicilio', 'El sitio no publica cobertura ni condiciones de envío. Solicita ayuda al equipo para confirmar si pueden entregar en tu zona y cuál sería el costo.'],
  ['plazos', '¿Cuánto tarda una entrega?', 'tarda tardan plazo plazos demora', 'El sitio no publica tiempos de entrega. Solicita ayuda al equipo para confirmar el plazo de tu pedido.'],
  ['recoger', '¿Puedo recoger en sucursal?', 'recoger recoleccion retiro sucursal', 'El sitio no publica opciones de recogida. Solicita ayuda al equipo para confirmar si puedes recoger tu compra.'],
  ['devoluciones', '¿Cuál es la política de devoluciones?', 'devolucion devoluciones devolver', 'El sitio no publica las condiciones de devolución. Solicita ayuda al equipo antes de realizar tu compra para conocer la política vigente.'],
  ['cambios', '¿Puedo cambiar un producto?', 'cambio cambios cambiar', 'El sitio no publica las condiciones para cambios. Solicita ayuda al equipo para revisar tu caso y confirmar la política vigente.'],
  ['garantia', '¿Cómo solicito una garantía?', 'garantia garantias defecto defectuoso', 'El sitio no publica condiciones de garantía. Solicita ayuda al equipo para que revise el producto y te indique los pasos aplicables.'],
  ['cancelacion', '¿Cómo solicito cancelar una compra?', 'cancelar cancelacion cancela', 'No puedo consultar ni modificar compras. Solicita ayuda al equipo con tu caso; el personal confirmará si puede cancelarse.'],
  ['reembolso', '¿Cómo solicito un reembolso?', 'reembolso reembolsos reintegro', 'No puedo consultar pagos ni procesar reembolsos. Solicita ayuda al equipo para que revise tu caso.'],
  ['facturas', '¿Puedo solicitar factura?', 'factura facturacion comprobante fiscal', 'El sitio no publica información sobre facturación. Solicita ayuda al equipo para confirmar cómo pedir una factura.'],
  ['danado', '¿Qué hago si recibo un artículo dañado?', 'danado roto golpeado incompleto faltante', 'Solicita ayuda al equipo para que revise lo ocurrido y te indique los pasos a seguir. Evita compartir información personal o financiera por el chat.'],
  ['pedido', '¿Puedo consultar mi pedido?', 'pedido pedidos seguimiento rastreo', 'Este asistente no consulta pedidos ni datos de clientes. Solicita ayuda al equipo para recibir atención sobre tu pedido.'],
  ['privacidad', '¿Qué información guarda este chat?', 'privacidad datos guardan guarda informacion', 'El chat guarda la conversación para que el equipo pueda revisar las solicitudes de ayuda. Si el aviso indica que hay IA activa, la pregunta y la información pública usada como contexto se envían al proveedor que aparece en el aviso. No compartas contraseñas ni datos bancarios.'],
  ['humano', '¿Cómo hablo con una persona?', 'humano humana persona asesor agente empleado', 'Pulsa Solicitar ayuda humana para enviar una consulta al equipo de Up! desde el sistema de atención. El equipo revisará el caso y responderá por el canal que tenga habilitado.'],
  ['cuenta', '¿Necesito una cuenta para preguntar?', 'cuenta registro registrar iniciar sesion', 'Puedes consultar el catálogo y hacer preguntas generales sin iniciar sesión. El personal inicia sesión para revisar las solicitudes de atención.']
] as const;

export const demoArticles = entries.map(([id, title, keywords, content]) => ({ id, title, keywords, content, version: demoBusiness.version, source: 'Información pública de Up!' }));
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function answerDemoQuestion(question: string) {
  const words = new Set(normalize(question).match(/[a-z0-9]+/g) ?? []);
  const exact = demoArticles.find(article => normalize(article.title).replace(/[^a-z0-9]/g,'') === normalize(question).replace(/[^a-z0-9]/g,''));
  const ranked = demoArticles.map(article => ({ article, score: article.keywords.split(' ').filter(word => words.has(word)).length })).sort((a,b) => b.score - a.score);
  const best = exact ? {article:exact,score:100} : ranked[0];
  if (!best?.score || best.score === ranked[1]?.score) return { text: 'No encuentro información publicada suficiente para responder con seguridad. Solicita ayuda al equipo de Up!.', source: null, needsHuman: true };
  return { text: best.article.content, source: { id: best.article.id, title: best.article.title, version: best.article.version, name: best.article.source }, needsHuman: ['horario','ubicacion','existencias','pagos','envios','plazos','recoger','devoluciones','cambios','garantia','cancelacion','reembolso','facturas','danado','pedido','humano'].includes(best.article.id) };
}
