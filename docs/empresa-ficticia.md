# Empresa ficticia inicial

Este comando crea en una transacción empresa, sucursal, rol, administrador y auditoría.
Solo admite una base sin usuarios; no sobrescribe cuentas ni contraseñas existentes.

Datos de demostración, sin identidad fiscal real:

- Empresa: Promaxima Demo — empresa ficticia.
- Identificador fiscal de prueba: DEMO-PROMAXIMA (no es un RFC válido para facturación).
- Sucursal: Sucursal de pruebas, código DEMO-01, Ciudad de México.
- Administrador: Administrador de pruebas.
- Correo de acceso: admin@promaxima.example (ficticio; no recibe correos).

En la raíz, confirma que .env usa MONGODB_DB_NAME=erp_app, la base actual de Render.
Después ejecuta en PowerShell:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm.cmd --workspace backend run admin:create:demo
```

Introduce tu contraseña dos veces. No se muestra en pantalla, no se envía al chat,
no se guarda en Git y solo se persiste su hash bcrypt en Atlas. Usa al menos 12
caracteres y como máximo 72 bytes UTF-8.

La creación se completa cuando el comando muestra su confirmación. Antes de
ejecutarlo, los datos solo están preparados en el código, no insertados en Atlas.

En la API de Render configura CORS_ORIGIN=https://proyectoerp-web.onrender.com.
Entra en https://proyectoerp-web.onrender.com con el correo ficticio y tu contraseña.
