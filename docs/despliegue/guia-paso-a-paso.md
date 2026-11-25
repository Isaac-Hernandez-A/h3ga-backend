# Guía de despliegue en DigitalOcean (App Platform), paso a paso

Esta guía ordena lo que hay que hacer, con los comandos, para desplegar el backend con una base PostgreSQL administrada, probarlo con datos ficticios y destruirlo todo al final.

> **Estado:** nada de esto se ha ejecutado. Los comandos de `pnpm` son del repositorio y se probaron en local; los de `doctl` y el comportamiento de App Platform salen de la documentación del proveedor y **no se han probado aquí**. Antes de usar un comando de `doctl`, revisa sus opciones con `doctl <comando> --help`.
>
> **Credenciales:** las pones tú, en tu terminal o en el panel de DigitalOcean. Nunca las escribas en un archivo del repositorio ni las pegues en un chat. `.env`, `.env.pruebas` y `.env.*` están ignorados por git.

## 0. Antes de empezar

- Cuenta de DigitalOcean con método de pago. Todo lo de abajo genera costo mientras exista.
- En tu máquina: Node 22, pnpm (el de `packageManager` de `package.json`), `git`, `curl` y, opcional, `doctl` (`doctl auth init` con un token tuyo).
- La rama `main` del repositorio con `.do/app.yaml` (este PR).
- Región usada en el archivo: `nyc` (App Platform), `nyc1` (base) y `nyc3` (Spaces). Si cambias una, cámbiala en las tres.

## 1. Crear la base y el almacenamiento (una vez)

1. **Clúster PostgreSQL 16**, con una base y un usuario propios de la aplicación (no uses el usuario administrador `doadmin` para la API):

   ```bash
   doctl databases create h3ga-db --engine pg --version 16 --region nyc1 --size db-s-1vcpu-1gb --num-nodes 1
   doctl databases list
   ```

   Con el identificador (`<cluster-id>`) que muestra `list`:

   ```bash
   doctl databases db create <cluster-id> h3ga
   doctl databases user create <cluster-id> h3ga_app
   ```

2. **Acceso entrante (Trusted Sources).** El clúster solo debe aceptar a la app y a tu equipo mientras migras. Agrega tu IP pública (y la app, después de crearla en el paso 2):

   ```bash
   doctl databases firewalls append <cluster-id> --rule ip_addr:<tu-ip-publica>
   ```

3. **Certificado de la CA** del clúster (se usa en el paso 4):

   ```bash
   doctl databases get-ca <cluster-id>
   ```

   Guarda el PEM fuera del repositorio (por ejemplo `ca-bd.crt` en una carpeta tuya).

4. **Spaces:** crea el bucket (por ejemplo `h3ga-documentos`, región `nyc3`, archivos privados) y una **llave de acceso de Spaces** limitada a ese bucket. Se hace en el panel (Spaces Object Storage y API, Spaces Keys). Guarda la llave y el secreto solo en tu gestor de contraseñas.

## 2. Crear la app desde el repositorio

1. Edita los marcadores de `.do/app.yaml` en una copia local (no subas los valores si son reales; los nombres de clúster y de bucket no son secretos, pero revisa antes de commitear):
   - `databases[0].cluster_name`, `db_name` (`h3ga`) y `db_user` (`h3ga_app`).
   - `CORS_ORIGINS` (el origen del frontend; si todavía no existe, déjalo y vuelve en el paso 8).
   - `SPACES_BUCKET`.

2. Crea la app:

   ```bash
   doctl apps create --spec .do/app.yaml
   doctl apps list
   ```

   Anota el `<app-id>` y la URL pública (`https://h3ga-api-xxxxx.ondigitalocean.app`).

3. **El primer despliegue va a fallar, y es lo esperado:** las variables `SECRET` están sin valor, así que la API no arranca (sin `DATABASE_URL` ni `JWT_SECRET` válido). No intentes arreglarlo con valores en el archivo: sigue con el paso 3.

4. Agrega la app a Trusted Sources de la base: en el panel de la base, Settings, Trusted Sources, y elige la app.

## 3. Cargar las variables

