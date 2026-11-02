# Auditoría de Núcleo ERP / ProyectoChatbot

Actualización posterior: ver [correcciones y pendientes](correcciones-auditoria-2026-11-02.md). Los hallazgos siguientes conservan la evidencia del estado auditado, anterior a esas correcciones.

Fecha: 2 de noviembre de 2026, America/Mexico_City. Código local: `ad9f87116649397eacf8abfc40720f3c90ee7368`.

## Dictamen

El proyecto sirve como demo funcional y tiene controles importantes en sus operaciones principales. No lo consideraría listo para recibir operaciones reales de una empresa sin resolver primero las prioridades altas de esta auditoría: una dependencia del servidor afectada por una vulnerabilidad de disponibilidad, duplicación de altas comerciales al reintentar y una política de respaldo externo que no está acreditada.

No encontré evidencia de un acceso público directo a los datos privados del ERP en las rutas revisadas. Esto no equivale a certificar que no existen vulnerabilidades: hay límites de alcance indicados abajo. Las pruebas aprobadas no eliminan los hallazgos de diseño ni las vulnerabilidades publicadas después de escribir esas pruebas.

## Alcance y límites

- Inventario estructural de 57 directorios de módulos del backend y 64 archivos `*Routes.ts`, además del router público de atención demo, autenticación y servicios comerciales.
- Revisión dirigida de autenticación, tenant, roles, permisos, altas comerciales, liquidación, seguimiento, inventario, producción, finanzas, reportes, chatbot, clientes web/móvil, CI, configuración Android y respaldos.
- Ejecución de pruebas automatizadas, compilación, comprobación de tipos y consulta de avisos actuales de dependencias.
- Reproducción adicional de una duplicación de venta contra MongoDB temporal en `127.0.0.1`. Esa instancia se cerró al terminar. No se utilizó Atlas para esta prueba.
- No se modificó código de la aplicación, no se desplegó, no se actualizó ninguna dependencia y no se registraron operaciones en la demo remota.
- No hubo una nueva inspección visual autenticada de cada pantalla ni pruebas manuales completas de cada flujo. La evidencia visual del 20 de octubre es histórica; no se presenta como una verificación actual.
- No se accedió a las consolas de Render/Atlas para verificar planes, permisos efectivos de sus cuentas, red, configuración remota o backups administrados. Dos GET de salud de la URL demo agotaron el tiempo de espera; eso no demuestra por sí solo que el servicio esté caído.
- La rama local contiene cuatro commits por delante de la referencia local `origin/main`. No se actualizó esa referencia ni se verificó qué revisión está desplegada. El dictamen se refiere a este checkout.

## Verificación ejecutada

| Comprobación | Resultado |
|---|---|
| TypeScript: backend, web y móvil | Aprobado |
| Compilación backend y web | Aprobada |
| Pruebas backend | 451 aprobadas, 128 archivos |
| Pruebas web | 163 aprobadas |
| Pruebas móvil | 172 aprobadas |
| Integración MongoDB aislada | 168 aprobadas, 6 archivos |
| Cifrado del respaldo | 1 aprobada; no es una restauración nueva de Atlas |
| Compatibilidad de dependencias de seguridad | 4 aprobadas |
| Configuración de APK | 17 aprobadas |
| Resolución de React por workspace | Web 18.3.1 / móvil 19.0.0, resolución coherente |
| ESLint | Falla: no existe `eslint.config.js/mjs/cjs` compatible con ESLint 9 |
| Repetición idéntica de alta de venta | Dos documentos distintos; hallazgo A02 confirmado |

En total se aprobaron 976 comprobaciones de las suites enumeradas, más la reproducción diagnóstica separada. El primer intento del backend falló antes de ejecutar pruebas por un `EPERM` del sandbox al renombrar caché; la repetición autorizada fuera de esa restricción sí pasó.

## Hallazgos prioritarios

### A01 · Alta · Dependencia HTTP con riesgo de caída antes de autenticar

**Evidencia:** `package-lock.json` fija `body-parser` 1.20.8 a través de Express 4.22.3. En [app.ts](../backend/src/app.ts:21) se monta `express.json({ limit: '1mb' })` antes de las rutas y no se deshabilita `inflate`. También hay `express.urlencoded` en las rutas de verificación de correo.

