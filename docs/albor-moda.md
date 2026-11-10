# Albor Moda: catálogo de demostración

La tienda pública `/tienda` usa el catálogo activo de la empresa ficticia `company-promaxima-demo`. Incluye 20 diseños conceptuales en seis categorías, precios MXN, filtros por colección/talla/color/precio, orden por precio con paginación y favoritos locales (máximo 40).

## Editor de prendas

En **Productos y categorías → Ficha de moda**, el personal con `productos.editar` puede completar o editar colección, tipo de prenda, tallas descriptivas, color/muestra, material y descripción. Para un producto nuevo, guarda primero sus datos generales y después abre su ficha. La escritura compara la ficha original y registra auditoría en la misma transacción; ante conflicto se debe actualizar el catálogo. No altera precio, SKU, imágenes, documentos ni existencias. Las tallas son descriptivas; no existe stock independiente por talla.

Las fotografías editoriales son de inspiración CC0; las prendas son ilustraciones vectoriales originales, sustituibles por las imágenes que se suban desde Productos y categorías. Las tallas y materiales son ficticios y no representan existencias ni medidas verificadas. No hay compra, reserva o pago público.

## Preparación recuperable

Un administrador con `productos.editar` y `roles.editar` puede usar **Productos y categorías → Preparar catálogo de moda de la demo → Revisar cambio de catálogo**. La confirmación muestra el número real de registros afectados.

La operación solo admite entorno `demo`, base `erp_app`, empresa y sucursal de demo. Comprueba una huella de la vista previa y aplica una transacción: renombra la empresa, retira productos/categorías activos anteriores, crea seis categorías y 20 prendas y guarda en auditoría los IDs anteriores. Una segunda petición no vuelve a modificar registros. Una huella desactualizada o un SKU reservado existente bloquean el cambio. Un fallo revierte la transacción completa.

Los registros retirados, imágenes, existencias y referencias comerciales se conservan. Para restaurar un producto anterior, primero restaura su categoría en el filtro Retirados y después el producto. Restaurarlo lo vuelve a publicar en el catálogo público. La operación no asigna existencias a las nuevas prendas.

## Validación

`npm run build`, `npm run lint`, pruebas web con `node --import tsx --test apps/web/tests/*.test.ts`, suite backend y `npm --workspace backend run test:stock:local` (MongoDB localhost aislado). Las pruebas de moda verifican aislamiento, rechazo de producción, huella desactualizada, rollback, conservación, reintento idempotente, filtros y páginas ordenadas por precio.