En el panel: la app, Settings, el componente `api`, Environment Variables. Los valores no secretos ya vienen del archivo. Completa los `SECRET` (se guardan cifrados):

| Variable            | Valor                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | La URL de conexión del usuario `h3ga_app` a la base `h3ga` (panel de la base, Connection details). Puede traer `?sslmode=require`: la API lo quita y manda `DATABASE_SSL`. |
| `JWT_SECRET`        | Uno largo y aleatorio. Para generarlo sin mostrarlo en pantalla compartida: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`               |
| `SPACES_KEY`        | La llave de acceso del paso 1.4.                                                                                                                                           |
| `SPACES_SECRET`     | El secreto de esa llave.                                                                                                                                                   |
| `ETL_EQUIVALENCIAS` | Opcional. El **contenido** del JSON asesor a correo. Para las pruebas ficticias, el contenido de `test/fixtures/etl/equivalencias-asesores.json`.                          |

La base se conecta con `DATABASE_SSL=true`, que ya viene en el archivo. Si la verificación del certificado falla y necesitas la CA, agrega `DATABASE_SSL_CA_BASE64` (tipo Secret) con el PEM del paso 1.3 en base64, en una sola línea (`base64 -w0 ca-bd.crt`; en PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("ca-bd.crt"))`). Así no depende de los saltos de línea del panel, que al pegar el PEM suelen aplanarse y provocan `SELF_SIGNED_CERT_IN_CHAIN`. `DATABASE_SSL_CA` sigue funcionando y la API reconstruye el PEM aplanado. Para depurar (no para dejarlo así) existe `DATABASE_SSL=no-verify`.

Despliega de nuevo:

```bash
doctl apps create-deployment <app-id>
doctl apps list-deployments <app-id>
```

Cuando el despliegue termine, comprueba la API (el health check de la plataforma consulta la base):

```bash
curl -s https://<url-de-la-app>/api/v1/health/db
# {"status":"ok","base_de_datos":"ok"}
```

Si responde 503 la API vive pero no ve la base: revisa Trusted Sources, `DATABASE_URL` y `DATABASE_SSL`.

## 4. Migraciones y Supervisor (desde tu equipo)

Las migraciones **no** corren al desplegar (regla 1 de CLAUDE.md): se aplican a mano, con SQL versionado. Ejecútalas desde la raíz del repositorio, con las variables solo en esa terminal.

En bash:

```bash
export DATABASE_URL='<la-url-de-conexion-del-paso-3>'
export DATABASE_SSL=true
export DATABASE_SSL_CA="$(cat /ruta/fuera-del-repo/ca-bd.crt)"
node -e "console.log(new URL(process.env.DATABASE_URL).hostname)"   # confirma que es la base de DigitalOcean y no la local
```

En PowerShell:

```powershell
$env:DATABASE_URL = '<la-url-de-conexion-del-paso-3>'
$env:DATABASE_SSL = 'true'
$env:DATABASE_SSL_CA = Get-Content C:\ruta\fuera-del-repo\ca-bd.crt -Raw
node -e "console.log(new URL(process.env.DATABASE_URL).hostname)"
```

Las variables de la terminal mandan sobre las de `.env` (node no pisa lo que ya está definido), pero **confirma el servidor con el comando de arriba antes de seguir**.

1. **Primero, en seco:** lista lo pendiente sin tocar nada. En una base nueva deben salir las 13 migraciones.

   ```bash
   pnpm db:migrate --dry-run --permitir-remota
   ```

2. **Aplicar:** cada migración corre en su transacción y queda registrada en `schema_migrations`.

   ```bash
   pnpm db:migrate --permitir-remota
   pnpm db:migrate --dry-run --permitir-remota    # debe decir: Base al día
   ```

3. **Supervisor inicial** (la contraseña la eliges tú; entre 8 y 72 caracteres; no se guarda en el repositorio):

   ```bash
   export SEED_SUPERVISOR_CORREO='<correo-del-supervisor>'
   export SEED_SUPERVISOR_CONTRASENA='<contrasena-elegida>'
   pnpm db:seed:supervisor --permitir-remota
   ```

   (En PowerShell: `$env:SEED_SUPERVISOR_CORREO = '...'` y `$env:SEED_SUPERVISOR_CONTRASENA = '...'`.)

