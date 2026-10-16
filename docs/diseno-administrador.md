# Diseño del administrador

Implementación del 15 de octubre de 2026 basada en los ocho apartados «PROMPT PARA CODEX» de `Nucleo_Prompts_Administrador_Completo.docx`, proporcionado por el usuario. Los prompts de Figma se usaron únicamente como contexto visual.

## Alcance

La presentación nueva se activa cuando la sesión reúne los permisos existentes `usuarios.editar` y `roles.editar`. Es un criterio de presentación conservador, no un rol nuevo ni una autorización adicional. Cada acción sigue comprobando sus permisos actuales y el servidor mantiene la autoridad. Los operadores conservan la presentación anterior.

No se modificaron modelos, rutas del backend, autenticación, transiciones comerciales, cálculos de caja, movimientos de inventario ni formatos de exportación. Las consultas adicionales de avisos y nombres de categorías usan endpoints existentes con el token y el ámbito de la sesión.

## Apartados aplicados

| Apartado | Resultado |
| --- | --- |
| Inicio | Bienvenida compacta, cinco indicadores reales antes de los accesos rápidos, unidades explícitas, fecha de actualización, guía plegable, hasta tres avisos reales no leídos y navegación contraíble. |
| Ventas y clientes | Listados con columnas y estados legibles; altas en diálogo, selectores plegables y resumen de la operación existente de un producto. Clientes en diálogo. Filtros, oportunidades y documentos conservan sus acciones y advertencias fiscales. |
| Compras | Nueva orden como acción principal; listado con proveedor, producto, importe y estado. Se mantiene el flujo de aprobación, recepción y pago. Proveedores usan el mismo patrón de catálogo. |
| Productos e inventario | Producto y categoría en diálogos, búsqueda compacta de categoría, nombres de categorías consultados al servidor; existencias, almacenes e historial separados. Movimiento y almacén tienen formularios independientes; configuración del umbral plegable. |
| Caja e informes (preliminar) | Movimientos antes que cuentas, tablas legibles y altas separadas. Se conservan informes, consultas, filtros y exportaciones existentes; no se añade contabilidad ni saldo bancario calculado. |
| Equipo y empresa (preliminar) | Filtros y campos consistentes, altas de personal, departamentos y accesos en diálogo cuando están autorizadas; estructura de empresa y gestión de permisos conservadas. |
| Operación y control (preliminar) | Filtros compactos y formularios existentes en diálogos identificados en proyectos, entregas, mantenimiento, calidad, activos, riesgos, cumplimiento y soporte. Producción conserva sus acciones sensibles y recibe organización visual de filtros. |
| Apariencia (preliminar) | Estética oscura petróleo/marino, acento actual, vista previa y controles consistentes. Se conservan modo claro, colores, tipografías, claves de almacenamiento y preferencias guardadas. |

## Accesibilidad e interacción

- Diálogos nativos para altas y formularios operativos: fondo inerte, Escape, navegación con teclado y título accesible. Se impide cerrar mientras el formulario informa un guardado en curso.
- Las altas conservan el borrador al cerrar dentro de la misma pantalla. Los formularios de edición y operación mantienen su ciclo de vida previo al cancelar; no prometen persistencia al cambiar de sección.
- Tablas con título accesible, encabezados por columna y etiquetas visibles en su presentación de tarjetas para móvil. Los estados incluyen texto, además del color.
- El panel de apariencia conserva su control de foco y vuelve inerte el contenido del administrador mientras está abierto.
- Se mantienen búsquedas, paginación, validaciones, confirmaciones, errores y mensajes de resultado existentes.

## Validación

- TypeScript: backend, web y móvil sin errores.
- Web: 138 pruebas aprobadas, incluidas cinco para ámbito de presentación, unidades de indicadores, estados, estructura de diálogos y semántica de tablas.
- Compilación web de producción aprobada. Persiste la advertencia de Vite sobre un paquete JavaScript mayor de 500 kB; dividirlo corresponde a una optimización posterior.
- Revisión manual con API y MongoDB temporales locales y cuentas ficticias separadas de Atlas: inicio con indicadores y aviso reales de esa base, navegación contraída, venta pendiente de un producto, alta y búsqueda de cliente, apertura de edición, orden de compra, categoría de producto, existencias, historial, formulario de movimiento, caja, equipo, proyecto y apariencia.
- Verificados Escape, retorno de foco y conservación de borrador en alta de cliente; mensajes de creación visibles dentro del diálogo.
- Revisados 1440, 768 y 390 píxeles. Inicio, ventas y diálogo móvil sin desbordamiento horizontal de la página; menú móvil y tablas en tarjetas accesibles.
- Sesión de operador comprobada: sin estilos de administrador, navegación limitada a sus áreas y sin indicadores de caja, compras o personal.

La revisión visual no equivale a ejecutar manualmente cada operación del ERP. No se hicieron pagos, liquidaciones, cambios de permisos ni modificaciones de datos de Atlas para probar el diseño. Las capturas locales muestran datos ficticios de una base temporal.

## Archivos principales

`apps/web/src/adminWorkspace.css` contiene los estilos limitados al administrador; `AdminUi.tsx` comparte diálogos, tablas y selectores; `adminPresentation.ts` concentra el criterio de presentación y formatos; `AdminNotices.tsx` consulta avisos existentes. `main.tsx` integra el diseño con los componentes actuales de cada área. Las pruebas nuevas están en `apps/web/tests/adminPresentation.test.ts`.
