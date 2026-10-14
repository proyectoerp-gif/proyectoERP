# Auditoría técnica del ERP

Fecha: 13 de octubre de 2026. Carpeta: `C:\Users\iori\Desktop\promaxima`.

## Dictamen

El proyecto tiene una base funcional aprovechable, pero no debe considerarse listo para operar un negocio en producción. Compila y pasa las pruebas disponibles; aun así, existen problemas importantes de autorización, coherencia comercial y despliegue. Parte de los módulos avanzados entrega datos de demostración como si fueran resultados operativos.

La revisión comprende estructura, configuración, rutas HTTP, autenticación, permisos, persistencia, operaciones comerciales, inventario, finanzas, clientes, pruebas, dependencias y despliegue. Es una auditoría del código local con comprobaciones ejecutadas; no es una prueba de penetración, una certificación fiscal ni una revisión exhaustiva de cada flujo de interfaz.

## Comprobaciones ejecutadas

| Comprobación | Resultado |
|---|---|
| Instalación `npm ci --ignore-scripts --no-audit --no-fund` | Correcta; 1.034 paquetes instalados, sin ejecutar scripts de instalación |
| `npm run typecheck` | Correcto en backend, web y móvil |
| `npm run build` | Correcto en backend y web |
| `npm test` | Backend: 355 pruebas en 119 archivos; móvil: 144 pruebas; todas aprobadas |
| Web, `node --import tsx --test tests/*.test.ts` desde apps/web | 121 pruebas aprobadas |
| `node --test scripts/android-release-config.test.cjs` | 17 pruebas aprobadas |
| `npm run lint` | Falla: falta `eslint.config.js`, `.mjs` o `.cjs` |
| `npm --workspace backend run test:stock:integration` | Falla: falta `backend/vitest.stock.config.ts` |
| `npm run check:react-workspaces` | Correcto: web React 18.3.1; móvil React 19.0.0 y React Native 0.79.6 |
| `npm run check:mobile-bundle-react` | No verificable: no existe el mapa del bundle Android compilado |
| `npm audit --package-lock-only --json` | 44 paquetes afectados: 1 crítico, 29 altos y 14 moderados |

Total: 637 pruebas aprobadas en las cuatro ejecuciones. Esto no incluye la suite de integración MongoDB, que no pudo arrancar.

Las primeras ejecuciones de Vite/Vitest fueron bloqueadas por restricciones `EPERM realpath` del entorno. Al ejecutarlas con el permiso correspondiente, las pruebas y la compilación pasaron. Ese error inicial no se clasifica como defecto del proyecto. Las consultas npm requirieron los certificados del sistema mediante `NODE_OPTIONS=--use-system-ca`; se mantuvo la verificación TLS.

## Hallazgos

### A01 — Alta: permisos de usuarios autorizan operaciones de otros dominios

Evidencia: `backend/src/modules/ventas/saleRoutes.ts:16`, `backend/src/modules/ventas/commercialSettlement.ts:54`, `backend/src/modules/inventario/stockRoutes.ts`, `backend/src/modules/finanzas/cashMovementRoutes.ts` y `backend/src/modules/produccion/productionRoutes.ts`.

Ventas y liquidaciones usan `usuarios.ver` y `usuarios.editar`; inventario y caja usan esos mismos permisos. En producción, las escrituras requieren `usuarios.editar`, aunque las lecturas usan `produccion.ver`. El registro de módulos declara permisos específicos, como `ventas.ver`, `ventas.crear` e `inventario.editar`, que estas rutas no aplican.

Consecuencia: una persona autorizada para editar usuarios puede registrar salidas de almacén, movimientos de caja o liquidaciones comerciales aunque carezca de permisos de esos dominios. A la inversa, un rol comercial correctamente configurado con permisos de ventas puede quedar bloqueado. Los controles de interfaz también reproducen parte de esta mezcla.

Corrección: definir una matriz de permisos por operación, aplicarla en backend y clientes, y probar tanto accesos permitidos como denegados con roles restringidos.

