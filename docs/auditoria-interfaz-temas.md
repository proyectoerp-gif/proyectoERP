# Revisión visual de temas y accesibilidad

Revisión del 19 de octubre de 2026 con datos ficticios en una base local temporal.

## Problemas corregidos

- En Solicitudes de ayuda, los desplegables del manual y de las conversaciones conservaban fondos blancos y heredaban texto claro en modo oscuro. Ahora usan las superficies, bordes y textos del tema del ERP. Las fuentes del manual también cambian de color con el tema.
- A 320 píxeles, el ancho mínimo del cuerpo y varios grupos de botones de búsqueda y paginación provocaban desplazamiento horizontal. Los botones ahora se distribuyen en varias líneas cuando falta espacio, también en los selectores de productos, categorías, almacenes y cuentas.
- El panel de Apariencia solo aislaba el contenido de fondo para administradores. Ahora lo hace también en el acceso y para operadores; al cerrar restaura el estado anterior y el foco.

## Validación

- Navegación por las ocho áreas principales en claro y oscuro: Inicio, Ventas y clientes, Solicitudes de ayuda, Compras, Productos e inventario, Caja e informes, Equipo y empresa, Operación y control.
- Inspección de colores calculados del texto visible sobre fondos opacos: sin incidencias adicionales en las pantallas principales revisadas. Esta inspección no equivale a una certificación completa de accesibilidad.
- Administrador: manual abierto con respuesta y fuente, formulario de producto con selector de categoría abierto, tabla del catálogo, empresa y sucursales, nuevo proyecto y panel de cobro y entrega. No se confirmaron operaciones comerciales.
- Operador: ventas en claro y oscuro, panel de Apariencia, aislamiento del fondo, recorrido circular con Tab y Mayús+Tab, cierre con Escape.
- Acceso: el panel de Apariencia aísla el formulario y devuelve el foco al botón de ajustes al cerrarse.
- Anchos de 320 y 390 píxeles: catálogo, formulario y selector, manual de atención; sin desbordamiento horizontal del documento en las comprobaciones finales.
- Catálogo público: las preguntas frecuentes conservan su fondo claro y texto oscuro, independientemente de la preferencia del ERP.
- Compilación y comprobación de tipos de web; 163 pruebas de web aprobadas.

## Comprobación manual al modificar estilos

1. Abrir Apariencia y alternar Claro/Oscuro con el manual desplegado; después abrir un formulario en cada tema.
2. Comprobar fondos, texto, fuentes, campos, opciones seleccionadas, errores y botones habilitados.
3. Abrir un selector en un formulario a 320 píxeles; comprobar que Buscar, Ver todos y la paginación quedan dentro del panel.
4. Con una cuenta de operador y desde el acceso, abrir Apariencia y recorrer sus controles con teclado. Escape debe cerrar y devolver el foco.
5. Abrir el chat del catálogo público y sus preguntas frecuentes para comprobar que no heredan los colores del ERP.
