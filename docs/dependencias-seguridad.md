# Revisión de dependencias

## Resultado

La auditoría del conjunto completo pasó de **42 paquetes afectados (28 altos, 14 moderados)** a **32 (26 altos, 6 moderados)**. No hay avisos críticos en esta revisión. Estas cifras incluyen dependencias que npm marca por heredar el problema de otro paquete: no representan 32 vulnerabilidades independientes.

Las auditorías por workspace con `--omit=dev` devuelven **cero avisos en backend y cero en web**. Esto describe el grafo de dependencias de ejecución de esos paquetes, no una certificación de seguridad del ERP ni una prueba de explotación. Una instalación del monorepo completo sigue incluyendo las herramientas móviles afectadas.

## Cambios instalados

| Consumidor | Dependencia | Antes | Ahora |
|---|---|---|---|
| Metro de Expo | PostCSS | 8.4.49 | 8.5.30 |
| Herramientas Xcode | UUID | 7.0.3 | 11.1.1 |
| Ambas versiones instaladas de Metro | image-size | 1.2.1 | 2.0.4 |

Se mantienen Expo 53.0.27, React Native 0.79.6 del workspace móvil, React 19 móvil y React 18 web. La copia transitiva previa de React Native 0.76.9 sigue presente; no se cambió la arquitectura nativa ni se intentó una migración completa de SDK.

Se fijaron overrides acotados para PostCSS y UUID y uno general para image-size. El lockfile conserva las versiones e integridades oficiales del registro npm. No se cambiaron las otras versiones del ERP. La dependencia `queue` dejó de ser necesaria por image-size.

## Compatibilidad de imágenes

image-size 2 usa una exportación nombrada y ya no admite rutas de archivo en su función síncrona. Las dos versiones de Metro existentes, 0.81.5 y 0.82.5, necesitan conservar ambas entradas: bytes y rutas.

`scripts/metro-image-size-compat.cjs`, ejecutado por `postinstall`, adapta únicamente la llamada de esas versiones de Metro: usa `imageSize` y lee los bytes cuando recibe una ruta. No modifica el parser corregido ni su número de versión. Comprueba las versiones de los consumidores y las librerías instaladas; si cambian de forma inesperada, detiene la instalación para revisar la adaptación. Es idempotente y no necesita Metro en instalaciones limitadas a backend o web.

El Dockerfile copia este script antes de instalar dependencias y usa el mismo npm fijado. No se ejecutó un build Docker local; la topología y los otros pendientes de Docker Compose no se modificaron.

## Instalación reproducible

Se reprodujo el [fallo de npm 11 con overrides en workspaces](https://github.com/npm/cli/issues/9514): puede mostrar dependencias corregidas como inválidas e ignorar las sustituciones al actualizar. Se verificó el árbol válido con npm 10.9.8 y se fijó esa versión en `packageManager`, `engines` y CI. No se modificó el npm global de la computadora del usuario.

Desde la raíz, en PowerShell:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npx.cmd --yes npm@10.9.8 ci
npm.cmd run test:dependency-security
```

La instalación normal ejecuta `postinstall`. Si se usa `--ignore-scripts`, hay que ejecutar después `node scripts/metro-image-size-compat.cjs` antes de generar el bundle móvil. No se debe sustituir por `npm audit fix --force`: propone cambios incompatibles, incluido retroceder Expo.

## Avisos que permanecen abiertos

| Librería | Versión instalada | Problema | Estado publicado |
|---|---|---|---|
| braces | 3.0.3 | Agotamiento de pila con patrones profundamente anidados | [Sin versión corregida](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |
| node-forge | 1.4.0 | Verificación permisiva de firmas RSA PKCS#1 v1.5 | [Sin versión corregida](https://github.com/advisories/GHSA-86w9-cpqp-85rv) |
| sprintf-js | 1.0.3 | Precisión no acotada en cadenas de formato | [Sin versión corregida](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) |

Los 32 avisos restantes derivan de estas tres librerías en las herramientas de Expo/React Native, sus servidores de desarrollo, certificados, configuración y transformación/pruebas. No se silencian ni se consideran resueltos. Se deben incorporar los parches cuando existan o evaluar una sustitución/migración de sus consumidores con pruebas nativas. No exponer servidores de desarrollo al público ni procesar proyectos, patrones o certificados no confiables con estas herramientas mientras sigan pendientes.

Esta revisión no creó tareas programadas ni un monitor: los estados anteriores corresponden a las consultas guardadas en `dependencias-*.json`.

## Verificación

- Instalación desde el lockfile; resolución válida de los overrides con npm 10.9.8.
- TypeScript en los tres workspaces y compilación de backend/web.
- Pruebas de backend, web y móvil existentes.
- Cuatro comprobaciones nuevas: API de PostCSS, generador UUID de Xcode, lectura de PNG como buffer y ruta por ambas versiones de Metro, y rechazo acotado de muestras ICNS/HEIF/JXL malformadas en un proceso con tiempo límite.
- Exportación Android correcta con 715 módulos, imagen y mapas de código. No sustituye una compilación APK ni pruebas en dispositivo.
- CI ejecuta las comprobaciones de compatibilidad y audita las dependencias de ejecución de backend/web, además de las pruebas de transacciones y acceso existentes.
