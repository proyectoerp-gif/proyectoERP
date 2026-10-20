# APK de Núcleo ERP para Android

El APK incluye la interfaz y funciona sin Expo Go, sin cable USB y sin Metro.
Para iniciar sesión y consultar o registrar datos necesita acceso a internet y a
la API del entorno elegido al compilar. La página pública y el chatbot se abren
en el navegador desde el acceso Página web.

## Compilar en Windows

Desde la raíz del repositorio:

```powershell
$env:EXPO_PUBLIC_API_URL='https://proyectoerp-addi.onrender.com/api/v1'
$env:EXPO_PUBLIC_STOREFRONT_URL='https://proyectoerp-web.onrender.com/tienda'
npm.cmd run android:release
```

Estas direcciones corresponden a **Demo**. Para otro entorno hay que configurar
ambas direcciones antes de compilar. No se incorporan contraseñas ni claves del
backend al APK; el usuario inicia sesión con su cuenta y la API aplica permisos.
El comando rechaza endpoints de API inseguros o incompletos y no carga `.env`.

Se requieren JDK 21 y Android SDK 35, Build Tools 35.0.0, NDK 27.1.12297006 y
CMake 3.22.1. Gradle descarga sus dependencias la primera vez. El script busca
Java en JAVA_HOME, `.tools/android-build/java`, `%USERPROFILE%/.jdks` y Android
Studio. Si no existe ANDROID_HOME, reconoce el SDK local en
`.tools/android-build/sdk`. Las herramientas y cachés no se incluyen en Git.

La configuración del daemon acepta cualquier distribución de JDK 21, sin exigir
un runtime de JetBrains. Cuando una red utiliza certificados corporativos ya
instalados en Windows, puede usarse su almacén sin desactivar la validación TLS:

```powershell
$env:JAVA_TOOL_OPTIONS='-Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NONE'
```

El resultado se guarda en:
`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.

## Instalar y verificar

```powershell
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n com.anonymous.erpuniversalmodular/.MainActivity
```

No desinstalar una versión anterior si Android rechaza la actualización por
firma distinta: primero revisar el certificado y los datos locales que se
perderían. Expo Go y Núcleo ERP son aplicaciones separadas y pueden coexistir.

Tras instalar, comprobar el acceso, navegación, temas, búsqueda y apertura de
una ficha, sin registrar movimientos de prueba en datos reales. Para verificar
su independencia de Metro, cerrar Expo Go y detener el servidor de desarrollo.
Las exportaciones PDF y Excel usan el menú de compartir del teléfono.

## Firma

La variante release utiliza actualmente el certificado de desarrollo del
proyecto. Es un APK para pruebas e instalación directa, no una entrega preparada
para Google Play. La publicación requiere una clave de firma propia y un AAB.
Conservar el mismo certificado es necesario para futuras actualizaciones sin
reinstalar la app.

## APK verificado en esta computadora

- Versión 1.2.0, código 6; nombre visible Núcleo ERP.
- Copia para compartir: `dist/android/Nucleo-ERP-demo-1.2.0.apk` (aproximadamente 57 MiB).
- Compilación Gradle `assembleRelease` correcta; certificado y cuatro arquitecturas verificados con las herramientas Android.
- Instalado en el POCO y abierto desde `com.anonymous.erpuniversalmodular/.MainActivity` con Metro detenido y sin el túnel USB del puerto 8081.
- Pantalla de acceso visible y sin errores JavaScript/Android en el arranque. El acceso autenticado y los módulos se inspeccionaron en Expo Go; después de la instalación independiente el usuario debe iniciar sesión de nuevo.
- Los APK y sus comprobaciones SHA-256 permanecen fuera de Git, en `dist/android`.
