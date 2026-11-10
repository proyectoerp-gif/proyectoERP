# Pulido de usabilidad del ERP y editor de moda

9 de noviembre de 2026, America/Mexico_City. Sin migración, reseed ni escrituras de prueba contra Atlas. Producción permanece manual; publicación de cambios probados únicamente en demo.

## 1. Nombres comprensibles

- La página de empleados adjunta el nombre de cada departamento vinculado, consultando solo los IDs de esa página, dentro de la misma empresa y sucursal. Incluye departamentos inactivos para conservar el contexto histórico.
- La página de usuarios adjunta el nombre del rol del sistema o de la empresa. Un vínculo a un rol ajeno devuelve nombre no disponible; no concede acceso adicional a su contenido.
- Tablas y exportaciones de empleados/usuarios utilizan esos nombres. Los identificadores originales permanecen en detalles de referencia. La reasignación de departamento también muestra su nombre.
- Los permisos de usuarios se presentan con las etiquetas españolas ya existentes, sin modificar los permisos guardados. Se tradujeron estados ACTIVE/INACTIVE en selectores de categorías y almacenes.
- Los listados comerciales, catálogo, existencias y producción ya disponían de mecanismos de nombres; se conservaron sus controles y referencias históricas.

## 2. Formularios

- `ValidatedInput` conserva restricciones nativas y presenta mensajes españoles junto al campo para obligatorios, longitudes, correos, rangos y decimales, con asociaciones accesibles y foco en el primer control inválido. Aplicado a altas/edición del catálogo, empleados y alta de usuarios.
- Se añadieron ejemplos en campos de catálogo y personal. La edición de precio utiliza control numérico y precisión de dos decimales; el SKU sigue conservándose.
- Las ediciones de empleado, departamento y usuario utilizan las ventanas compartidas. Cancelar la edición de catálogo o empleado/reasignación pide descartar cuando hay cambios. El cierre superior conserva la protección compartida de borradores; los paneles de alta siguen reteniendo su árbol de formulario al cerrarse.
- Cuando una actualización elimina el botón que abrió la ventana, el foco vuelve al título de la sección después de actualizar el DOM.
- La nueva ficha de moda tiene validación por campo, confirmación antes de guardar y bloqueo de reintentos ambiguos/conflictos hasta actualizar.

## 3. Tablas y acciones

- Personal y accesos usan la tabla accesible y adaptable compartida: nombre, departamento/rol, estado y acciones. Encabezados y etiquetas móviles se conservan.
- Alta y descarga agrupadas en una barra, con el alta primero. Búsquedas vacías sugieren ajustar filtros.
- `DirectoryPagination` unifica Anterior/Siguiente/Actualizar, número de página y cantidad en personal, usuarios, catálogo y selectores de categorías/almacenes. Deshabilita navegación durante carga y cuando faltan páginas.
- Se mantienen las tablas y agrupaciones ya existentes en ventas/compras y sus controles de transición, exportación e historial. Este trabajo no reescribe todos los módulos ni afirma una auditoría exhaustiva de cada campo del ERP.

## 4. Flujos y perfiles

- 187 pruebas de integración con replica set MongoDB localhost temporal: operaciones de varios artículos, venta/cobro/entrega/devolución/reembolso, compra/aprobación/recepción/pago, inventario, cancelaciones, concurrencia, idempotencia y fallos de auditoría. Las suites existentes comprueban autenticación, permisos de consulta frente a escritura y aislamiento por empresa/sucursal; los perfiles se definen por permisos, no por su nombre visible.
- Se añadieron casos del editor de moda: rechazo de lector/no autenticado/otra empresa, valores inválidos y tallas duplicadas; rechazo de versión anterior; auditoría atómica y rollback; preservación de SKU, precio y categoría.
- Se añadieron casos de nombres de directorio con departamento inactivo, vínculo de otra sucursal y rol de otra empresa, sin exponer credenciales.
- 464 pruebas unitarias backend y 168 web aprobadas. Compilación, lint y typecheck del monorepo aprobados. Los workers unitarios requirieron ejecución fuera del aislamiento de Windows; no se deshabilitaron pruebas.
- Revisión de navegador con sesión administradora ficticia y API/base temporal propias: tablas con nombres, edición inválida, descarte, guardado y reapertura real de ficha de moda, ausencia de tallas, claro/oscuro, móvil de 390 px sin desbordamiento horizontal. No sustituye una prueba visual de cada perfil/módulo; la autorización operativa se cubrió mediante las suites API.

## 5. Albor Moda

En Productos y categorías, cada producto editable tiene **Ficha de moda**. Tras crear un producto se completa desde esa acción: colección, tipo de prenda, tallas, nombre/muestra de color, material y descripción. Puede asignarse a productos sin ficha y editar las prendas existentes.

`PATCH /products/:id/apparel` exige `productos.editar`, toma la empresa de la sesión y compara la ficha original antes de actualizar. El cambio y su auditoría se confirman en una transacción; un error de auditoría revierte la ficha. Solo modifica `apparel`; conserva precios, SKU, imágenes, documentos, referencias y stock. La edición general del producto tampoco elimina su ficha.

Las tallas siguen siendo descriptivas, como el modelo actual: no se añadieron variantes con inventario propio, reservas, pagos ni stock inventado. Las prendas activas publicadas en Albor Moda reflejan los datos editados en consultas posteriores. Este editor no ejecuta la preparación/sustitución del catálogo demo.