### A02 — Alta: estados finales comerciales sin movimientos de caja ni inventario

Evidencia: `backend/src/core/transactionStatus.ts:3`, `backend/src/core/commercialCreation.ts:19`, `backend/src/modules/ventas/saleRoutes.ts:19` y `backend/src/modules/compras/purchaseOrderRoutes.ts`.

`PATCH /sales/:id/status` permite `PENDIENTE → PAGADA`; la ruta de compras permite `APROBADA → RECIBIDA`. Esas operaciones actualizan el estado y su auditoría, pero no crean movimientos de existencias ni dinero. La ruta separada `/commercial-settlements` sí registra conjuntamente ambos efectos y exige los estados previos pendientes/aprobados.

Consecuencia: después de marcar manualmente una venta como pagada, la liquidación conjunta ya no puede procesarla porque espera `PENDIENTE`. Lo mismo ocurre con una compra marcada como recibida. Quedan documentos finalizados sin el comprobante conjunto y sin efectos asociados.

Corrección: usar un único servicio para esas transiciones finales o distinguir explícitamente un estado informativo de una liquidación efectiva. Añadir pruebas que comprueben documento, caja, inventario y auditoría juntos.

### A03 — Alta: Docker Compose no coincide con los requisitos actuales

Evidencia: `docker-compose.yml:15`, `backend/src/config/env.ts`, `backend/src/config/database.ts:5` y uso de `session.withTransaction` en servicios comerciales e inventario.

Hay tres obstáculos independientes: el secreto JWT de Compose tiene menos de los 64 caracteres exigidos por el esquema; se configura `DATABASE_URL` aunque el backend lee `MONGODB_URI`; MongoDB se inicia como servidor independiente, sin replica set, aunque las escrituras auditadas usan transacciones.

Consecuencia: con la configuración entregada, la validación del secreto impide arrancar. Corregir solo el secreto deja MongoDB sin configurar; corregir también la variable todavía deja incompatibilidad con las transacciones.

Corrección: usar variables válidas y secretos suministrados externamente; configurar un replica set local e inicializarlo, o documentar y usar un servicio MongoDB compatible. Validar un flujo real de creación y liquidación. No se ejecutó Docker en esta auditoría.

### A04 — Alta: Docker puede incorporar secretos locales y expone MongoDB

Evidencia: `Dockerfile:12` contiene `COPY . .`; no existe `.dockerignore`. `docker-compose.yml:26` publica `27017:27017` y no configura autenticación MongoDB.

`.gitignore` protege Git, pero no excluye archivos del contexto Docker. Si se crea el `.env` recomendado por README, puede incorporarse a la imagen junto con dependencias y archivos locales. MongoDB queda publicado en las interfaces del host; su accesibilidad externa depende de red y firewall.

Corrección: añadir `.dockerignore`, pasar secretos en ejecución y restringir MongoDB a la red interna de contenedores o a localhost cuando se necesite acceso de desarrollo. Esta copia no contenía `.env`; no se afirma que haya ocurrido una filtración.

### A05 — Alta: dependencias con avisos de seguridad

Evidencia completa: `docs/auditoria-dependencias-2026-10-13.json`, consultada sobre `package-lock.json`.

Npm reporta 44 paquetes afectados, contando dependencias y paquetes que heredan avisos: 1 crítico, 29 altos y 14 moderados. No son necesariamente 44 vulnerabilidades independientes.

Ejemplo crítico: `shell-quote` 1.10.0, aviso de inyección de comandos [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv). Otros ejemplos: `node-forge`, `postcss`, `braces`, `image-size` y `source-map-js`. Las dependencias directas afectadas que enumera npm son `expo`, `expo-asset` y `react-native`.

Consecuencia: existe deuda de actualización, especialmente en la cadena de herramientas móvil. No se ha demostrado una ruta de explotación remota en la API por estos avisos. La etiqueta de dependencia de producción de npm tampoco implica por sí sola que una herramienta esté incluida en el APK.

