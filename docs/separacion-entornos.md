# Separación de pruebas y producción

## Estado

La instalación actual es **demo**: API `proyectoerp-addi.onrender.com`, web `proyectoerp-web.onrender.com`, base `erp_app`. Contiene la empresa ficticia y debe seguir utilizándose solo para pruebas. No se trasladan sus documentos a producción.

El código incorpora validación antes de conectar, bloqueo del alta ficticia y aviso web basado en `/health/version`. `NODE_ENV=production` optimiza también la demo alojada; **ERP_ENVIRONMENT** identifica el uso de los datos. Por compatibilidad con el despliegue actual, el perfil predeterminado es `demo`.

**Pendiente de provisionar:** base, usuario Atlas y servicios Render de producción. La plantilla no crea recursos por estar en Git. Los controles de configuración no sustituyen los permisos de Atlas ni prueban que los secretos sean diferentes.

## Atlas

1. Mantener `erp_app` para la demo. Crear un usuario `erp_demo` con `readWrite` solamente sobre `erp_app`; no usar `readWriteAnyDatabase` ni una cuenta administradora en la aplicación. Cambiar la URI del servicio demo a este usuario y comprobar readiness y acceso.
2. Crear otro usuario `erp_production` con `readWrite` solamente sobre una base nueva `erp_production`. No copiar colecciones demo. La primera escritura autorizada creará la base si aún no existe.
3. Guardar cada contraseña únicamente en el proveedor/gestor de secretos. Configurar Network Access para los servicios correspondientes. Un clúster separado aporta mayor aislamiento de recursos; bases y usuarios separados en un clúster comparten capacidad y administración.
4. Verificar con cada usuario que puede escribir en su base y que recibe `Unauthorized` en la otra. Evitar pruebas sobre documentos existentes; usar una colección temporal nueva y eliminar únicamente esa colección. No declarar completada la separación hasta comprobar estas restricciones.

## Render

1. En el API actual añadir `ERP_ENVIRONMENT=demo`. Conservar su base y URLs. No reutilizar su JWT en producción.
2. Crear un Blueprint independiente desde `render.production.yaml` en este repositorio. No sincronizar esta plantilla sobre los servicios actuales. Se propone plan gratuito sin contratar recursos de pago; revisar disponibilidad y capacidad antes del uso real.
3. Introducir la URI del usuario de producción y un JWT nuevo de al menos 64 caracteres. Generarlo localmente con `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`; no pegarlo en chats ni Git. La generación automática de Render produce 44 caracteres y no satisface la política actual.
4. Usar las URLs efectivas que Render asigne: `API_URL=https://<api>/api/v1`, `CORS_ORIGIN=https://<web>`, `EMAIL_VERIFICATION_BASE_URL=https://<api>/api/v1` y `VITE_API_URL=https://<api>/api/v1`. No asumir que el nombre solicitado estará disponible. Completar correo transaccional propio si se va a utilizar.
5. Desplegar manualmente un commit que haya pasado CI. Verificar `/health/version` con `environment=production`, `/health/ready` con `database=erp_production` y que la web apunte al API nuevo. La plantilla desactiva futuros despliegues automáticos para permitir probar primero en demo.
6. Crear la empresa real y su administrador mediante un alta controlada; no ejecutar `admin:create:demo`. El alta real y la contraseña requieren los datos del propietario. Comprobar que el usuario demo y su token no acceden a producción, y viceversa.
7. Preparar un respaldo y restauración verificable propios para producción antes de introducir operaciones reales. La configuración local de respaldo actual apunta a demo y no cambia por crear un Blueprint.

## Criterios de cierre

- Dos credenciales Atlas con permisos cruzados denegados.
- Dos JWT diferentes, dos pares de URLs y bases independientes.
- Producción vacía de empresas/documentos demo; alta real validada.
- Flujo de acceso y operación verificado en cada entorno y respaldo propio.

Referencia del formato Blueprint y despliegue manual: https://render.com/docs/blueprint-spec .
