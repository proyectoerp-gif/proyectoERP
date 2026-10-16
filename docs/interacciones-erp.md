# Interacciones del ERP

Revisión: 16 de octubre de 2026.

## Cambios

- Ventas: selección de cliente y producto activos, cantidad válida, resumen de importe estimado y confirmación explícita. El alta queda pendiente y explica cómo cobrar y entregar.
- Compras: proveedor, producto, cantidad y costo; crear pendiente, aprobar y recibir con pago. Después de aprobar se muestra el filtro de compras listas para recibir.
- Liquidaciones: nombres comprensibles, cuenta y almacén según su propósito, fecha local, revisión de efectos y comprobante al terminar. Se conserva la operación conjunta del servidor y su idempotencia existente.
- Catálogos, caja e inventario: cierre del panel tras confirmar el alta, avisos de resultado y selección compacta de cuentas. Bloqueo adicional de altas simultáneas en catálogos.
- Personal, empresa, permisos, producción, proyectos, mantenimiento, activos, calidad, cumplimiento, riesgos, oportunidades, documentos, envíos y ayuda: confirmaciones accesibles compartidas y señal de operación pendiente en las escrituras. Los formularios operativos notifican el éxito después de confirmar la respuesta.
- Navegación y cierre de sesión esperan durante escrituras pendientes; el navegador advierte al salir durante ellas. Los errores de negocio conocidos muestran la explicación segura del servidor; los errores internos conservan mensajes genéricos.

La confirmación permite cancelar o pulsar Escape sin ejecutar la acción, enfoca inicialmente «Volver y revisar» y rechaza solicitudes simultáneas. Se mantienen permisos, contratos de API y transiciones del servidor.

## Verificación

Pruebas automatizadas: 147 de web y 110 de integración con MongoDB local aprobadas; comprobación TypeScript de backend, web y móvil y compilación de backend/web.

Pruebas manuales en una base MongoDB temporal local, con datos ficticios; sin modificar Atlas:

| Flujo | Resultado observado |
| --- | --- |
| Venta de 3 sillas a 1299.50 | Vista previa 3898.50; cancelar conserva el borrador; confirmar crea un único registro pendiente y cierra el panel. |
| Cobrar y entregar | Selecciones obligatorias; confirmación con cuenta, almacén y fecha; comprobante automático. Existencias de 20 a 17. |
| Compra de 2 sillas a 300 | Alta pendiente 600; aprobación sin movimientos; recepción y pago con comprobante. Existencias finales 19. |
| Conciliación | Caja inicial 500 + venta 3898.50 - compra 600 = flujo neto 3798.50, confirmado en Inicio. |
| Venta de 999 sillas | El cobro se rechaza con «No hay existencias suficientes en este almacén»; flujo de caja permanece en 3798.50. |
| Solicitud de ayuda | Crear, confirmar, cerrar formulario y actualizar de Abierto a En curso; aviso de éxito visible. |
| Pantalla de 390 px | Formulario de venta y confirmación sin desbordamiento horizontal; controles accesibles. |

## Alcance y límites

La revisión manual cubre los flujos de la tabla; no equivale a ejecutar manualmente cada alta y transición de cada módulo. La cobertura restante combina revisión de código y pruebas automatizadas.

Cada documento comercial sigue admitiendo un producto. La moneda no está definida en el contrato y se indica expresamente. No se incorporan pagos parciales, facturación fiscal ni pasarela de pago.

Si la respuesta de crear una venta/compra es ambigua, se bloquea repetir el alta y se pide revisar el listado. No se añadió idempotencia al alta; habilitarla después de revisar sigue siendo una decisión del usuario. En liquidaciones se conserva el mecanismo existente y el reintento con los mismos datos. No se modificó el chatbot ni su modelo de atención guiada.