Corrección: identificar las cadenas con `npm explain`, actualizar respetando la compatibilidad Expo/React Native y repetir pruebas y builds. No aplicar automáticamente `npm audit fix --force`: el informe incluso propone una versión anterior de Expo en algunas cadenas, por lo que las sugerencias requieren revisión.

### A06 — Alta: indicadores operativos ficticios y declaración de producción fija

Evidencia: `backend/src/modules/disasterRecovery/disasterRecoveryService.ts:19`, `backend/src/modules/analytics/analyticsService.ts`, `backend/src/modules/observability/observabilityService.ts` y `backend/src/modules/deployment/deploymentService.ts:51`.

Recuperación devuelve cobertura de respaldos 98,7%, preparación 94,5% y una fecha fija de prueba. Analytics devuelve ingresos 128.400 y clientes activos 2.230 fijos. Observabilidad mezcla memoria/uptime calculados con tasas fijas. Deployment devuelve `readyForProduction: true` sin verificar dependencias ni base de datos. Estas respuestas se exponen mediante rutas registradas.

Consecuencia: esos endpoints no prueban que haya respaldos, restauraciones, disponibilidad ni ingresos reales. El dashboard principal sí consulta MongoDB: este hallazgo corresponde a los servicios indicados.

Corrección: etiquetar explícitamente datos demo o devolver `not_configured` hasta implementar fuentes reales. Derivar preparación de comprobaciones concretas y comprobar restauraciones en un entorno aislado.

### A07 — Media: ingresos y egresos pueden persistir aunque falle su auditoría

Evidencia: `backend/src/modules/finanzas/incomeRoutes.ts:15` y `backend/src/modules/finanzas/expenseRoutes.ts:15`.

La ruta primero guarda el documento y luego llama a `logAuditEvent`, sin una transacción común. Si el segundo paso falla, devuelve un error aunque el documento ya exista. No hay una clave de idempotencia visible en esas creaciones.

Consecuencia: registros sin auditoría y posibles duplicados cuando el cliente reintenta tras un fallo ambiguo. En contraste, los movimientos de caja auditados ya usan una transacción común.

Corrección: guardar documento y auditoría en una transacción y definir idempotencia para reintentos.

### A08 — Media: limitador general definido pero no aplicado

Evidencia: `backend/src/middleware/rateLimit.ts:8`; la búsqueda de `rateLimit` en `backend/src` solo encuentra su definición. `backend/src/app.ts` no lo monta. El login sí tiene un limitador específico.

Consecuencia: el proyecto no aplica ese límite general a lecturas, agregaciones o escrituras autenticadas. `trust proxy = 1` también está fijado para una topología Render; un despliegue con acceso directo puede permitir falsear la IP usada por el limitador de login mediante cabeceras reenviadas.

Corrección: aplicar límites por usuario/tenant y operación; ajustar la confianza en proxies a cada despliegue. Para varias instancias, usar un almacén compartido. El limitador general actual también necesita limpieza de entradas antes de activarlo.

### A09 — Media: verificaciones de calidad incompletas

Evidencia: `backend/package.json:12`, `apps/web/package.json`, `package.json:18`, `.github/workflows/ci.yml` y ausencia de archivos de configuración ESLint/Vitest referenciados.

Lint falla por falta de configuración. La integración de inventario referencia un archivo inexistente; el runner local referencia el mismo archivo, por lo que tampoco completa esa suite. El comando raíz de tests y CI no ejecutan las pruebas web ni la integración MongoDB. Las 121 pruebas web pasan al ejecutarlas explícitamente.

Consecuencia: una CI verde no cubre todos los controles disponibles ni valida transacciones reales. La documentación conserva cifras anteriores de 112 pruebas, distintas de la evidencia actual.

Corrección: recuperar la configuración de integración, añadir lint y web tests a CI, y ejecutar integración contra una base temporal aislada. Mantener documentación y evidencia de release actualizadas.

### A10 — Media: validación monetaria inconsistente en ingresos y egresos

Evidencia: esquemas en `incomeRoutes.ts` y `expenseRoutes.ts`; redondeo en `incomeService.ts` y `expenseService.ts`; `backend/src/modules/finanzas/models/FinanceModels.ts:8`.

