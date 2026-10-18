# Acciones de retiro y eliminación

Revisión: 18 de octubre de 2026.

La acción «Eliminar del catálogo» retira un registro de las nuevas operaciones mediante su estado INACTIVE. Es recuperable y conserva su identificador, sus datos y las referencias históricas. No borra documentos de MongoDB ni ajusta caja o existencias.

## Revisión de módulos

| Módulo | Acción adecuada |
| --- | --- |
| Productos | Nuevo botón Eliminar junto a Editar; filtros Activos, Retirados y Todos; Restaurar desde Retirados. Desaparece también del catálogo público activo. |
| Clientes y proveedores | Mismo retiro y recuperación desde sus directorios. |
| Categorías y almacenes | Acción existente de desactivación presentada expresamente como Eliminar del catálogo / Restaurar, dentro de Administrar categorías o almacenes. El selector incluye ambos estados. |
| Cuentas | Nuevas acciones Eliminar cuenta / Restaurar cuenta. La cuenta retirada permanece visible, identificada como inactiva y no seleccionable para nuevos movimientos. |
| Ventas y compras | Se mantiene Cancelar registro en estados permitidos. Las liquidaciones y comprobantes no se borran. |
| Caja y movimientos de inventario | Se conserva el historial; las correcciones requieren movimientos explícitos, no eliminación de los movimientos originales. |
| Documentos de venta y producción | Se mantienen Cancelar borrador / Cancelar orden y las restricciones de sus estados finales. |
| Solicitudes, envíos, mantenimiento, calidad, cumplimiento y riesgos | Se mantienen las transiciones de estado permitidas, incluido cancelar donde lo contempla el módulo. |
| Proyectos y oportunidades | Se mantiene su seguimiento por estados; no se añade borrado de su historia operativa. |
| Activos | Se mantiene Retirado en la edición del activo, con advertencia de que es definitivo. |
| Personal, departamentos, usuarios y roles | Se mantienen bajas/desactivaciones y sus protecciones: empleados asignados, usuarios asignados y roles del sistema. |
| Empresa, sucursales, auditoría, informes y avisos | Sin borrado genérico: la estructura, trazabilidad y consultas requieren conservar sus referencias. |

## Controles nuevos

- Los endpoints PATCH /products/:id/status, /customers/:id/status, /suppliers/:id/status y /bank-accounts/:id/status requieren el permiso de edición del módulo.
- Productos se delimitan por empresa; contactos y cuentas por empresa y sucursal. El alcance proviene de la sesión, no del cuerpo de la petición.
- El cliente envía el estado y nombre vistos. El servidor rechaza datos obsoletos, solicitudes duplicadas o registros fuera de alcance.
- Retiro/restauración y auditoría se guardan en una transacción. Auditoría registra DELETE con operación ARCHIVE para el retiro y UPDATE con RESTORE para la recuperación.
- Los botones piden confirmación, permiten cancelar sin modificar nada y se bloquean durante el guardado. Las exportaciones de los directorios respetan también el filtro de estado.

## Verificación

- 434 pruebas del backend y 149 de web aprobadas.
- 130 pruebas de integración con MongoDB temporal local aprobadas, incluidas 20 nuevas de autenticación, autorización, validación estricta, retiro/restauración, aislamiento, auditoría con rollback y concurrencia.
- TypeScript en backend, web y móvil; compilación de backend y web.
- Prueba visual con datos ficticios locales: cancelar retiro, retirar producto con referencias existentes, consultar Retirados y restaurar, conservar nombre en ventas, retirar/restaurar cuenta conservando sus movimientos, ocultar acciones a operador de solo consulta.

## Consideraciones

No se libera el SKU, identificador fiscal o identificador bancario al retirar un registro: se conserva la unicidad y debe restaurarse si se quiere reutilizar. El retiro no elimina existencias. Para completar una operación pendiente que requiera un registro activo, hay que restaurarlo primero. Los estados INACTIVE existentes aparecen como Retirados en los directorios; no se añadió una papelera separada.

La revisión manual no comprende ejecutar cada transición de cada módulo. Los nuevos cambios se concentran en catálogos y cuentas; las otras acciones se revisaron en código y conservan las reglas existentes.
