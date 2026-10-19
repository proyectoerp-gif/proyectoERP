# Chatbot híbrido: menú guiado y Gemini

La demo combina respuestas aprobadas por botones y consultas abiertas con IA. El proveedor permanece desactivado hasta configurar su clave en el backend.

## Flujo

- Temas: Lo más consultado, Productos y precios, Entregas y horarios, Pagos y devoluciones.
- Cada pregunta del menú se envía con su identificador y título. El servidor valida ambos y devuelve el texto publicado, sin llamar a ninguna API de IA.
- Una pregunta escrita que coincide exactamente con una pregunta frecuente también se resuelve localmente.
- El campo de escritura siempre visible permite una consulta abierta. Solo esta ruta puede usar el proveedor configurado, tras comprobar los límites.
- Los precios seleccionados desde el catálogo siguen consultándose directamente en MongoDB, sin generación.
- Los casos privados, reembolsos y autorizaciones reconocidos se remiten al personal. El chatbot no ejecuta cambios en ventas, caja o inventario.
- Las respuestas identifican su motor y cualquier límite alcanzado; las fuentes se despliegan con «Ver fuentes». La conversación puede derivarse a un ticket explícitamente.

## Presentación y navegación

- Cuatro tarjetas de temas; al elegir una, se muestran únicamente sus preguntas y un botón para volver.
- El menú se recoge después de enviar. «Preguntas rápidas» permite abrirlo otra vez sin perder la conversación.
- Solo el historial se desplaza; el campo de escritura, el contador de IA disponible y la ayuda del equipo permanecen accesibles.
- Enter envía; Shift + Enter añade una línea. Se respeta la composición de teclado y la preferencia de movimiento reducido.
- «Preguntas frecuentes» abre el manual completo sin gastar IA. Minimizar conserva el borrador; recargar pierde la sesión local.
- El aviso desplegable explica la demo, el envío al proveedor de IA y sus límites. El chat no ofrece atención humana en vivo.

## Límites iniciales

| Control | Valor |
| --- | --- |
| Intentos de IA por conversación | 3 |
| Intentos diarios por conexión | 10 |
| Intentos diarios de toda la demo | 25 |
| Intentos por minuto de toda la demo | 3 |
| Mensajes totales por conversación, guiados incluidos | 20 |

Los contadores diarios de la aplicación se reinician por fecha UTC. Gemini puede tener otra hora de reinicio y cuotas inferiores: estos controles reducen consumo, pero no garantizan disponibilidad del nivel gratuito. También se limita la pregunta a 500 caracteres y la generación a 600 tokens de salida.

Las reservas de todos los contadores se realizan en una sola transacción MongoDB. Si se alcanza uno, se deshacen las otras reservas y no se llama al proveedor. Los intentos fallidos del proveedor sí cuentan; un reintento de la misma solicitud reutiliza el resultado persistido. Los contadores sobreviven a reinicios y se comparten entre instancias.

El límite por conexión usa un HMAC de la IP observada por el servidor; no almacena la IP en estos contadores. No identifica a una persona: usuarios en la misma red pueden compartir el cupo, y cambiar de red permite cambiar ese identificador. El máximo global sigue protegiendo la demo. Abrir otra conversación no reinicia el contador de la conexión.

Al alcanzar un límite, se conserva el menú guiado y la posibilidad de enviar el caso al personal. Los botones no consumen IA, aunque sí cuentan entre los 20 mensajes de una conversación.

## Activación en Render

Configurar únicamente el servicio API de la demo:

```text
CHATBOT_PROVIDER=gemini
GEMINI_API_KEY=<introducir personalmente en Render>
GEMINI_MODEL=gemini-3.1-flash-lite
CHATBOT_CONVERSATION_LIMIT=3
CHATBOT_VISITOR_DAILY_LIMIT=10
CHATBOT_DAILY_LIMIT=25
CHATBOT_MINUTE_LIMIT=3
```

La clave se crea en Google AI Studio. Confirmar allí que el proyecto y el modelo tienen cuota gratuita disponible. No habilitar facturación de pago para esta prueba sin decidir primero un presupuesto. Nunca publicar la clave en Git, el chat o una variable `VITE_`. Guardar y desplegar el API una vez configurada.

La integración anterior de OpenAI sigue disponible si se selecciona ese proveedor, pero no se usa cuando `CHATBOT_PROVIDER=gemini`. Para desactivar toda generación, seleccionar `guided`.

## Datos y límites de esta entrega

Gemini recibe la pregunta actual y el manual público ficticio; no recibe el historial completo, credenciales del ERP, pedidos privados ni información de empleados. El nivel gratuito puede usar entradas y respuestas para mejorar productos y permitir revisión humana según sus condiciones. Por eso esta demo exige datos ficticios. La detección local de datos sensibles no cubre todos los formatos.

Validar las fuentes y el formato no garantiza que cada frase generada sea correcta. La prueba de calidad con Gemini real queda pendiente de configurar la clave. Las pruebas automatizadas usan respuestas simuladas y nunca deben contactar a un proveedor real.

## Comprobaciones de esta entrega

- Typecheck de backend, web y móvil; compilación de backend y web.
- 451 pruebas unitarias de backend, 158 de web y 165 de integración con MongoDB temporal.
- Pruebas concurrentes del máximo por conversación, conexión y día global, con reversión de las otras reservas al denegar una consulta.
- Ruta HTTP verificada: una respuesta del menú conserva las tres consultas iniciales o las restantes, sin llamar al proveedor.
- Recorrido manual local con Gemini simulado: menú de horario, tres preguntas abiertas, contador a cero, cuarta pregunta con respuesta de respaldo y consulta de envíos por botón después de agotar el cupo.
- La conexión real y las cuotas del proyecto de Google AI Studio quedan pendientes de configurar y validar con la cuenta del usuario.

Referencias oficiales consultadas:

- https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/terms
