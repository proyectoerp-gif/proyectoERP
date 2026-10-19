# Albor: identidad, catálogo y exportaciones

## Entornos

Proyecto Render: **ProyectoChatbot**, con dos servicios en Demo y dos en Producción. Los nombres de servicio comienzan por `proyectochatbot-`. El Blueprint **ProyectoChatbot-produccion** conserva Auto Sync = No y no se sincronizó ni se desplegó producción para este cambio. Renombrar no modificó las URLs.

La empresa ficticia, la tienda, el asistente y sus fuentes se llaman **Albor Oficina y Hogar**. Se conservaron los IDs de empresa/sucursal y los accesos existentes. Los correos de acceso ya creados no se renombran.

## Carga demo

`npm --workspace backend run demo:catalog` conecta con la configuración local existente, sin imprimir credenciales. Requiere entorno demo y base `erp_app`, y verifica la empresa y sucursal fijas antes de escribir. Añade 4 categorías (mobiliario, papelería, organización e iluminación/hogar) y 12 productos con SKU `ALB-...`. Conserva los registros anteriores, precios editados y productos retirados. No crea existencias, ventas ni movimientos de dinero.

Toda la carga y su auditoría se guardan en una transacción. Repetirla no duplica los productos. Una categoría de ejemplo retirada aborta la transacción para evitar reactivarla silenciosamente. Las credenciales de producción no se usan.

## Descargas web

- PDF directo y Excel en todos los botones existentes de descarga de documentos y catálogos.
- Listados completos de ventas, compras, existencias, historial de inventario, cuentas, caja, categorías, almacenes, empleados, departamentos, usuarios y auditoría.
- Documento individual de venta/compra, comprobante conjunto y seguimiento de pagos, entregas y devoluciones.
- Se conservan las descargas ya disponibles de facturación, informes, organización, roles y módulos operativos.

Las listas recorren todas las páginas con los filtros **aplicados**, con cancelación, límite de 10,000 registros y rechazo de páginas repetidas o registros duplicados. Una consulta fallida no produce un archivo parcial. Se usan las mismas APIs y permisos de lectura de cada módulo; no hay endpoints públicos nuevos ni exportación de contraseñas.

Los documentos de ventas/compras contienen todos sus artículos y muestran el total original solo una vez. El estado inicial no implica que pagos o entregas parciales estén completos. El seguimiento refleja los saldos y movimientos confirmados. Los PDFs no son comprobantes fiscales. No se inventa moneda ni unidad de medida.

Excel conserva números y texto literal, filtros y una hoja de información. PDF carga su generador al pulsar el botón, utiliza cabeceras repetidas, saltos de página, pie y numeración.

## Comprobaciones

163 pruebas web; 168 pruebas de integración MongoDB local y 451 pruebas backend. Incluyen paginación completa, cancelación, duplicados, límite, ventas con varios productos, PDF multipágina, Excel numérico y texto que comienza con signo igual. La carga se probó contra otra empresa, al repetirla y con rollback por categoría retirada. Se verificaron descargas reales desde el navegador y la presentación de un PDF de ventas.
