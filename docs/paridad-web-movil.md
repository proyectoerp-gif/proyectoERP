# Interfaz y funciones de Núcleo ERP en Android

## Alcance

La app continúa siendo React Native. El ERP no se sustituye por una vista web. La página pública del catálogo y su chatbot se abren en el navegador desde un acceso visible en la app, igual que desde el ERP web.

La navegación de web y Android usa `shared/constants/navigation.ts`: ocho áreas, los mismos nombres de secciones, ayudas, búsqueda y filtrado por permisos. La API sigue autorizando cada consulta y operación.

## Cambios

- Acceso separado del área de trabajo, menú de áreas con buscador, pestañas por sección y accesos a Inicio, Áreas, Página web y Mi cuenta.
- Claro/oscuro, cinco acentos, color hexadecimal personalizado y tres tipografías. Solo las preferencias visuales se guardan en el directorio privado de la app; la sesión sigue en memoria.
- Los componentes de presentación nativos de `ui.tsx` aplican el tema también a los formularios existentes. Los colores anteriores se traducen a superficies, texto, bordes y errores semánticos; las operaciones de negocio siguen en sus módulos originales.
- Confirmaciones con colores del tema, controles de al menos 44 puntos, botones en varias líneas, campos legibles y formularios agrupados en desplegables.
- Ventas y compras con hasta 20 productos distintos, cantidades, costos de compra, subtotales, revisión y confirmación. Los precios de venta los confirma el servidor.
- Seguimiento nativo de anticipos, pagos, entregas/recepciones parciales, devoluciones, reembolsos y vencimientos. Las solicitudes ambiguas conservan el mismo identificador al reintentar; la navegación se bloquea mientras se espera su confirmación.
- Ajustes de existencias por conteo con saldo esperado, motivo, historial y reintento de la misma solicitud.
- Productos y contactos con edición, retiro recuperable, restauración y filtro por estado. Administración de categorías separada del formulario de producto. Cuentas, categorías y almacenes conservan su retiro recuperable.
- Atención al cliente demo: manual, preguntas publicadas, conversaciones, fuentes y acceso a tickets en Solicitudes de ayuda.
- PDF y Excel de los registros filtrados de ventas/compras, catálogo, cuentas/caja, existencias/historial, categorías/almacenes, empleados/departamentos, usuarios y auditoría. Incluyen todas las páginas, con límite de 10,000 registros, cancelación y detección de duplicados y ciclos. Se conservan los documentos individuales de los módulos operativos y se agregan comprobantes y seguimiento comercial.

Las exportaciones usan los permisos de la sesión, sin ampliar el acceso a catálogos auxiliares. PDF usa la impresión nativa de Expo y Excel conserva números y texto literal. El usuario elige el destino en la hoja de compartir de Android.

## Prueba en el celular por USB

Este proyecto usa Expo SDK 53. La revisión de desarrollo se realiza con Expo Go compatible, la API demo y el puerto Metro 8081 redirigido por ADB. No requiere publicar producción. Los cambios de configuración nativa requieren un APK nuevo para una instalación independiente de Expo Go.

Variables de desarrollo: `EXPO_PUBLIC_API_URL` apunta a la API del entorno y `EXPO_PUBLIC_STOREFRONT_URL` permite configurar su catálogo público. Si la API no es la demo conocida y no se configura el catálogo, la app no abre por defecto una tienda de otro entorno.

## Validación

Se comprueban tipos de todos los espacios de trabajo, las pruebas web y móviles y la generación del bundle Android. Las pruebas adicionales cubren el carrito, confirmación de seguimiento, límites de pagos y devoluciones, fechas, retiro/restauración, páginas de exportación, permisos de navegación y contraste de los temas.

La inspección visual en el dispositivo complementa estas pruebas. No se ejecutan ventas, cobros ni ajustes contra la demo para comprobar únicamente el diseño.

Revisión del 19 de octubre de 2026: 165 pruebas móviles y 17 de configuración Android aprobadas; tipos móviles y exportación Android correctos. El mapa del bundle contiene una sola instancia de React 19.0.0 y React Native 0.79.6. Las 163 pruebas web y su compilación también pasaron al compartir navegación y paginación. En el POCO se revisaron el acceso, el catálogo y Nueva venta en oscuro. Las operaciones de escritura y el guardado mediante la hoja de compartir no se ejecutaron contra datos reales durante esta revisión.

