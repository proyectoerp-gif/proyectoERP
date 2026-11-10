# Rediseño público de Albor · 9 de noviembre de 2026

Referencia visual solicitada: https://www.larva.com.mx/. Se tomó su jerarquía de campaña, marca centrada y navegación por categorías, con identidad original de Albor en marfil, negro y terracota. No se copiaron logotipos ni recursos de Larva.

Portada fotográfica a todo el ancho, encabezado y navegación persistente, catálogo antes de categorías, filtros desplegados dentro de la página, nuevas tarjetas, vista rápida, bloque de marca, atención y pie. Iconos SVG propios y adaptación móvil. Movimiento reducido respetado. Se reutilizan fotografías locales con créditos existentes.

Se conservaron API, precios, favoritos locales, filtros, paginación y asistente. No se añadieron pagos ni reservas. No se modificaron datos ni documentos del ERP. Producción permanece manual.

Validación: 168 pruebas web con node --import tsx --test apps/web/tests/*.test.ts, build web (incluye TypeScript), lint general y revisión visual local a 1440, 390 y 320 px. Filtros por máximo de precio y orden ascendente devolvieron 299/349/399/449/499; paginación 12/8; favoritos, vista rápida y consulta al asistente comprobados. API y MongoDB temporal de localhost, sin escrituras de prueba en Atlas. Capturas locales: tmp/studio-proof/.