El aviso [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828), publicado el 22 de octubre, describe una caída del proceso con solicitudes comprimidas especialmente construidas; afecta a versiones anteriores a 1.20.9. El límite de tamaño JSON y los permisos de las rutas no corrigen este problema del descompresor previo a la autenticación.

**Acción:** actualizar el árbol de Express/body-parser a una versión corregida y probar las rutas JSON y de formularios. Si no se necesitan cuerpos comprimidos, evaluar además `inflate:false` en ambos parsers y responder correctamente a las solicitudes rechazadas. No se envió una carga de ataque al servicio remoto.

### A02 · Alta · Reintentar una venta o compra puede crear otro documento

**Evidencia:** [saleRoutes.ts](../backend/src/modules/ventas/saleRoutes.ts:20) y `purchaseOrderRoutes.ts` no exigen un identificador idempotente de creación. [commercialCreation.ts](../backend/src/core/commercialCreation.ts:9) agrupa creación y auditoría en una transacción, pero cada llamada vuelve a crear el documento. La transacción protege la atomicidad; no deduplica una repetición posterior.

**Reproducción local:** dos llamadas consecutivas a `createAuditedSale` con el mismo cliente y producto produjeron `count:2`, `differentIds:true`, total 20 en cada venta. La reproducción utilizó una base local temporal sin datos reales. Esto es relevante cuando una respuesta se pierde después de que el servidor confirmó la primera escritura.

Los clientes bloquean el formulario ante una respuesta incierta y piden revisar el listado, lo que mitiga errores de usuario. Sin embargo, cerrar/reabrir, otra pestaña o un cliente de API pueden volver a enviar el alta.

**Acción:** aplicar un identificador persistente de solicitud, huella del payload e índice único por contexto, devolviendo la respuesta original al repetir. Ya hay un patrón reutilizable en `finanzas/financeIdempotency.ts`. Cubrir ventas y compras primero y revisar después otras altas operativas.

### A03 · Alta para datos reales · Respaldo externo y frecuencia no acreditados

**Evidencia:** [backup-local.mjs](../backend/scripts/backup-local.mjs:19) guarda archivos en `backups` y la clave en `.backup-keys`, dentro de esta computadora. Los archivos de respaldo local observados corresponden al 14 de octubre; no hay un calendario de respaldo implementado en los workflows inspeccionados. El servicio de recuperación declara explícitamente `not_configured`.

El cifrado y la prueba de restauración local existentes son positivos. Aun así, perder el equipo o sus carpetas puede eliminar simultáneamente el respaldo y la clave. No se verificó si Atlas cuenta con una protección adicional contratada o habilitada.

**Acción:** definir almacenamiento externo, copia de recuperación de la clave separada, frecuencia, retención, responsable, alerta de fallo y restauraciones periódicas. Para la demo puede seguir siendo una preparación; para datos reales debe existir evidencia de recuperación reciente y objetivos de pérdida/tiempo aceptables.

### A04 · Media · El limitador general no está conectado

**Evidencia:** [rateLimit.ts](../backend/src/middleware/rateLimit.ts:8) define un middleware que no se importa en ninguna otra parte de `backend/src`. El login y las rutas públicas del chat tienen mecanismos propios; no se afirma que carezcan de todo límite.

Las rutas privadas pueden ejecutar consultas y agregaciones repetidas sin un límite general. El login limita por IP en memoria: sus contadores se reinician al reiniciar el proceso y no se comparten entre réplicas. Crear conversaciones públicas tampoco tiene un presupuesto diario global de almacenamiento equivalente al presupuesto de IA.

**Acción:** conectar límites proporcionados por ruta/IP/usuario y definir almacenamiento compartido si hay varias instancias. Mantener límites distintos para login, catálogo, exportaciones, escrituras y chat. No conectar el middleware existente sin corregir también su retención de entradas: su mapa no elimina globalmente IP antiguas.

### A05 · Media · Hay resúmenes auxiliares con datos fijos que se presentan como saludables

