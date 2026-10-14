# Conexión local a Atlas en Windows

Si MongoDB no está disponible y la consulta DNS SRV devuelve ECONNREFUSED,
configura en el .env local:

```dotenv
MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8
```

Es opcional y solo cambia el resolver de consultas DNS del proceso Node del ERP.
No modifica la configuración de Windows. En Render deja esta variable sin definir
salvo que un diagnóstico de ese entorno indique que es necesaria.

En esta computadora, Node 24 también requiere usar los certificados de confianza
del sistema. En PowerShell, antes de iniciar la API:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm.cmd run dev:api
```

En otra terminal, desde la raíz:

```powershell
npm.cmd --workspace backend run check:mongodb
```

El chequeo carga PORT del .env y termina sin forzar process.exit durante el cierre
de las conexiones HTTP. No se desactiva la validación de certificados TLS.

Mantén MONGODB_URI y JWT_SECRET en .env o en las variables privadas de Render.
