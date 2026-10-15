# Respaldo local cifrado y restauración de prueba

Se utiliza un archivo estándar de `mongodump --archive --gzip`, cifrado con AES-256-GCM. El comando lo descifra y restaura en un proceso MongoDB temporal que él mismo crea, accesible únicamente en `127.0.0.1`. No acepta destinos de restauración externos y no escribe en Atlas.

## Ubicaciones privadas

- `backups/`: archivos `.erpbackup`, inventarios con hashes e informes de verificación.
- `.backup-keys/local-backup.key`: clave necesaria para descifrar los archivos.
- `.tools/`: herramientas oficiales descargadas para esta computadora.

Estas carpetas quedan excluidas de Git y del contexto Docker. En Windows, el comando elimina permisos heredados y concede acceso al usuario que lo ejecuta. Los archivos temporales con credenciales y datos sin cifrar se crean en una carpeta privada y se eliminan al terminar. Una interrupción forzada o un apagón puede dejar esa carpeta temporal: revisa las carpetas `backups/.work-*` antes de copiar respaldos a otro lugar.

Conserva una copia de la clave en un lugar seguro separado del respaldo. Perder la clave impide recuperar los datos. Por ahora, tanto la copia como la clave están en esta computadora: esto **no protege contra su pérdida o avería**. No se configuró almacenamiento externo ni programación automática, conforme a la elección del usuario.

## Crear y verificar

Desde la raíz del proyecto en PowerShell:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
$env:MONGODB_TOOLS_DIR=(Resolve-Path '.tools/mongodb-database-tools-windows-x86_64-100.19.1/bin').Path
npm.cmd --workspace backend run backup:local
```

En otra computadora instala las [herramientas oficiales de MongoDB](https://www.mongodb.com/docs/database-tools/installation/) y establece `MONGODB_TOOLS_DIR` a su carpeta `bin`, o añádela al PATH. Se necesitan Node, las dependencias del proyecto y la configuración privada de Atlas en `.env`. El primer ensayo descarga MongoDB 8.0.17 para la restauración local; necesita espacio y conectividad.

Cada ejecución crea una copia nueva, sin borrar copias anteriores. Si falla, no asumas que un archivo existente está verificado: debe existir el informe correspondiente con `restoreVerified: true`.

## Repetir la recuperación de una copia existente

No requiere conectarse a Atlas. Mantén juntos el archivo cifrado y su `.report.json`, y conserva la clave en `.backup-keys/local-backup.key`:

```powershell
npm.cmd --workspace backend run backup:local -- --verify 'C:/ruta/al/respaldo.erpbackup'
```

El comando termina la base temporal al finalizar. Es un ensayo, no una sustitución de la base del ERP. Recuperar el servicio real requiere un procedimiento separado con una base de destino nueva, permisos y revisión de la aplicación antes de cambiar su conexión.

## Alcance de la consistencia

El proceso compara hashes BSON de todos los documentos, índices y opciones de las colecciones antes y después de exportar y después de restaurar. Rechaza la copia si esos contenidos difieren. Rechaza vistas y colecciones de sistema que este procedimiento no cubre.

Ejecuta el respaldo en una ventana sin escrituras ni cambios de índices. La comparación detecta cambios de contenido, pero no equivale a una instantánea transaccional ni garantiza consistencia de un sistema activo. MongoDB exige [detener escrituras o capturar y reproducir el oplog](https://www.mongodb.com/docs/v8.0/tutorial/backup-and-restore-tools/) para esa garantía. El oplog requiere un respaldo completo del replica set, incompatible con limitar `mongodump` a una sola base. Para operación continua se debe elegir una política administrada compatible con el nivel de Atlas.

## Resultado inicial

El 14 de octubre de 2026 (México), se exportaron y restauraron 25 colecciones y 23 documentos de la base de demostración. Coincidieron documentos e índices; la verificación del archivo existente también pasó. Los informes detallados están en la carpeta privada `backups/`. Las fechas de archivo están en UTC.

El endpoint de recuperación permanece en `not_configured`: un ensayo manual local no establece cobertura, RPO, RTO ni monitoreo de respaldos del servicio publicado.