**Evidencia:** [budgetPlanningService.ts](../backend/src/modules/budgetPlanning/budgetPlanningService.ts:19) devuelve cifras constantes como 420000 y 395600 y `status:'healthy'`. Su [ruta](../backend/src/modules/budgetPlanning/budgetPlanningRoutes.ts:11) solo pide `dashboard.ver`, no restringe el entorno demo. `maintenancePlanningService.ts` y `fleetManagementService.ts` también contienen cifras y fechas fijas.

No debe confundirse esto con los módulos operativos de mantenimiento, activos o producción que sí tienen persistencia. Tampoco significa que estas pantallas auxiliares aparezcan actualmente en el menú principal: sus endpoints están registrados y disponibles con permisos.

**Acción:** devolver `not_configured` y valores vacíos cuando no exista una fuente real, o restringir explícitamente estos ejemplos a demo y marcarlos como ficticios. Conectar métricas reales antes de usarlas para decisiones. Revisar los demás servicios de resumen del mismo patrón.

### A06 · Media, con avisos de severidad alta · Actualización de dependencias pendiente por entorno

**Evidencia de `npm audit --omit=dev`:**

| Consulta | Paquetes afectados | Desglose |
|---|---:|---|
| Monorepo completo | 36 | 4 altos, 31 moderados, 1 bajo |
| Workspace backend | 4 | 2 altos, 2 moderados |
| Workspace web | 1 | 1 moderado |

Son resultados de paquetes afectados, no 36 ataques independientes ni 36 vulnerabilidades explotables en el navegador. Los resultados de workspaces se solapan; no deben sumarse.

Además de A01, el backend tiene Zod 3.25.76 marcado por [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). El aviso afecta validaciones de colecciones grandes; hay límites de cuerpo y varios límites de listas que reducen exposición, pero no se demostró que todos los caminos sean seguros. La explotación concreta del ERP no fue reproducida.

`node-forge` 1.4.0 y `undici` 6.29.0 aparecen en el árbol de herramientas Expo. No se los atribuye automáticamente al JavaScript de la web ni al runtime HTTP de Render. El resultado web incluye `minimatch`; hace falta rastrear su uso real de compilación antes de asignarle impacto de navegador.

**Acción:** priorizar el backend expuesto y después una actualización compatible de Expo/React Native y herramientas. No ejecutar `npm audit fix --force` indiscriminadamente: propone cambios mayores e incluso cambios incompatibles de SDK. La CI consulta backend/web, pero no añade una auditoría específica del árbol móvil.

### A07 · Media · Falta ciclo de vida de contraseña y cierre de sesión del servidor

**Evidencia:** las rutas de usuarios permiten altas, renombrado, cambio de rol y activación; las de auth permiten login, perfil y verificación de correo. No encontré endpoints de cambio de contraseña, recuperación, renovación o logout con revocación. La web cierra sesión descartando su estado local.

La sesión expira por defecto a los 15 minutos y los cambios de acceso incrementan `sessionVersion`; esos controles sí existen. El punto pendiente es que el usuario no puede rotar desde el sistema una contraseña que sospecha expuesta, y un token copiado no se revoca por pulsar el logout local.

**Acción:** añadir cambio con comprobación de contraseña actual y revocación de sesiones, recuperación con token de un uso y límites, y una política explícita de logout. Decidir si habrá renovación de sesión; no ampliar la duración del JWT simplemente para evitar volver a iniciar sesión.

### A08 · Media · Conviven endpoints antiguos sin paginación y flujos con garantías distintas

**Evidencia:** [saleRoutes.ts](../backend/src/modules/ventas/saleRoutes.ts:18) conserva un GET que devuelve todas las ventas, además de `/page`. Existen patrones equivalentes en compras, usuarios, reportes y otros catálogos. El endpoint legado `/transfers` crea un registro pendiente, mientras `/stock/transfers` ejecuta el movimiento real.

En [transferRoutes.ts](../backend/src/modules/inventario/transferRoutes.ts:15), la creación y `logAuditEvent` son escrituras separadas: si el registro se guarda y la auditoría falla, el cliente puede recibir error después del alta. Notificaciones tiene un patrón separado similar. Esto no invalida las transacciones ya implementadas en caja, stock y seguimiento comercial.

**Acción:** deprecar o acotar los listados sin límite; documentar y unificar las transferencias; agrupar en transacción las escrituras con auditoría que necesiten la misma garantía. No eliminar endpoints antiguos hasta confirmar sus consumidores.

