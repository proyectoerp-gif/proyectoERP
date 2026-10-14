# Permisos por dominio y cierre comercial

## Comportamiento

`usuarios.ver/crear/editar` solo autoriza administrar usuarios. Los demás dominios
usan sus propios permisos: clientes, proveedores, productos, inventario, ventas,
compras, finanzas, facturación, empresas, departamentos, roles, producción,
mantenimiento, calidad, activos, soporte, riesgo y cumplimiento.

En catálogos y paneles administrativos, `<dominio>.editar` autoriza crear y
modificar registros del dominio. Las lecturas requieren `<dominio>.ver`.
En ventas y compras se separan `<dominio>.crear`, `<dominio>.editar` y
`<dominio>.liquidar`. RRHH, CRM y logística conservan sus permisos de creación
y edición separados. Administrar roles no permite conceder permisos que el
actor no tenga; se mantienen las restricciones sobre roles superiores y propios.

Liquidar exige simultáneamente `ventas.liquidar` o `compras.liquidar`,
`inventario.editar` y `finanzas.editar`. La lectura del comprobante exige el
permiso de lectura de la venta o compra correspondiente. El endpoint compartido
valida el tipo de documento y rechaza valores repetidos o inválidos.

Las consultas de catálogos y selectores necesitan permisos de lectura de esos
catálogos. Por ejemplo, un vendedor que crea ventas necesita `ventas.ver`,
`ventas.crear`, `clientes.ver` y `productos.ver`. Los selectores de liquidación
necesitan `inventario.ver` y `finanzas.ver`. No se concede acceso implícito por
tener permisos de usuarios.

## Transiciones

| Documento | Cambios manuales admitidos |
|---|---|
| Venta pendiente | Cancelar |
| Compra pendiente | Aprobar o cancelar |
| Compra aprobada | Cancelar |
| Documento pagado, recibido o cancelado | Ninguno |

`PAGADA` y `RECIBIDA` solo se alcanzan mediante `/commercial-settlements`,
que guarda documento, existencias, caja, comprobante y auditoría en la misma
transacción. Web y móvil separan los botones de crear, cambiar estado y liquidar,
y eliminan las opciones de marcar pagada/recibida de forma manual.

Los registros antiguos finalizados sin comprobante no se modifican ni se les
generan movimientos automáticamente: hacerlo podría duplicar pagos o stock.
Deben conciliarse con sus movimientos reales si existen.

## Administrador demo existente

La migración local se ejecuta con:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm.cmd --workspace backend run permissions:migrate-demo
```

Solo actualiza el rol ADMINISTRADOR_DEMO de la empresa demo original, tras
comprobar el usuario, rol y auditoría de alta. Conserva los permisos previos y
añade los nuevos del administrador. No concede permisos a otros roles.
Rol, usuarios asignados y evento de auditoría se actualizan juntos. Cambia
sessionVersion para revocar sesiones anteriores; los usuarios deben volver a
iniciar sesión. Repetir la migración no vuelve a revocar sesiones si no cambia
el rol. No modifica contraseñas ni operaciones comerciales.

Los demás roles existentes deben revisarse y recibir únicamente los permisos
de dominio necesarios; los permisos de usuarios ya no sirven de sustituto.

## Validación de esta corrección

TypeScript y build de backend/web aprobados. Pruebas: 369 backend, 146 móvil,
123 web (638 en total), incluyendo autorización real de rutas, liquidación que
exige los tres permisos, bloqueo de cierres manuales antes de persistir y antes
de enviar solicitudes desde clientes, y migración idempotente acotada al demo.
Los tests de migración/servicios usan mocks; no equivalen a una prueba E2E de
una liquidación contra Atlas. La migración del administrador sí se aplicó en
Atlas dentro de una transacción y afectó a una cuenta.

CI ahora ejecuta en main y master, y añade las pruebas web a backend/móvil.
El endpoint /health/version expone release 2026.10.13.1 y, en Render, el commit
desplegado para verificar que la publicación corresponde al cambio.

Las aplicaciones Android ya instaladas deben recompilarse para incorporar los
controles nuevos. La API rechaza los cambios manuales de estado incluso si un
cliente antiguo aún muestra esos botones.
