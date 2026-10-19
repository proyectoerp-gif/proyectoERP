export const demoScope = { companyId: 'company-promaxima-demo', branchId: 'branch-promaxima-demo' } as const;
export const demoBusiness = { name: 'Promaxima Demo', description: 'Tienda ficticia de artículos para oficina y hogar', mode: 'guided_faq', version: '2026-10-18', notice: 'Simulación educativa. Las políticas son ficticias. No introduzcas datos personales, contraseñas ni pedidos reales. Respuestas guiadas; no hay un modelo de IA conectado.' } as const;

const entries = [
  ['horario', '¿Cuál es su horario?', 'horario abren cierran apertura', 'En esta tienda ficticia atendemos de lunes a viernes de 9:00 a 18:00 y los sábados de 9:00 a 14:00.'],
  ['ubicacion', '¿Dónde se encuentra la tienda?', 'ubicacion direccion ubicados tienda', 'La sucursal de simulación está en Ciudad de México. No existe una dirección de atención real.'],
  ['productos', '¿Qué productos venden?', 'productos catalogo articulos', 'La empresa de ejemplo vende artículos de oficina y hogar. Selecciona un producto del catálogo para consultar su precio publicado; la disponibilidad la confirma el equipo.'],
  ['precios', '¿Cómo consulto un precio?', 'precio precios cuesta costo cotizacion', 'Pulsa Consultar producto en el catálogo para ver su precio publicado. Si necesitas una cotización o confirmar disponibilidad, solicita ayuda al equipo. El chat no inventa precios ni consulta pedidos privados.'],
  ['existencias', '¿Hay productos disponibles?', 'stock existencias disponible disponibilidad', 'La disponibilidad debe confirmarla una persona consultando el inventario. Solicita ayuda para practicar ese flujo con datos ficticios.'],
  ['pagos', '¿Qué métodos de pago aceptan?', 'pago pagos tarjeta efectivo transferencia', 'La política ficticia contempla efectivo, tarjeta y transferencia. Nunca envíes datos bancarios o de tarjeta por el chat.'],
  ['envios', '¿Realizan envíos?', 'envio envios envian entrega domicilio', 'En la simulación hay entrega local en Ciudad de México. Cobertura y costo deben confirmarse antes de una compra ficticia.'],
  ['plazos', '¿Cuánto tarda una entrega?', 'tarda tardan plazo plazos demora', 'El plazo de ejemplo es de 2 a 5 días hábiles después de confirmar una compra ficticia. No es una promesa de entrega real.'],
  ['recoger', '¿Puedo recoger en sucursal?', 'recoger recoleccion retiro sucursal', 'Sí, en el escenario ficticio se puede recoger en sucursal después de que el equipo confirme que el pedido de prueba está preparado.'],
  ['devoluciones', '¿Cuál es la política de devoluciones?', 'devolucion devoluciones devolver', 'La política de ejemplo permite solicitar una devolución dentro de 7 días naturales, conservando empaque y comprobante ficticio. Un empleado revisa cada caso.'],
  ['cambios', '¿Puedo cambiar un producto?', 'cambio cambios cambiar', 'En esta simulación los cambios se solicitan dentro de 7 días naturales y están sujetos a revisión y disponibilidad. El chat no autoriza cambios.'],
  ['garantia', '¿Cómo solicito una garantía?', 'garantia garantias defecto defectuoso', 'Describe el problema con datos inventados y solicita atención humana. El equipo revisará la garantía ficticia; el chat no determina su aprobación.'],
  ['cancelacion', '¿Cómo solicito cancelar una compra?', 'cancelar cancelacion cancela', 'La cancelación de una compra ficticia debe revisarla el personal. El chat puede crear un caso, pero no modifica ventas.'],
  ['reembolso', '¿Cómo solicito un reembolso?', 'reembolso reembolsos reintegro', 'Un empleado debe revisar y autorizar cualquier reembolso de prueba. El chat no ejecuta pagos ni devuelve dinero.'],
  ['facturas', '¿Puedo solicitar factura?', 'factura facturacion comprobante fiscal', 'Puedes practicar una solicitud con datos inventados. Los documentos de esta demo son borradores y no comprobantes fiscales emitidos.'],
  ['danado', '¿Qué hago si recibo un artículo dañado?', 'danado roto golpeado incompleto faltante', 'Describe el incidente con información ficticia y pulsa Solicitar ayuda humana. No subas fotografías ni documentos personales.'],
  ['pedido', '¿Puedo consultar mi pedido?', 'pedido pedidos seguimiento rastreo', 'Este prototipo no consulta pedidos personales ni verifica identidades de clientes. Una persona puede atender un caso ficticio; no compartas números o datos reales.'],
  ['privacidad', '¿Qué información guarda esta demo?', 'privacidad datos guardan guarda informacion', 'Se guarda la conversación de prueba durante un máximo previsto de 7 días; MongoDB elimina los registros caducados de forma asíncrona. Si creas un ticket, conserva una descripción y referencia hasta su revisión administrativa. Cuando el aviso del chat indica IA activa, la pregunta y el manual público se envían a OpenAI, sujeto a sus controles de datos. Usa solo información ficticia.'],
  ['humano', '¿Cómo hablo con una persona?', 'humano humana persona asesor agente empleado', 'Pulsa Solicitar ayuda humana. Se creará un ticket de demostración para que el equipo lo revise en Solicitudes de ayuda. No hay atención en tiempo real ni un plazo garantizado.'],
  ['cuenta', '¿Necesito una cuenta para preguntar?', 'cuenta registro registrar iniciar sesion', 'Para las preguntas generales de esta demo no necesitas una cuenta del ERP. El personal sí inicia sesión para revisar los casos.']
] as const;

export const demoArticles = entries.map(([id, title, keywords, content]) => ({ id, title, keywords, content, version: demoBusiness.version, source: 'Manual ficticio de atención · Promaxima Demo' }));
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function answerDemoQuestion(question: string) {
  const words = new Set(normalize(question).match(/[a-z0-9]+/g) ?? []);
  const exact = demoArticles.find(article => normalize(article.title).replace(/[^a-z0-9]/g,'') === normalize(question).replace(/[^a-z0-9]/g,''));
  const ranked = demoArticles.map(article => ({ article, score: article.keywords.split(' ').filter(word => words.has(word)).length })).sort((a,b) => b.score - a.score);
  const best = exact ? {article:exact,score:100} : ranked[0];
  if (!best?.score || best.score === ranked[1]?.score) return { text: 'No tengo una respuesta suficientemente clara en el manual ficticio. Elige una pregunta frecuente o solicita ayuda humana. No voy a inventar una respuesta.', source: null, needsHuman: true };
  return { text: best.article.content, source: { id: best.article.id, title: best.article.title, version: best.article.version, name: best.article.source }, needsHuman: ['precios','existencias','garantia','cancelacion','reembolso','danado','pedido','humano'].includes(best.article.id) };
}