### A09 · Media; bloquea una publicación formal · El APK release usa firma de desarrollo

**Evidencia:** [build.gradle](../apps/mobile/android/app/build.gradle:108) utiliza `signingConfigs.debug` para release. Los dos `debug.keystore` estándar figuran en Git. La configuración Android incluye además permisos de almacenamiento y `SYSTEM_ALERT_WINDOW`, que deben justificarse para un APK distribuido, y `allowBackup=true`.

Esto ya se documentaba como APK de pruebas y no constituye una filtración de una clave privada de producción propia. Aun así, esa firma compartida no sirve como identidad privada controlada para una distribución formal. No se generó otro APK durante esta auditoría.

**Acción:** preparar firma propia y custodia fuera del repositorio, plan de actualización desde el APK demo y revisión del manifiesto fusionado de release para minimizar permisos. Evaluar qué archivos se respaldan automáticamente; no asumir que las preferencias y los identificadores de reintento son credenciales.

### A10 · Media · Lint configurado pero no ejecutable ni exigido por CI

**Evidencia:** `npm run lint` falla con ESLint 9.39.5 porque no encuentra `eslint.config.(js|mjs|cjs)`. El comando raíz se detiene en backend, de modo que no llega a web. La [CI](../.github/workflows/ci.yml) ejecuta tipos, build y pruebas, pero no lint.

**Acción:** añadir configuración compatible, resolver los errores que detecte e incluir el comando en CI. Mantener una comprobación separada de la web; no considerar que TypeScript sustituye todas las reglas de análisis estático.

### A11 · Media si se usa para cierres diarios · Los informes cortan periodos en UTC

**Evidencia:** [reportPreview.ts](../backend/src/modules/reportes/reportPreview.ts:5) usa `setUTCHours(0,0,0,0)` y devuelve `timezone:'UTC'`. No utiliza una zona horaria de la empresa. Para un negocio en Ciudad de México, una venta de las 20:00 puede caer en el día UTC siguiente; los registros de caja introducidos como fecha local siguen otra base.

Es una limitación declarada en los datos del reporte, no una corrupción de las transacciones. El problema aparece si «hoy» se interpreta como día de operación local.

**Acción:** configurar zona por empresa y convertir sus límites de periodo a UTC al consultar timestamps. Definir coherencia con las fechas de movimientos de caja e indicar el huso en interfaz y exportaciones. Probar medianoche, fin de mes/año y zonas con cambios estacionales.

### A12 · Baja · Versiones y estado publicado difíciles de verificar

**Evidencia:** [app.ts](../backend/src/app.ts:28) devuelve constantes `release:'2026.10.13.1'` y `mobileVersion:'1.0.3'`, aunque la configuración nativa local es 1.2.1. Las referencias locales muestran cuatro commits sin incorporar a `origin/main`, pero no prueban el estado actual remoto.

**Acción:** generar metadatos de versión al compilar y mostrar entorno/revisión real; separar versión de API, web y APK. Registrar qué commit y artefacto se promocionan a cada entorno. No desplegar los commits locales automáticamente por esta auditoría.

## Estado funcional por áreas

