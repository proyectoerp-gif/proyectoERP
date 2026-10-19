# Chatbot con OpenAI: preparación y activación en demo

La integración usa Responses API con salida estructurada. Permanece en modo guiado hasta configurar el proveedor, el modelo y una clave del backend. No se entrenó un modelo propio: se proporciona el manual público como contexto en cada consulta.

## Configuración

En el servicio API **proyectoERP-api** de Render, no en el sitio web ni en producción, añadir:

```text
CHATBOT_PROVIDER=openai
OPENAI_API_KEY=<introducir directamente en Render>
OPENAI_MODEL=gpt-5.6-terra
CHATBOT_DAILY_LIMIT=25
```

El modelo es configurable y debe estar habilitado en la cuenta de API. GPT-5.6 Terra admite Responses y Structured Outputs según la documentación consultada. Crear una clave en un proyecto de OpenAI con facturación disponible. Nunca enviarla al chat, guardarla en Git ni usar un nombre con prefijo `VITE_`. Guardar los cambios y desplegar el servicio API. La suscripción a ChatGPT no configura automáticamente una clave de API para este backend.

El límite de la aplicación cuenta intentos de generación por día UTC, entre todas las instancias y reinicios. No es un límite monetario de la cuenta de OpenAI: configurar también los controles de gasto del proyecto. Los intentos fallidos cuentan. El valor inicial de código es 100; se recomienda empezar con 25 para la prueba.

Para desactivar la integración, cambiar `CHATBOT_PROVIDER=guided` y desplegar. El catálogo y los tickets siguen funcionando. En cualquier entorno distinto de `demo`, este adaptador no genera respuestas.

## Datos y comportamiento

- OpenAI recibe la pregunta actual y los 20 artículos del manual ficticio publicado. No recibe JWT, conexión MongoDB, datos de empleados, pedidos ni inventario privado.
- Se usa `store:false`; esto desactiva el almacenamiento de la respuesta para recuperación por la API, pero no equivale a una garantía de retención cero por parte del proveedor.
- No se envía el historial de la conversación. Esta primera versión contesta cada pregunta como una consulta independiente. Una pregunta como «¿y cuánto tarda?» debe incluir de qué entrega se habla.
- La consulta de precio de un producto seleccionado se responde directamente con el catálogo; el modelo no calcula ni decide precios.
- Consultas reconocidas sobre credenciales, datos personales, pedidos privados, autorizaciones y reembolsos se atienden localmente o se derivan. El detector de datos sensibles es una precaución básica y no identifica todos los formatos: la interfaz exige usar información ficticia.
- La IA no tiene herramientas para crear ventas, cobrar, devolver dinero o cambiar registros. La derivación a soporte sigue siendo una acción explícita del visitante.
- El servidor comprueba formato y que las referencias pertenezcan al manual. Esto no prueba que cada frase esté respaldada: la calidad factual requiere evaluación con el modelo real y revisión del equipo.
- Las respuestas guardan su motor (`guided`, `openai` o `fallback`) y las fuentes. La interfaz distingue una respuesta de IA de una respuesta de respaldo.
- Si hay error, cuota agotada, respuesta no válida o más de 12 segundos de espera, se usa la respuesta guiada. Los errores del proveedor se registran por categoría/estado HTTP, sin cuerpo ni credenciales.
- Cada intento tiene una identidad persistente para evitar otra llamada facturable al reintentar. Una operación abandonada se recupera con respuesta guiada tras un minuto; no vuelve a llamar al proveedor.

## Prueba después de activar

1. Abrir `/tienda` en una página nueva y abrir el asistente. Debe anunciar que usa IA y que la pregunta se envía a OpenAI.
2. Preguntar «¿Atienden el sábado y a qué hora?»; comprobar la etiqueta **Asistente con IA**, fuente de horario y contenido correcto.
3. Preguntar «¿Puedo recibir una compra en mi domicilio y cuánto tarda?»; revisar las fuentes de envío y plazo. No debe prometer disponibilidad o costos no publicados.
4. Consultar un producto desde el catálogo: el precio debe coincidir exactamente con el catálogo.
5. Preguntar algo fuera del negocio; debe indicar que no hay información suficiente o derivar, sin inventar una política.
6. Solicitar un reembolso ficticio; debe remitir al personal y no afirmar haber ejecutado una devolución de dinero.
7. Solicitar ayuda humana y comprobar el ticket en el ERP.

Estas pruebas con el modelo real están pendientes hasta introducir la clave. Las pruebas automatizadas usan respuestas simuladas y cubren el contrato HTTP, fuentes inexistentes, rechazos, errores, timeout, aislamiento, límite diario e idempotencia; no miden la calidad lingüística del modelo real.

Referencias oficiales consultadas:

- https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses
- https://developers.openai.com/api/docs/models/gpt-5.6-terra
- https://developers.openai.com/api/docs/guides/your-data
