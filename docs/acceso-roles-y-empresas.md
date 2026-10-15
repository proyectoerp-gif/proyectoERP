# Verificación de roles limitados y aislamiento

Se agregó una suite HTTP con Express, autenticación real, contraseñas bcrypt, JWT y MongoDB temporal. No se simulan los middleware de autenticación, permisos o contexto de empresa en esta suite. Se ejecuta mediante `npm.cmd --workspace backend run test:stock:local` y también en GitHub Actions.

## Entorno de prueba

- Dos empresas y tres sucursales: dos sucursales de una empresa y una de la otra.
- Ocho usuarios y roles ficticios: lector comercial, lector de otra sucursal, lector de otra empresa, consulta financiera, acceso solo al panel, editor comercial, usuario para pruebas de revocación y administrador delegado de usuarios.
- Clientes, ventas, caja, productos y reportes con valores distintos para detectar cruces de datos.
- MongoDB debe ser un replica set en localhost, sin credenciales ni base indicadas por el llamador. Cada archivo usa una base nueva con nombre aleatorio y elimina únicamente esa base al terminar. No se crean usuarios de prueba ni se modifican datos en Atlas.

## Resultados y correcciones

Se detectaron dos caminos que permitían consultar cifras sin el permiso específico de su área:

1. El panel devolvía ventas, compras, caja y empleados a cualquier usuario con `dashboard.ver`.
2. Las vistas y snapshots de reportes usaban únicamente `reportes.ver`, sin comprobar acceso a ventas, finanzas o inventario.

El panel ahora comprueba cada origen antes de consultarlo. Un permiso de escritura no sustituye al de lectura.

| Indicador | Permiso de origen |
|---|---|
| Ventas | `ventas.ver` |
| Compras | `compras.ver` |
| Flujo de caja | `finanzas.ver` |
| Empleados activos | `rrhh.ver` |
| Productos activos del catálogo | `productos.ver` |

`dashboard.ver` sigue siendo necesario para abrir el panel. Los indicadores no autorizados son `null`: no se consulta su colección y no se presentan como cero. Los widgets omiten esos datos. Web, móvil y CSV admiten los indicadores restringidos; el CSV no incluye filas ocultas. Si no hay indicadores permitidos, el cliente lo explica.

Los reportes requieren `reportes.ver` y además `ventas.ver` para ventas, `finanzas.ver` para caja/finanzas o `inventario.ver` para inventario. La lista de snapshots guardados aplica los tipos permitidos directamente en la consulta a MongoDB, junto con empresa y sucursal. El cliente muestra solo las opciones de periodo que puede consultar. Un usuario con reportes pero sin permiso de panel no recibe una consulta automática al panel.

## Cobertura HTTP comprobada

- Lecturas de clientes y ventas separadas por empresa y sucursal.
- Catálogo de productos separado por empresa. Es intencionalmente compartido entre sucursales de la misma empresa; no representa existencias de almacenes.
- Dieciocho rutas de escritura rechazan al lector antes de modificar datos o crear auditoría.
- Un editor no puede modificar contactos de otra sucursal/empresa ni crear ventas con clientes o productos ajenos. La inyección de empresa por cuerpo se rechaza; cabeceras de empresa/sucursal no cambian el contexto de sesión y las páginas rechazan filtros de ámbito no admitidos.
- Un administrador delegado no puede crear un usuario ADMIN, crear roles con permisos que no posee ni renombrar usuarios de otra sucursal. Los directorios no devuelven hashes de contraseña, versiones de sesión ni secretos de verificación.
- Retirar permisos en MongoDB afecta inmediatamente al token previo; los permisos incluidos en el JWT no sustituyen los actuales del usuario.
- Desactivar un usuario, revocar su sesión, alterar el token o firmarlo con otro contexto de empresa impide usarlo. La prueba de firma usa exclusivamente una clave local ficticia.
- Paneles, widgets, vistas de reportes y snapshots no revelan fuentes no autorizadas.

La suite de integración tiene 97 pruebas: las 86 existentes de operaciones/transacciones y 11 de acceso HTTP real. Se mantienen las pruebas unitarias de permisos y las de aislamiento de servicios previas. Esta revisión cubre los casos enumerados; no certifica una prueba exhaustiva de todas las combinaciones de endpoints, roles, navegador y dispositivos.

Las apps antiguas con acceso limitado pueden mostrar un error al recibir indicadores `null`; necesitan la versión actualizada. El administrador con permisos completos sigue recibiendo sus cifras. La web se publica por Render; el código móvil requiere una nueva compilación para dispositivos instalados.