| Área | Evaluación de lo revisado | Pendiente principal |
|---|---|---|
| Login, usuarios y roles | Autenticación real; permisos del servidor, filtros tenant y revocación por versión | A07 y revisión de límites |
| Empresa, sucursales y departamentos | Persistencia y controles de concurrencia | Prueba manual completa con varios perfiles/sucursales |
| Clientes, proveedores, productos y categorías | Catálogos persistentes, filtros y retiro recuperable | Estandarizar endpoints y altas repetidas |
| Ventas y compras | Varias líneas, estados, creación auditada y seguimiento | A02 |
| Cobros, pagos, devoluciones y reembolsos | Servicios transaccionales e idempotencia de movimientos | Conciliación operativa y E2E de casos ambiguos |
| Caja y cuentas | Escrituras auditadas e idempotencia de movimientos | Moneda y alcance contable: no sustituye contabilidad completa |
| Stock y almacenes | Movimientos, conteo y transferencias con pruebas reales locales | A08 y límites de consultas |
| Producción | Materiales, consumo y entregas parciales dentro de transacciones | Prueba funcional de negocio y costeado según necesidades reales |
| CRM y proyectos | Alta, seguimiento y control de estado | No asumir conversión automática a venta ni planificación completa |
| Logística | Seguimiento persistente de envíos | Estado logístico no mueve stock/caja; la interfaz lo advierte |
| Facturación | Borradores internos y cancelación | No emite CFDI ni tiene timbrado; la interfaz lo advierte |
| Personal | Empleados, departamentos y acceso asociado | No equivale a nómina |
| Activos, mantenimiento, calidad, riesgos y obligaciones | Registros y transiciones operativas | Los resúmenes auxiliares no siempre son las mismas fuentes: A05 |
| Solicitudes de ayuda | Tickets persistentes y cierre con resolución | Responsables/SLA/notificación de respuesta según uso futuro |
| Avisos | Bandeja IN_APP operativa | EMAIL/PUSH quedan PENDING; no se encontró un despachador |
| Informes e historial | Permisos de fuente, exportación y auditoría de muchas escrituras | A08, A11; no todas las auditorías son atómicas |
| Tienda y chatbot | Catálogo público, FAQ, IA con cuotas y derivación a ticket | Solo demo; hardcode del negocio y conocimiento; no atención productiva multinegocio |
| Integraciones e IA interna | Registro de configuración/solicitudes | Conectores externos y ejecución de insights no implementados como servicio completo |
| Analítica y recuperación | Declaran `not_configured`, sin inventar cobertura | Conectar mediciones y política operativa |
| Otros resúmenes auxiliares | Se revisó su registro/protección y una muestra de datos fijos | Presupuestos, flota, planificación, cadena de suministro, sostenibilidad y otros deben explicitar modo demo o fuente real |
| Web | Compila, tipos y 163 pruebas pasan | Bundle principal de 915.15 kB sin comprimir; separar por páginas; falta E2E visual actual |
| Android | Configuración, versiones de React y pruebas pasan | A09; revisión actual en dispositivos y accesibilidad con lector de pantalla |
| CI y despliegue | Tipos/build/pruebas/integración aislada presentes | A01/A06 bloquearán auditorías; añadir lint, gestión de releases y evidencia remota |

## Controles que conviene conservar

- La autorización efectiva no depende únicamente de ocultar botones: se verifica en el backend.
- `authenticate` vuelve a consultar al usuario activo y su `sessionVersion`; el tenant procede de esa sesión.
- Los cambios de rol impiden conceder permisos que el actor no tiene y revocan sesiones de usuarios afectados.
- Caja, inventario, liquidaciones y varias operaciones mantienen escritura y auditoría juntas mediante transacciones.
- El seguimiento comercial valida saldo, cantidades, versión e identificador de solicitud; tiene pruebas de concurrencia contra MongoDB local.
- El chatbot no dispone de herramientas para cobrar, vender o escribir libremente en el ERP. Usa conocimiento público y cuotas persistentes antes de llamar al proveedor; los reintentos de IA no llaman de nuevo al proveedor.
- La demo del chat está restringida por `ERP_ENVIRONMENT`; no se habilita automáticamente en producción.
- No se encontró uso de `dangerouslySetInnerHTML`/`eval` en los clientes revisados; los tokens de sesión del ERP no se guardan en `localStorage`.
- Las exportaciones tienen límites y pruebas de paginación; los documentos de venta se presentan como borradores no fiscales.

## Orden propuesto de corrección

1. Corregir A01 y actualizar de forma controlada las dependencias expuestas del backend. Repetir tipos, integración y pruebas después de actualizar.
2. Extender idempotencia a altas de venta/compra y probar reintentos simultáneos y después de una respuesta perdida.
3. Acreditar respaldo externo reciente y restauración antes de introducir datos empresariales reales.
4. Conectar límites generales, aislar datos ficticios y reducir rutas antiguas o ambiguas.
5. Completar contraseñas/logout, firma Android propia y zona horaria de informes.
6. Reparar lint e incorporarlo a CI; añadir recorridos E2E por perfil y mejorar la trazabilidad de versiones.

No recomiendo seguir sumando módulos antes de cerrar los tres primeros puntos. El siguiente trabajo útil es una ronda de corrección y validación, manteniendo el alcance de demo hasta entonces.
