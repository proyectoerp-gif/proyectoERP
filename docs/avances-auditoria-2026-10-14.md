# Avances de la auditoría — 14 de octubre de 2026

## Completado

- Respaldo local cifrado AES-256-GCM: 25 colecciones y 23 documentos. Restauración real en MongoDB temporal local y comparación de documentos BSON, índices y opciones. También se comprobó la recuperación de un archivo existente sin consultar Atlas. [Procedimiento y límites](respaldos-locales.md).
- Respaldos, claves y herramientas privadas excluidos de Git, Docker y el explorador de módulos de Metro. No se publican datos ni claves.
- Ingresos y egresos: documento y auditoría en una misma transacción MongoDB. Si falla la auditoría, el documento se revierte. Se conserva el estado pendiente.
- Importes de ingresos/egresos validados en rutas y servicios: entre 0.01 y 999999999.99, con máximo dos decimales, sin redondear silenciosamente entradas inválidas.
- Recuperada la configuración de integración ausente: 71 pruebas locales de transacciones, concurrencia y aislamiento. Nuevos casos para ingresos/egresos, cuentas de otras empresas/sucursales y fallos de auditoría. CI ejecuta esta suite sin credenciales de Atlas.
- Eliminadas cifras ficticias de los endpoints operativos de recuperación, analítica y observabilidad. Los valores sin instrumentación son `null`; las listas sin fuentes son vacías y los estados expresan la falta de configuración. La preparación para producción deja de afirmarse automáticamente.
- Actualizados shell-quote 1.10.0 → 1.12.0, source-map-js 1.2.1 → 1.2.2 y PostCSS de Vite 8.5.28 → 8.5.30. Nanoid se actualiza como dependencia de PostCSS. Expo y React Native conservan sus versiones.

## Verificación

- Instalación limpia mediante `npm ci --ignore-scripts`.
- TypeScript de backend, web y móvil; compilación de backend y web.
- 382 pruebas de backend, 146 de móvil, 128 de web, 71 de integración MongoDB local y una prueba de cifrado con recuperación, clave equivocada y alteración del archivo.
- Exportación Android con Expo: 713 módulos y una única instancia correcta de React y React Native. Comprueba el bundle JavaScript; no sustituye una compilación APK ni pruebas en dispositivo.
- Auditoría npm: de 44 avisos (1 crítico, 29 altos, 14 moderados) a 42 (0 críticos, 28 altos, 14 moderados). Respuestas completas en `auditoria-dependencias-2026-10-14*.json`.

## Actualización posterior

La protección contra reintentos de ingresos, egresos y caja ya se implementó. Véase [contrato, comportamiento y límites de idempotencia](idempotencia-finanzas.md). La lista siguiente conserva los demás pendientes de esta revisión.

## Pendientes abiertos

- Almacenamiento fuera de esta computadora, programación y supervisión de respaldos. El usuario eligió preparar primero la copia local. No se atribuyen RPO, RTO ni cobertura a un ensayo manual.
- Dependencias móviles vulnerables de Expo/React Native y sus herramientas. El PostCSS de Expo sigue en 8.4.49. No se aplicó `npm audit fix --force`, que propone cambios incompatibles, incluido retroceder Expo. Algunos avisos incluyen la última versión publicada; requieren seguimiento individual.
- La transacción de ingreso/egreso comprueba la cuenta activa; no establece un bloqueo contra una futura operación concurrente de desactivación de cuentas.
- Docker Compose: sustituir el secreto fijo, corregir `DATABASE_URL` y configurar una topología segura compatible con transacciones. Esta revisión protege su contexto; no se ejecutó Docker en esta computadora.
- Configuración de lint, límites generales de solicitudes, separación formal de pruebas/producción, E2E con roles restringidos, firma de distribución Android y verificación de licencia/procedencia del repositorio original.
- El bundle web conserva una advertencia de tamaño de aproximadamente 808 kB.

No se declara cerrada la auditoría completa ni se certifica el uso con datos reales.