La revisión de presentación posterior organiza los listados en tarjetas por registro con estado, nombre, resumen y detalles/acciones desplegables; elimina la superficie gigante del módulo, convierte los estados de filtro en opciones compactas y presenta los saldos y reportes en indicadores. Los formularios administrativos de empresa, sucursales y roles empiezan cerrados hasta abrirlos. Los detalles conservan su contenido y las referencias completas.

Se verificaron en el POCO las tarjetas de productos en oscuro, la apertura de detalles con sus acciones y las ventas en claro. La revisión final conserva 165 pruebas móviles aprobadas y 17 comprobaciones de configuración Android. No se registraron operaciones comerciales durante la inspección visual.

APK 1.1.0 compilado, firma verificada e instalado en el POCO. Se confirmó el arranque independiente con Metro detenido y el puerto USB 8081 retirado. La pantalla de acceso se muestra sin errores de ejecución. La revisión autenticada del diseño se hizo en Expo Go; no se realizaron escrituras comerciales.

## Rediseño móvil 1.2.0 — 20 de octubre de 2026

Se reorganizó la interfaz nativa para seguir la jerarquía visual de la web: cabecera con marca y accesos, navegación inferior, menú de módulos con búsqueda, pestañas con iconos y panel de inicio con accesos e indicadores. Los permisos siguen determinando las páginas disponibles.

Los listados usan filas compactas con estado y detalles desplegables. Los formularios de alta y edición se presentan en pantallas independientes con secciones; los selectores de clientes, productos, usuarios y departamentos permiten buscar sin llenar la pantalla con opciones. Ventas y compras separan contacto, productos y revisión del total. PDF y Excel se eligen desde un panel de exportación.

Se corrigieron las claves de React al desplegar fragmentos anidados y la cabecera de los formularios Android. Las fichas conservan sus controles montados al plegarlas. El cierre sigue bloqueado mientras hay una escritura pendiente; las operaciones de resultado incierto conservan su revisión y protección contra duplicados.

Validación: tipos móviles, 168 pruebas móviles y 17 pruebas de configuración Android aprobadas. Se inspeccionaron Inicio y Nueva venta en oscuro y el catálogo en claro en el POCO mediante Expo Go, sin registrar operaciones comerciales. La revisión visual no equivale a ejecutar todas las operaciones de cada módulo.

APK 1.2.0 (código 6) compilado e instalado como actualización en el POCO. Firma y cuatro arquitecturas verificadas; bundle con una instancia de React y React Native. Arranque independiente comprobado con Metro detenido y sin redirección USB 8081, sin errores de ejecución en el registro Android. La app solicita iniciar sesión; el gestor de contraseñas del teléfono puede ofrecer la cuenta guardada.

## Jerarquía de acciones — APK 1.2.1

Se revisaron los controles de todos los módulos móviles y sus formularios auxiliares. Se migraron 74 acciones de texto a ActionButton en catálogo, categorías, almacenes, inventario, ventas/compras, caja, colaboradores, usuarios/roles, organización, activos, reportes, comprobantes y atención al cliente. Los botones ya existentes también reciben iconos y una jerarquía común a través de ese componente.

Crear, guardar, revisar y confirmar operaciones usan el acento principal; búsqueda, edición, actualización, exportación y paginación usan borde y superficie neutra; eliminación, retiro, desactivación y cancelación de registros usan rojo. Cancelar una edición o cerrar una pantalla conserva el estilo secundario. Se mantienen los manejadores, permisos, confirmaciones y condiciones de deshabilitación originales.

Los filtros seleccionables conservan su aspecto de opción y los controles con estado checked reciben también borde y superficie; el manual de atención usa botones desplegables. Se conserva el estilo propio de los diálogos, navegación y tarjetas interactivas, que ya delimitaban sus áreas pulsables.

Validación: tipos móviles, 172 pruebas móviles y 17 pruebas de configuración Android aprobadas. Las pruebas nuevas distinguen acciones destructivas de cierre/cancelación de formularios, y verifican la jerarquía de guardado, cobro, exportación, recuperación y paginación. No se ejecutaron escrituras comerciales para probar los estilos.
