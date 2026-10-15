# Reintentos seguros en Finanzas

Los POST de `/api/v1/incomes`, `/api/v1/expenses` y `/api/v1/cash-movements` requieren `Idempotency-Key`: entre 16 y 100 caracteres, letras ASCII, números, guion o guion bajo. Puede ser un UUID. La autenticación y el permiso `finanzas.editar` se comprueban en cada solicitud, incluidos los reintentos.

## Comportamiento

- La primera solicitud guarda movimiento, auditoría y comprobante de reintento en una misma transacción.
- El mismo identificador, usuario, empresa, sucursal, tipo de operación y datos devuelve el resultado original, conservando su ID y sin crear otro movimiento ni otra auditoría. Se mantiene HTTP 201 para preservar el contrato de respuesta.
- El mismo identificador con datos diferentes devuelve HTTP 409. Los importes y conceptos se comparan en su forma normalizada por el servicio.
- Solicitudes simultáneas se resuelven mediante un índice único de MongoDB. El intento que pierde la carrera revierte todos sus documentos y recupera el resultado confirmado.
- Si falla la auditoría o el comprobante, toda la transacción se revierte. La misma operación puede reintentarse posteriormente con la misma clave.
- Un comprobante confirmado permanece disponible aunque después se desactive la cuenta bancaria. Repetir no genera un nuevo movimiento sobre esa cuenta.

Los comprobantes se guardan en `financerequests`, con índice único por empresa, sucursal, usuario, tipo y clave. El índice se inicializa antes de admitir escrituras protegidas; si falla su preparación, la solicitud falla sin registrar el movimiento. No tienen expiración automática, para impedir que un reintento antiguo vuelva a ejecutarse después de un plazo.

## Web y móvil

La pantalla de caja crea el identificador y lo guarda **antes** de enviar la solicitud. Lo conserva ante errores de red, interrupciones o respuestas que no se pueden verificar. Al reintentar el mismo formulario recupera ese identificador, incluso después de volver a abrir la pantalla o de renovar el token del mismo usuario y sucursal.

La web usa almacenamiento local del navegador. La app nativa usa un archivo privado por operación en el directorio de documentos de la aplicación. Se conservan únicamente identificadores opacos y nombres derivados del ámbito y formulario; no se guardan tokens, contraseñas ni el contenido del movimiento en esos archivos. El nombre derivado sirve para localizar el pendiente; la comprobación de integridad de datos la realiza el servidor con SHA-256.

Tras verificar la respuesta, el cliente elimina el pendiente y permite registrar una nueva operación, incluso si tiene el mismo importe y concepto. Si no puede guardar o recuperar el identificador local, no envía una operación nueva. Los botones mantienen su bloqueo mientras se procesa una solicitud.

Los endpoints de ingresos y egresos quedan protegidos para integraciones externas mediante la misma cabecera. Las pantallas actuales del ERP registran caja; no se añadieron pantallas nuevas de ingresos o egresos.

## Compatibilidad y límites

- Las versiones antiguas de clientes e integraciones que no envíen la cabecera reciben HTTP 400 sin registrar el movimiento. La web publicada incluye el cambio; una app Android instalada necesita una nueva compilación e instalación para incorporar el código nativo actualizado.
- Cambiar de dispositivo, borrar datos del navegador/aplicación o reenviar con un identificador nuevo representa una solicitud nueva. Ante una operación cuyo identificador se perdió, hay que consultar el historial antes de repetirla.
- No se deduplican operaciones solo por coincidir importe, fecha o concepto: dos pagos legítimos pueden tener los mismos datos. La protección corresponde a reintentos de la misma operación.
- No modifica las liquidaciones comerciales, que conservan su mecanismo de comprobantes previo, ni la creación de cuentas bancarias.
- Funciones internas sin `requestKey` conservan la transacción previa; las tres rutas públicas exigen siempre la clave. Integraciones nuevas deben reutilizarla en todos los reintentos del mismo intento de negocio.

## Pruebas

La integración con MongoDB local cubre, para ingresos, egresos y caja: seis solicitudes simultáneas, repetición posterior, conflicto de contenido, aislamiento de empresa/sucursal/usuario, nueva operación legítima, fallos de auditoría y comprobante y repetición tras desactivar la cuenta. Las pruebas de rutas comprueban autenticación, permisos y obligatoriedad de la cabecera. Las del cliente cubren persistencia, concurrencia, reapertura, confirmación, cambios de sesión y errores de almacenamiento.
