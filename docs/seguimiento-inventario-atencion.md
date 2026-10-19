# Seguimiento comercial, inventario y atención

Implementado el 18 de octubre de 2026 para la demo.

## Pagos y entregas

En Ventas y Compras, «Pagos, entregas y devoluciones» muestra el importe original, el valor devuelto, el importe neto, lo pagado, el saldo pendiente y el reembolso disponible. Permite anticipos, pagos parciales, entregas o recepciones parciales y una fecha de vencimiento. Primero se debe aprobar una compra.

Cada movimiento exige fecha y referencia. Los pagos afectan caja; las entregas afectan inventario. Se pueden entregar productos antes de cobrar el saldo, dejando el crédito visible. No se calculan intereses ni límites de crédito y no se ejecutan transferencias bancarias.

Los movimientos conservan usuario, referencias y versión. Una misma solicitud se puede reintentar sin duplicarla. Las operaciones concurrentes comprueban la versión del documento y se guardan mediante transacciones MongoDB. No se permite cancelar directamente un documento que ya tenga dinero o mercancía registrados. Cada documento admite hasta 100 movimientos de seguimiento.

Se reconoce el comprobante conjunto de documentos anteriores. Los documentos antiguos marcados como pagados o recibidos sin comprobante requieren revisar su historial antes de registrar nuevos movimientos. La opción conjunta sigue disponible para documentos sin seguimiento.

## Devoluciones e inventario

Las devoluciones están vinculadas al documento y no pueden superar lo entregado o recibido. Devuelven mercancía y reducen proporcionalmente el importe neto. El reembolso se registra por separado y no puede superar lo disponible. Se permite devolver un producto retirado del catálogo para conservar la operación histórica. Una devolución no reabre cantidades para reposición; una reposición requiere otro documento.

«Ajustar por conteo» compara la cantidad física con el saldo consultado y registra únicamente la diferencia con un motivo obligatorio. Si otro movimiento cambió el saldo, exige consultarlo de nuevo. No elimina movimientos ni modifica caja. El historial se puede filtrar por producto, incluidos los retirados.

Los indicadores generales de ventas y compras siguen sumando los importes originales de documentos no cancelados; no representan ventas netas de devoluciones. El seguimiento de cada documento muestra su importe neto y caja incluye los reembolsos registrados.

## Formularios y navegación

Los paneles de creación conservan el borrador al cerrarse. Antes de cambiar de módulo o cerrar sesión se pide confirmar el descarte de cambios. Los formularios de edición avisan antes de cerrarse con cambios. Se impide salir durante un guardado o mientras se debe reintentar una respuesta ambigua de seguimiento o conteo. El navegador advierte antes de cerrar una página con operaciones o borradores pendientes.

## Catálogo y chatbot

«Consultar sobre…» abre el minichat con la pregunta y el identificador del producto. El backend consulta el catálogo activo de la empresa ficticia, responde con nombre, referencia y precio publicado, e identifica la fuente. Un producto inexistente, retirado o de otra empresa no revela información privada. La consulta no reserva stock ni crea una venta.

Al solicitar ayuda, el ticket conserva el producto verificado y la última pregunta. Continúan disponibles las preguntas frecuentes y las políticas de ejemplo. El asistente sigue siendo guiado, sin IA generativa y sin atención humana en vivo.

El nuevo seguimiento completo se opera desde el ERP web. La aplicación móvil reconoce los documentos con seguimiento y dirige al usuario al ERP web, evitando repetir la liquidación anterior.

## Verificación

- Typecheck de backend, web y móvil; compilación de backend y web.
- 434 pruebas unitarias de backend, 158 de web y 150 de móvil.
- 160 pruebas con MongoDB temporal local: transacciones, concurrencia, aislamiento, pagos, devoluciones, conteos y contexto del chatbot.
- Recorrido manual con datos ficticios locales: anticipo de 500 sobre una venta de 2,599; dos entregas de una unidad; pago del saldo de 2,099; devolución de una unidad por 1,299.50; reembolso separado por ese importe. Saldo final y reembolso disponible: cero. Caja neta incluyendo saldo inicial: 1,799.50.
- Conteo físico de 19 a 17 unidades con registro de diferencia -2; conservación de borrador al cancelar la salida; captura y confirmación de fecha de vencimiento; precio de catálogo desde el minichat y creación del ticket.

Las pruebas manuales no modificaron la base de producción ni registraron pagos reales.