Las rutas aceptan cualquier número finito positivo, pero el servicio lo redondea a centavos. Por ejemplo, 0,001 pasa la validación HTTP, se convierte en 0 y después incumple el mínimo del modelo; el error genérico termina en 500. Importes de más de dos decimales se modifican silenciosamente y no se exige un rango seguro de centavos, a diferencia de movimientos de caja.

Corrección: validar centavos, límites y mínimo monetario antes de persistir; devolver 400 para importes inválidos y adoptar una representación monetaria consistente.

### A11 — Baja: bundle web grande y acoplamiento de interfaz

Evidencia: build web genera un archivo JavaScript de 807,70 kB, 224,36 kB gzip, y advierte que supera 500 kB. `apps/web/src/main.tsx` concentra navegación y numerosas decisiones de permisos.

Consecuencia: mayor coste de descarga inicial y mantenimiento más difícil al cambiar la matriz de permisos. No se midió el rendimiento en dispositivos reales.

Corrección: separar pantallas, cargar módulos bajo demanda y centralizar decisiones de autorización de interfaz sin sustituir los controles de backend.

## Aspectos positivos

- TypeScript estricto y compilación correcta en el estado revisado.
- Autenticación que vuelve a consultar al usuario activo y compara `sessionVersion`, permitiendo revocar sesiones.
- Contexto de empresa y sucursal derivado de la sesión en las rutas revisadas.
- Validación Zod y controles de pertenencia de referencias en operaciones comerciales.
- Liquidación conjunta con transacciones y comprobante único; inventario con bloqueo documental y referencias únicas.
- Numerosas escrituras con auditoría transaccional y controles de cambios concurrentes.
- Contraseñas con bcrypt, límite de bytes y respuestas HTTP que evitan mostrar errores internos.
- Pruebas para validación, límites, identidad, autorización y fallos ambiguos de clientes.

Estos controles son útiles, pero no compensan los hallazgos de autorización y consistencia descritos.

## Límites y procedencia

La carpeta no contiene `.git`: no se pudo verificar repositorio de origen, autoría, cambios respecto a GitHub ni historial de secretos. Tampoco se encontró un archivo LICENSE; verificar la licencia en el repositorio original antes de decidir su reutilización o distribución. No se afirma que el proyecto tenga o carezca de una licencia en GitHub.

No se conectó a bases de datos del negocio, no se creó un administrador, no se desplegó ningún servicio y no se compiló el APK. La firma Android release usa la clave de desarrollo, circunstancia ya advertida por el propio script; falta preparar una firma de distribución.

No se certificaron aislamiento multiempresa completo, restauraciones, carga, E2E web/móvil, integraciones externas ni cumplimiento fiscal. El README describe IA e integraciones externas como pendientes; no deben confundirse con conectores ya implementados.

No se modificó el código de aplicación ni el lockfile. Se instalaron dependencias, se generaron artefactos de compilación y se guardaron este informe y las evidencias de auditoría.

## Orden recomendado de corrección

1. Corregir permisos y unificar las transiciones finales con caja/inventario.
2. Hacer reproducible el entorno Docker y proteger su contexto y base de datos.
3. Revisar y actualizar dependencias afectadas con compatibilidad móvil comprobada.
4. Eliminar afirmaciones operativas fijas; comprobar respaldos y restauración reales.
5. Completar atomicidad, idempotencia y validación monetaria de finanzas.
6. Recuperar integración MongoDB, configurar lint e incorporar pruebas web a CI.
7. Aplicar límites y topología de proxies, validar E2E y preparar distribución Android.

## Evidencias guardadas

- `auditoria-dependencias-2026-10-13.json`: respuesta completa de npm audit.
- `auditoria-tests-2026-10-13.txt`: ejecución final aprobada de backend y móvil.
- `auditoria-web-tests-2026-10-13.txt`: pruebas web aprobadas.
- `auditoria-integracion-2026-10-13.txt`: fallo al cargar la configuración de integración ausente.
