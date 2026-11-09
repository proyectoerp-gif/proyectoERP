# Formularios y acciones del ERP

Revisión del 8 de noviembre de 2026. Cambios de presentación web; sin migraciones ni modificaciones de datos, permisos o historial. Producción conserva publicación manual.

Se revisaron los puntos de entrada compartidos `AdminCreatePanel` y `AdminActiveForm`, usados en ventas/compras, catálogo, empleados, departamentos, usuarios, caja, facturas, inventario, activos, cumplimiento, mantenimiento, oportunidades, proyectos, calidad, riesgos, envíos y tickets. La corrección se aplica desde estos componentes, sin duplicar ventanas por módulo.

- Encabezado y cierre visibles, contenido con desplazamiento independiente y márgenes uniformes.
- Campos emparejados en dos columnas según el espacio real de la ventana; una columna en móvil. Descripciones, listas, selectores anidados y totales conservan el ancho completo.
- Se eliminó la regla que convertía todo `fieldset` en dos columnas y desplazaba el total del carrito a una columna aislada.
- Venta y compra presentan tres pasos legibles. Sus validaciones, confirmaciones y envío permanecen iguales.
- Acciones de empleados agrupadas con separación; desactivación con estilo de precaución, también en oscuro. Botones de registros, paginación y formularios con márgenes; los grupos existentes mantienen distribución flexible.
- Los formularios usan las variables de superficies, texto, acento y contraste de Apariencia. Ajustes de modo y vista previa con controles separados. Sin cambios de preferencias almacenadas.

Validación: compilación backend/web, lint y 166 pruebas web aprobadas. Revisión visual local representativa del componente real de nueva venta y una composición de campos con el diálogo compartido, en claro/oscuro y viewport móvil de 390 × 844. No se ejecutaron altas comerciales contra Atlas. No equivale a haber guardado registros de cada módulo: el cambio es de presentación compartida. El intento de iniciar MongoDB temporal para una revisión con backend falló al arrancar; la comprobación visual se hizo sin base de datos.
