# Ventas y compras con varios productos

Implementación: 18 de octubre de 2026.

## Flujo del ERP web

1. Selecciona el cliente o proveedor activo de tu sucursal.
2. Abre Agregar producto y escribe nombre o SKU. La búsqueda actualiza los resultados automáticamente.
3. Agrega hasta 20 productos distintos. Cada artículo tiene su cantidad; en compras se indica también su costo unitario. Los precios de venta vienen del catálogo.
4. Puedes quitar artículos o modificar sus cantidades sin rehacer el documento. Seleccionar un producto repetido dirige a su cantidad existente.
5. Revisa subtotales y total, confirma y continúa desde el listado. Compras requieren aprobación antes de recibir y pagar.
6. Selecciona un único almacén y cuenta para todos los artículos. La liquidación completa abre un comprobante con el desglose y las referencias de inventario de cada producto.

Crear o aprobar no modifica caja ni existencias. Una venta o compra se liquida completa: un movimiento de caja por el total y un movimiento de inventario por producto, todos dentro de la misma transacción junto con su auditoría. Si falta inventario en un artículo o falla la auditoría, se revierte toda la liquidación.

## Importes e integridad

- Cantidades positivas, hasta seis decimales, máximo 1,000,000,000 por artículo. Costos y precios de los nuevos artículos con hasta dos decimales.
- Subtotal por artículo redondeado a centavos; total calculado sumando esos centavos. Se rechazan importes fuera del rango de precisión seguro.
- El servidor comprueba cada producto y contacto, su estado y alcance. No acepta precios enviados por el cliente en ventas ni subtotales/totales elegidos por el solicitante.
- El documento conserva una copia de nombre, SKU, cantidad, precio/costo y subtotal de cada artículo. Cambiar después el catálogo no cambia la operación ya creada.
- La adquisición de bloqueos de inventario sigue el orden de identificadores de producto para operaciones concurrentes. Los reintentos de la misma liquidación recuperan su comprobante sin duplicar cobro o existencias.
- El alta conserva el aviso de respuesta ambigua y bloqueo de repetición; no se añadió idempotencia al alta comercial.

## Compatibilidad

Los documentos históricos y peticiones antiguas de un producto siguen funcionando sin migrar datos. Los documentos nuevos guardan items; los campos productId, quantity y unitPrice/unitCost de nivel superior representan el primer artículo y se conservan para compatibilidad de almacenamiento. Los consumidores actuales del ERP usan items cuando existe y el campo total siempre representa el documento completo.

Listados, aprobaciones, cancelaciones, formularios de liquidación y comprobantes web muestran el desglose. Se actualizaron los contratos y vistas de consulta/liquidación del código móvil para leer estos documentos; el formulario nativo de alta sigue creando un producto y requiere una compilación actualizada para consultar documentos nuevos. No se publicó una nueva aplicación nativa en esta tarea.

Informes e indicadores suman el total del documento; el informe de ventas cuenta las cantidades de todos los artículos y conserva la cantidad histórica de documentos antiguos. La documentación del 16 de octubre sobre operaciones de un solo producto queda superada por esta ampliación.

## Pruebas

Pruebas automatizadas: 434 del backend, 155 web, 150 móvil y 143 de integración MongoDB local. Comprobación TypeScript de los tres espacios y compilación backend/web.

Los casos nuevos cubren contratos estrictos, permisos reales, aislamiento de empresa/sucursal, referencias inactivas, duplicados, redondeo por artículo, límites de total, precios del catálogo, conservación histórica, rollback de inventario/caja/auditoría, solicitudes simultáneas y compatibilidad de documentos antiguos.

Prueba visual con base temporal local y datos ficticios:

| Operación | Resultado |
| --- | --- |
| Compra | 2 sillas × 800 + 3 lámparas × 400 = 2800.00; crear, aprobar, recibir y pagar con comprobante de ambos artículos. |
| Venta | 2 sillas × 1299.50 + 1 lámpara × 650 = 3249.00; crear, cobrar y entregar con comprobante detallado. |
| Inventario | Sillas: 20 iniciales + 2 - 2 = 20; lámparas: 0 + 3 - 1 = 2. |
| Caja | 500 iniciales - 2800 + 3249 = 949.00 de flujo neto registrado. |
| Interacción | Búsqueda automática por SKU, quitar producto conservando otras cantidades, impedir duplicado, cancelar confirmación conservando borrador. |
| Pantalla estrecha | Formulario y confirmación a 390 px sin desbordamiento horizontal. |

No se usó Atlas para crear datos de prueba.

## Límites de esta etapa

Moneda no informada; no se añaden impuestos ni descuentos al documento comercial. No se incorporan pagos parciales, crédito, devoluciones, entregas parciales ni varios almacenes por documento. El catálogo público y chatbot no se convierten en carrito de compras mediante este cambio.
