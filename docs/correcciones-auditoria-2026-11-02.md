# Correcciones de la auditoría del 2 de noviembre de 2026

Este documento complementa `auditoria-sistema-2026-11-02.md`. Los cambios se implementaron y comprobaron en el proyecto local. No acredita un despliegue en Render ni cambios en la configuración remota de Atlas.

## Estado de los doce hallazgos

| Hallazgo | Estado | Cambio y comprobación |
|---|---|---|
| A01 · Parser HTTP | Corregido | `body-parser` 1.20.9, JSON y formularios sin compresión, respuestas 413/415. Pruebas HTTP con gzip y cuerpos grandes. |
| A02 · Duplicación comercial | Corregido en API y clientes | Las altas públicas de venta/compra exigen `Idempotency-Key`. Recibo único por empresa, sucursal, usuario y operación; respuesta original y conflicto si cambia el payload. Web/móvil conservan la clave antes de enviar. Pruebas de concurrencia, repetición y alteración de datos. |
| A03 · Respaldos | Preparación local completada; protección externa pendiente | Tarea diaria, restauración local de un archivo existente, estado comprobable y resolución DNS alternativa de Atlas. No hay almacenamiento externo disponible. Tampoco se confirmó una copia nueva desde Atlas: la conexión TLS de origen no se estableció desde esta computadora. |
| A04 · Límites | Corregido | Límite general conectado, cuotas de lectura/escritura, login/contraseñas y creación pública de conversaciones. Contadores atómicos con TTL en MongoDB para producción; memoria acotada en desarrollo/pruebas. Cuotas de producción probadas con solicitudes simultáneas. |
| A05 · Métricas ficticias | Corregido | 25 servicios auxiliares sin fuente real devuelven `not_configured`, métricas nulas y listas vacías. Los registros operativos reales permanecen en sus servicios correspondientes. Pruebas anteriores de cifras ficticias sustituidas por comprobaciones de indisponibilidad explícita. |
| A06 · Dependencias | Riesgo alto/moderado corregido; aviso bajo mitigado localmente | Zod 4.6.7 y transitivas corregidas. Auditorías backend/web sin avisos y monorepo sin avisos altos/moderados. `deepmerge` no tiene parche oficial publicado: guardia local contra claves de prototipo con prueba; npm sigue mostrando sus avisos bajos y los de consumidores. |
| A07 · Contraseñas y sesiones | Implementado | Cambio con contraseña actual, recuperación por correo, token de un uso con caducidad, límites y revocación por versión. Logout revoca las sesiones en servidor. Formularios en ambos clientes y recuperación en navegador. Integración prueba contraseña incorrecta, revocación y rechazo del token reutilizado. |
| A08 · Rutas antiguas y auditoría | Corregido en los listados y escrituras revisados | Listados antiguos principales limitados a 201 resultados para rechazar explícitamente más de 200; sin truncamiento silencioso. Nuevo `/reports/page`. Stock limita resultados después de agrupar. Transferencias pendientes, notificaciones y creación de informes agrupan escritura y auditoría en transacción. Se mantiene la distinción entre transferencia pendiente y movimiento real. |
| A09 · Firma Android | Corregido para el nuevo artefacto | Firma privada fuera de Git, release sin alternativa debug, paquete nuevo `com.proyectochatbot.nucleo`, versión 1.3.0/código 8. Manifiesto fusionado sin permisos de almacenamiento externo o superposición; `allowBackup=false`. |
| A10 · Lint y CI | Corregido | Configuración ESLint 9, análisis de backend/web/móvil/shared y ejecución obligatoria en CI. Auditoría móvil y pruebas de compatibilidad de dependencias añadidas. |
| A11 · Zona horaria | Corregido | Zona IANA editable en Empresa y sucursales; México por defecto cuando falta configuración. Periodos convertidos a UTC para timestamps y fechas locales para caja. Zona visible en reportes/exportaciones. Pruebas de medianoche, cambio de año y DST. |
| A12 · Versiones | Corregido | Metadatos generados al compilar: revisión, fecha, versiones API/web/móvil y estado de cambios locales. `/health/version` deja de anunciar constantes antiguas. |

## Resultados de validación

Resultado final: 994 pruebas aprobadas (457 backend, 163 web, 172 móvil, 173 integración MongoDB, 4 de respaldo/DNS, 8 de compatibilidad y 17 de configuración Android). TypeScript, lint, compilaciones y comprobación del lock aprobados. Auditorías npm de backend y web: cero avisos; monorepo: cero altos/moderados y ocho avisos bajos relacionados con deepmerge y consumidores, con la mitigación local indicada.

- TypeScript en los tres espacios de trabajo y lint de las aplicaciones.
- Compilación de backend y web.
- Suites de backend, web y móvil, incluyendo pruebas de validación y permisos existentes.
- Integración contra un replica set temporal propio en localhost: idempotencia de venta/compra, cambio y recuperación de contraseña, revocación, cuotas de producción y rollback de transferencias/notificaciones si falla la auditoría.
- Pruebas de cifrado y resolución DNS segura del respaldo. La restauración del archivo existente verificó 25 colecciones y 23 documentos, con documentos e índices coincidentes. Es una verificación de ese archivo histórico, no una copia reciente de Atlas.
- Pruebas de compatibilidad de PostCSS, UUID, image-size, minimatch/glob y la mitigación de deepmerge.
- Gradle `assembleRelease` completado, firma del APK comprobada, cuatro arquitecturas y una sola instancia de React 19.0.0/React Native 0.79.6 en el mapa del bundle.