4. Comprueba el inicio de sesión del Supervisor contra la URL pública (`POST /api/v1/auth/login`) con un cliente de tu elección; no pegues la contraseña en un chat.

## 5. Datos ficticios de prueba (3 a 5 clientes)

`pruebas:datos` crea 4 usuarios de prueba (Supervisor, 2 Asesores, Auxiliar) con contraseñas aleatorias que quedan en `.env.pruebas` (ignorado por git), carga clientes ficticios con el ETL real y **1,000 eventos de agenda** del Asesor 1. Contra una base que no es local exige el flag `--permitir-staging`.

Con las variables del paso 4 todavía en la terminal, apunta `TEST_DATABASE_URL` a la misma base:

```bash
export TEST_DATABASE_URL="$DATABASE_URL"
pnpm pruebas:datos --permitir-staging --clientes 5
```

- Avisa a qué servidor y base va a escribir (sin usuario ni contraseña) y termina con una línea como: `4 usuarios, 5 clientes (ETL: 5 cargados, 0 rechazados), 1000 eventos`.
- `--clientes N` acepta 3, 4 o 5 (cualquier entero positivo): carga los primeros N clientes del Excel ficticio.
- Los correos de prueba son de `ejemplo.test` y no pertenecen a nadie. Solo borra lo que cuelga de esos 4 usuarios.
- **Mantén esa base aparte de datos reales:** el flag existe para staging. Si la base ya tiene clientes reales, no la uses para esto.

### Newman contra la URL pública (opcional)

```bash
PRUEBAS_BASE_URL=https://<url-de-la-app>/api/v1 pnpm pruebas:newman
```

- Con solo 5 clientes, la **carpeta 09 (ETL)** va a fallar: sus aserciones esperan la carga completa de 44. Es esperado; para que pase, carga sin `--clientes` y pon el contenido del JSON de equivalencias ficticio en `ETL_EQUIVALENCIAS` de la app.
- **Newman reescribe los reportes de `docs/pruebas-integrales/postman/`.** Después de correrlo contra la nube, restaura los de local con `git restore docs/pruebas-integrales/postman` (o muévelos antes) para no commitear mediciones de otro entorno.
- Los tiempos medidos contra la nube son de red real, no los de local.

## 6. Destruir todo al final

En este orden (la app depende de la base y del bucket, así que se borra primero):

1. **Quitar los datos ficticios** (con las variables del paso 4 en la terminal):

   ```bash
   pnpm pruebas:datos:limpiar --permitir-staging
   ```

2. **Borrar la app** (detiene el cobro de App Platform):

   ```bash
   doctl apps delete <app-id>
   ```

3. **Borrar el clúster de la base** (se pierde su contenido; haz antes una copia si algo debe conservarse):

   ```bash
   doctl databases delete <cluster-id>
   ```

4. **Spaces:** vacía el bucket y bórralo (panel), y **elimina la llave de acceso de Spaces** (panel, API, Spaces Keys). Un bucket con archivos sigue cobrando.
5. **Credenciales locales:** cierra las terminales usadas (las variables `DATABASE_URL`, `SPACES_*`, etc. mueren con ellas), borra `ca-bd.crt` y `.env.pruebas`, y revoca el token de `doctl` si lo creaste solo para esto.
6. **Comprobar que no queda nada que cobre:**

   ```bash
   doctl apps list
   doctl databases list
   ```

   y revisa Spaces y Billing en el panel.

## Qué falta por comprobar en la nube real

- Que `DATABASE_SSL=true` verifique el certificado de la base administrada (con o sin `DATABASE_SSL_CA`).
- Que el build de App Platform con `pnpm` y el espacio de trabajo funcione tal cual está en `.do/app.yaml`.
- Que App Platform acepte las variables `SECRET` sin valor al crear la app desde el archivo (si no, se crean desde el panel).
- Subir y descargar un documento (Spaces) y generar un PDF (fuentes) en la app desplegada.
- El frontend (`h3ga-frontend`) no tiene archivo de App Platform todavía: al publicarlo, vuelve a fijar `CORS_ORIGINS` con su URL.
