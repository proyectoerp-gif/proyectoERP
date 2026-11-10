# Asistente: precios, estimaciones y comparaciones

9 de noviembre de 2026. Se conserva el chat híbrido, el manual público, las cuotas, el escalamiento y la separación demo/producción.

## Comportamiento

- Las preguntas abiertas sobre precios consultan productos activos de la empresa demo. No leen pedidos privados, personas, caja ni movimientos de inventario.
- Se calculan cantidades × precio unitario, subtotales y total en centavos enteros. Se aceptan nombres, plurales sencillos, SKU y cantidades en cifras o palabras frecuentes. La estimación está expresada en MXN, como el catálogo público.
- Si hay varias coincidencias o un artículo desconocido, pide nombres/SKU concretos, muestra opciones cuando existen y evita sumar un total parcial o adivinado.
- Puede identificar el menor y mayor precio, empates, colección Mujer/Hombre/Unisex y tipos de prenda reconocidos. Las consultas simples de extremos ordenan en base de datos, de modo que no dependen de la primera página de doce artículos de la tienda.
- El contexto de la última respuesta guarda únicamente IDs públicos y cantidades, dentro de la conversación ya protegida. Un seguimiento como «y dos de cada una» vuelve a leer los precios actuales. No se utilizan precios viejos extraídos del texto del chat.
- Las consultas por producto seleccionado conservan su nombre para el escalamiento. Un producto retirado o de otra empresa sigue sin revelar información.
- Estas respuestas son guiadas y no llaman a Gemini/OpenAI ni consumen su cuota, incluso si el proveedor está activado. Los reintentos con el mismo requestId devuelven la respuesta persistida sin duplicar mensajes; una pregunta nueva vuelve a consultar precios.
- El visitante dispone de accesos rápidos «La más barata» y «La más cara», ayuda con un ejemplo de cantidades y un saludo que explica esta capacidad. El artículo de ayuda de precios ya no deriva toda estimación al personal.

## Límites deliberados

Las cantidades son enteras de 1 a 100 por artículo, con hasta veinte artículos distintos. El reconocimiento es conservador; no interpreta de forma general cualquier expresión coloquial, errores ortográficos o cambios de cesta. Las ambigüedades se aclaran. Para reconocimiento por nombre se consultan hasta 201 registros; si se supera el límite de doscientos, se rechaza una suma que pudiera omitir artículos. Las comparaciones con características adicionales y catálogos muy amplios solicitan precisión en lugar de extrapolar.

No aplica porcentajes, descuentos, impuestos adicionales ni envío no confirmados. No confirma existencias ni crea una venta, reserva o pago. Tampoco transforma una consulta de pedido privado en información pública. Las comprobaciones locales no modifican datos de Atlas.

## Validación

Pruebas unitarias de números, nombres, plurales, SKU, centavos, productos repetidos, ambiguos/desconocidos, cantidades negativas/fraccionarias, extremos, empates, cambios de precio, contexto y ajustes sencillos de unidades. Integración HTTP con MongoDB temporal para persistencia, idempotencia, protección de datos, aislamiento, cuota conservada y proveedor activado con cero llamadas. Se mantuvieron las suites anteriores de chat y del ERP.

Revisión visual en la tienda local con veinte prendas ficticias: pregunta de dos Camisa Lino y un Jeans Rectos con desglose/total; botones de menor y mayor precio; móvil de 390 px sin desbordamiento. Evidencia local en `tmp/shopping-proof/`.

Resultados de esta entrega: 469 pruebas unitarias backend, 191 integraciones aisladas y 168 pruebas web aprobadas; compilación backend/web y lint aprobados. Los límites «hasta» y «menos de» también se respetan en comparaciones de extremos. No se publican precios codificados: los ejemplos de pruebas usan datos ficticios locales y las respuestas consultan los valores vigentes.