No se ejecutaron ventas, pagos, ajustes ni correos de recuperación reales para validar estos cambios. Las pruebas de email utilizan un remitente simulado. La nueva interfaz de seguridad necesita una comprobación manual después de desplegar el backend y los clientes correspondientes.

## Instalación reproducible de dependencias

Usar Node 22 o superior y npm 10.9.8, como CI. `.npmrc` conserva el modo de resolución de peers usado en el lock porque web y móvil usan majors distintos de React. No implica desactivar la auditoría: se verifican por separado la resolución real de ambos renderizadores y las pruebas de compatibilidad.

`npm ci` ejecuta dos adaptaciones versionadas y comprobadas:

1. `legacy-glob-compat.cjs` conserva la interfaz callable que utilizan consumidores antiguos de minimatch con el motor corregido de v11 y evita claves de prototipo peligrosas en deepmerge mientras falta su parche oficial.
2. `metro-image-size-compat.cjs` conserva la adaptación ya existente para image-size y comprueba PostCSS/UUID.

No omitir `postinstall` al preparar un entorno de ejecución o compilación. Durante esta reparación se usó temporalmente `--ignore-scripts` para resolver el árbol y después se ejecutó explícitamente `postinstall`; el lock final contiene las versiones corregidas. Un fallo de estas comprobaciones debe detener la compilación, no ignorarse.

## Respaldos: situación real y siguientes requisitos

La tarea de Windows se llama `ProyectoChatbot-VerifiedBackup`, está registrada para las 09:00, hora local de Windows, y recupera una ejecución perdida cuando el equipo vuelve a estar disponible. Requiere equipo encendido y sesión iniciada; no es un servicio de respaldo administrado en la nube.

Comandos:

```powershell
npm.cmd --workspace backend run backup:scheduled
npm.cmd --workspace backend run backup:health
```

El primero cifra y prueba una restauración local antes de declarar éxito. El segundo devuelve error si no hay respaldo local reciente o no se ha acreditado una copia externa. El resultado se guarda en `backups/scheduled-status.json`; una falla no se presenta como respaldo exitoso. No hay borrado automático de los respaldos existentes.

Se corrigió el fallo de resolución SRV con una alternativa DNS sobre HTTPS exclusiva para Atlas, que consulta solamente nombres públicos y valida que los destinos pertenezcan al dominio esperado. Se mantiene TLS y la validación de certificados. La conexión posterior con Atlas no se confirmó por un fallo TLS desde este equipo; hay que comprobar su acceso de red y la configuración local antes de dar por resuelta la copia nueva. No se abrió la red a `0.0.0.0/0` ni se desactivó TLS.

El usuario confirmó que aún no dispone de almacenamiento externo. Cuando exista, configurar `BACKUP_EXTERNAL_DIRECTORY` con una carpeta sincronizada o una unidad distinta. El script copia únicamente archivo cifrado e inventario; la clave debe conservarse por separado. Una copia de archivos a una carpeta no demuestra que su sincronización remota terminó: por eso el estado mantiene `offsite:false` hasta que se acredite el almacenamiento externo y la recuperación.

Faltan para cerrar A03: conexión de origen disponible, copia reciente de datos reales verificada, destino externo, copia recuperable de la clave, política de retención y comprobación/alerta operativa del destino. La tarea local y el cifrado no reemplazan estos requisitos.

## Contraseñas y correo

- Cambiar contraseña desde Seguridad de mi cuenta en la web o desde Mi cuenta en Android. Se cierran las sesiones anteriores.
- Recuperación: enlace Olvidé mi contraseña; abre un formulario público del backend. El enlace enviado caduca en 15 minutos y es de un uso.
- El envío real necesita `RESEND_API_KEY`, un remitente válido y `EMAIL_VERIFICATION_BASE_URL` o `API_URL` públicos HTTPS correctos para ese entorno. No se incorporan esas claves a web, APK ni Git. No se envió correo real durante las pruebas.
- No hay renovación automática del JWT: se conserva la caducidad corta. Logout y cambio de contraseña revocan todas las sesiones del usuario; si falla la conexión de logout, la interfaz informa que no confirmó la revocación.

## APK y custodia de la firma

Artefacto local: `dist/android/Nucleo-ERP-demo-1.3.0.apk`, con comprobación SHA-256 a su lado. Utiliza la API demo configurada al compilar; no es un APK conectado a producción.

La identidad del nuevo paquete permite instalarlo junto al APK antiguo de pruebas. No se puede actualizar ese paquete antiguo con otra firma conservando su mismo identificador. No se desinstaló la app del usuario ni se migraron sus preferencias locales automáticamente. Los datos de negocio siguen residiendo en el servidor.

La clave privada y su archivo de propiedades se guardaron en `.backup-keys`, ignorada por Git y protegida con los permisos existentes de esa carpeta. Es imprescindible conservar una copia segura separada antes de distribuir la aplicación ampliamente: perder la firma impide actualizar esta identidad de aplicación. Las claves `.p12`, `.jks` y `.keystore` nuevas también están excluidas por `.gitignore`.

## Publicación coordinada pendiente

Estos cambios no están desplegados en Render. Publicar backend y clientes de forma coordinada: los clientes nuevos envían `Idempotency-Key`; los antiguos recibirán un error explícito al intentar crear ventas/compras sin esa clave. Las funciones de seguridad nuevas no existen en un backend anterior.

Antes de promover a producción: verificar variables de correo, zona horaria de la empresa, conectividad, respaldo externo y firma recuperable; desplegar demo, recorrer los flujos con perfiles distintos y después promover la misma revisión a producción manualmente. La auditoría no convierte la facturación interna en emisión fiscal ni implementa los conectores externos que estaban declarados como no configurados.
