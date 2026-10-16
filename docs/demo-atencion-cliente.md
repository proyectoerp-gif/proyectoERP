# Demo de atención al cliente

## Alcance de esta primera entrega

Promaxima Demo representa una tienda ficticia de artículos de oficina y hogar. Su manual de 20 preguntas frecuentes tiene versión `2026-10-15`. Horarios, devoluciones y demás políticas son ejemplos educativos, no condiciones de un negocio real.

El prototipo realiza búsqueda guiada por palabras del manual y devuelve textos aprobados con su fuente. No conecta un modelo generativo, no tiene búsqueda vectorial y no debe presentarse como RAG terminado. Preguntas desconocidas o ambiguas ofrecen atención humana. No consulta información personal de pedidos ni realiza operaciones financieras.

## Cómo probarlo

1. Abrir https://proyectoerp-web.onrender.com/demo-atencion . No requiere una cuenta del ERP.
2. Preguntar «¿Cuál es su horario?» y comprobar respuesta, título de fuente y versión.
3. Consultar «Manual y 20 preguntas» para revisar la información ficticia publicada.
4. Escribir una pregunta fuera del manual, por ejemplo «Necesito practicar la atención de un caso ficticio». Comprobar que pide ayuda en lugar de inventar información.
5. Pulsar «Solicitar ayuda humana». Guardar la referencia del ticket. La derivación no garantiza atención en tiempo real.
6. El personal inicia sesión en el ERP demo y abre «Solicitudes de ayuda». Allí puede consultar el manual, las últimas 30 conversaciones disponibles y la referencia correspondiente. La mesa de ayuda existente permite pasar el ticket a En curso y luego Resuelto, con nota de resolución.
7. No existe respuesta en vivo del agente al visitante. Esa función, la identidad de cliente y el seguimiento posterior del caso quedan para otra iteración.

## Datos y permisos

- Todas las operaciones del chat se fijan en el servidor a `company-promaxima-demo` / `branch-promaxima-demo`. El visitante no envía identificadores de empresa o sucursal.
- Cada conversación utiliza un secreto aleatorio de 256 bits, guardado como hash en MongoDB. Ni el historial del personal ni los mensajes posteriores devuelven ese secreto.
- El navegador conserva el secreto solo en memoria; cerrar o recargar pierde el acceso del visitante. «Nueva conversación» descarta la sesión local, no borra el registro del servidor.
- El historial del personal requiere sesión activa, permiso `soporte.ver` y la empresa/sucursal demo exactas. El ticket se gestiona con los permisos actuales de soporte.
- Caducidad de conversaciones a 7 días, con índice TTL de MongoDB y comprobación de caducidad en cada acceso. TTL elimina de forma asíncrona. Los tickets y su auditoría mantienen una descripción limitada y una referencia tras caducar la conversación; su limpieza administrativa no está automatizada.
- Límite de 20 preguntas de hasta 500 caracteres por conversación y 30 solicitudes por minuto/IP para operaciones públicas. El límite es en memoria y por proceso, adecuado solo para el prototipo; no equivale a una protección distribuida.
- Reintentar una pregunta con el mismo UUID devuelve su respuesta original. Una transacción crea ticket, auditoría y referencia una sola vez ante derivaciones concurrentes.
- Las rutas `/api/v1/demo-support/*` devuelven 404 cuando `ERP_ENVIRONMENT` no es `demo`. No se habilita ni despliega este prototipo en producción.

## Evidencias y siguientes iteraciones

Se añadieron pruebas de las 20 fuentes, consultas desconocidas, sesiones ajenas, permisos del personal, caducidad, rechazo de datos de empresa enviados por el visitante, bloqueo en producción y dos derivaciones simultáneas. La integración se ejecuta con un replica set local y una base temporal propia, nunca contra Atlas.

Para convertirlo en el proyecto de chatbot del equipo, faltan: documentos editables con revisión y publicación, conjunto de evaluación con respuestas esperadas, proveedor/modelo y presupuesto, recuperación documental real con filtros antes de recuperar, evaluación de respaldo de respuestas, identidad de cliente y canal bidireccional con agentes. Esa etapa debe realizarse primero en demo, con datos ficticios y aprobación de los documentos que puedan consultar los clientes.
