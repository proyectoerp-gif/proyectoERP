# CI, carga web y apariencia — 23 de noviembre de 2026

- El lockfile actualiza la dependencia indirecta `node-forge` de 1.4.2 a 1.4.4. La instalación limpia con npm 10.9.8 y la auditoría de backend, web y móvil terminan sin vulnerabilidades.
- Las pruebas unitarias e integradas del chatbot comprueban el contenido público proyectado del manual, incluida la entrada `marca`, en lugar de fijar una cantidad antigua de 22 artículos. Se conserva la comprobación de que no se transmiten secretos ni campos privados al proveedor.
- El punto de entrada web carga por separado tienda, atención y ERP. Los módulos del ERP se solicitan al navegar; el asistente de la tienda se carga al abrirlo y conserva su conversación al minimizarlo.
- La compilación anterior tenía un archivo principal de unos 964 kB. El nuevo archivo de entrada ronda 146 kB, más el módulo de la ruta y sus dependencias. Los módulos de exportación siguen descargándose cuando se solicitan. Las cifras son tamaños minificados, no tiempos medidos ni el total de todas las descargas.
- La tienda ofrece modo claro y oscuro con preferencia local `up-store-theme`; las visitas sin preferencia empiezan en claro. Cabecera, portada, catálogo, filtros, fichas, ayuda y pie tienen estilos claros. El ERP conserva sus ajustes y añade acceso directo al cambio de modo en el acceso y la cabecera.

## Verificación local

- 470 pruebas unitarias backend, 191 integraciones sobre MongoDB temporal local, 168 web y 172 móviles aprobadas.
- Ocho verificaciones de compatibilidad de dependencias y cuatro de respaldo aprobadas.
- Tipos, lint y compilación comprobados; instalación reproducible con `npm@10.9.8 ci`.
- Navegador de prueba: tema persistente, vista móvil de 390 px sin desbordamiento horizontal, ficha de producto, chat guiado, conversación al minimizar, acceso al ERP y navegación de 26 módulos. Los datos y usuarios de estas pruebas son temporales locales; no se escribieron operaciones de prueba en Atlas.
- Las capturas y registros de esta revisión permanecen en `tmp/`, excluido de Git. La comprobación remota de CI y despliegue corresponde al commit publicado y debe consultarse en GitHub Actions y Render demo.

## Portada automática — 24 de noviembre

La animación muestra los cinco productos activos más recientes del catálogo público, usando su foto versionada cuando está disponible y la ilustración como alternativa. La selección es independiente de búsquedas, filtros y favoritos. Se consulta al abrir la tienda, cada minuto mientras la pestaña está visible y al regresar a ella, con límite de frecuencia y cancelación al desmontar. Una selección vacía no se sustituye por productos inventados; un error temporal conserva la última respuesta confirmada. No requiere editar la portada ni desplegar nuevamente para incorporar productos.

La primera ejecución remota reveló que las integraciones de imágenes y ficha de moda dependían del JWT local. Ambas suites ahora inicializan explícitamente su secreto ficticio antes de importar la configuración, como las demás integraciones. No se necesita un secreto real ni un `.env` en GitHub Actions.
