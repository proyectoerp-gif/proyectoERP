# Catálogo público y atención

Primera versión: 15 de octubre de 2026.

## Acceso

- Página pública: `/tienda`, sin cuenta del ERP.
- Chat independiente existente: `/demo-atencion`, conservado para enlaces anteriores.
- ERP del personal: `/`, con la autenticación y permisos existentes.
- La franja del entorno demo y la sección de soporte del ERP enlazan al catálogo.

La página presenta Promaxima Demo, una empresa ficticia de oficina y hogar, un catálogo con búsqueda y paginación, horario de ejemplo y atención integrada. Las ilustraciones son decorativas; no son fotografías de los productos.

## Información publicada

`GET /api/v1/demo-support/catalog` está habilitado exclusivamente cuando `ERP_ENVIRONMENT=demo`. Publica los productos `ACTIVE` de la empresa fija `company-promaxima-demo`. El visitante no puede seleccionar empresa, sucursal, estado, campos ni tamaño de página.

La respuesta contiene únicamente identificador público del producto, nombre, SKU, precio de referencia y nombre de categoría. No incluye contactos, pedidos, inventario, usuarios, auditoría ni identificadores de empresa o sucursal. Las categorías se resuelven dentro de la misma empresa; si no están activas, se muestra una etiqueta genérica.

La búsqueda por nombre o SKU es literal, de hasta 80 caracteres; las páginas incluyen hasta 12 productos y un cursor. La ruta usa el límite de solicitudes existente de la demo y no almacena caché. El cliente valida la respuesta y muestra estados de carga, error y catálogo vacío sin inventar productos.

Los precios se leen del ERP. Como su modelo actual no registra moneda, se indica «moneda no configurada»; no se asume MXN. Tampoco se publican cantidades ni se promete disponibilidad.

**En esta demo los productos activos de la empresa ficticia son públicos.** Antes de adaptar la página a una empresa real se necesita un control explícito de publicación por producto y configurar moneda, contenido comercial, fotografías y políticas aprobadas. La ruta permanece deshabilitada en producción.

## Atención

El botón de cada producto prepara una pregunta con su nombre y referencia; el visitante revisa y envía el texto. El asistente conserva el manual de 20 respuestas guiadas y sus fuentes: no se conectó un modelo generativo ni se implementó búsqueda inteligente del catálogo desde el chat.

El chat puede minimizarse sin perder el borrador ni los mensajes durante la visita. Recargar o cerrar la página pierde el acceso local a la conversación, como antes. El botón «Solicitar ayuda humana» utiliza la derivación existente a un ticket del ERP, con su auditoría e idempotencia. El personal puede revisar el caso y el historial; no hay respuesta humana en vivo al visitante.

No hay carrito, pagos, reservas, pedidos personales, registro de clientes ni cambios en los permisos del ERP.

## Comprobaciones

- TypeScript de backend, web y móvil y compilación de backend/web aprobados.
- 434 pruebas de backend, 141 de web y 110 comprobaciones de integración con MongoDB temporal aprobadas.
- Nuevas comprobaciones de catálogo: exclusión de productos inactivos y de otras empresas, lista de campos públicos, paginación sin duplicados, búsqueda literal, rechazo de parámetros de ámbito y bloqueo en producción.
- Cliente web: consultas sin credenciales de personal, validación de precios y páginas, errores y límite de solicitudes sin productos sustitutos.
- Revisión en navegador a 1440, 768 y 390 píxeles, sin desbordamiento horizontal en las vistas revisadas. Búsqueda y estado vacío, consulta de producto, respuesta frecuente, minimizar/reabrir y derivación comprobados con datos locales ficticios.
- Confirmado en la interfaz interna que el ticket de consulta de producto aparece en Solicitudes de ayuda.

Persistió la advertencia de Vite sobre el tamaño del paquete JavaScript; no impide la compilación.
