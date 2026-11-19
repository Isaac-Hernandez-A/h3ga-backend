# Preparación para producción (Actividad 7)

Fecha: 2026-11-18. Solo diagnóstico y plan: no se desplegó nada, no se creó ningún recurso en la nube y no se tocó código. Las rutas con número de línea son del repositorio en la rama de esta actividad.

## 1. Reporte del backend

### Migraciones

- `synchronize: false` y `migrationsRun: false` en `apps/api/src/app.module.ts:64-65`. La API nunca cambia el esquema al arrancar.
- Comando: `pnpm db:migrate` (`package.json:19`), que corre `db/migrate.mjs`. Aplica en orden los 13 archivos de `db/migrations/`, cada uno en su transacción, con registro y checksum en `schema_migrations` (`db/migrate.mjs:81-86,114-124`) y un candado contra corridas simultáneas (`:114`).
- Tiene `--dry-run` (`:22`) para listar lo pendiente sin tocar nada.
- **Para producción:** sirve, pero por defecto se niega a correr contra una base que no sea local; hay que pasar `--permitir-remota` (`db/migrate.mjs:67-71`). Lo mismo hace `db/seed-supervisor.mjs:49-53`.
- **Pendiente de comprobar:** el script conecta con `new pg.Client({ connectionString: url })` (`db/migrate.mjs:74`) sin opción `ssl`. La base administrada de DigitalOcean exige TLS; con `sslmode=require` en la URL puede bastar o puede fallar por la cadena de certificados. No se pudo comprobar sin una base real. Ver sección 3.
- El Supervisor inicial se crea con `pnpm db:seed:supervisor` (`package.json:20`, variables `SEED_SUPERVISOR_*`).

### Documentos subidos

- **Ya está resuelto en código.** Hay dos adaptadores: disco local (`documentos/storage/local-storage.adapter.ts`) y Spaces (`documentos/storage/spaces-storage.adapter.ts`, con `@aws-sdk/client-s3`). Se elige con `STORAGE_DRIVER` (`documentos/storage/crear-storage.ts:14-30`); el valor por defecto es `local`.
- Para Spaces no cambia código: `STORAGE_DRIVER=spaces` y las cinco variables `SPACES_*` (`documentos/storage/variables-spaces.ts`). Si falta alguna, la API no arranca y el mensaje nombra cuáles (`common/config/validar-entorno.ts:24-37`).
- En App Platform el disco es efímero, así que `local` perdería los documentos en cada despliegue: producción debe usar `spaces`.
- El cliente S3 se crea con región, endpoint y credenciales (`spaces-storage.adapter.ts:75-81`). Falta probarlo contra un Spaces real: hoy solo hay pruebas con cliente simulado.

### Variables de entorno

| Variable                                                                         | ¿Obligatoria?                             | ¿Secreto?                     | Notas                                                                                                         |
| -------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                   | Sí (`app.module.ts:61`, `getOrThrow`)     | **Sí**                        | Incluye usuario y contraseña.                                                                                 |
| `JWT_SECRET`                                                                     | Sí en producción                          | **Sí**                        | Con `NODE_ENV=production` la API no arranca si falta o es el marcador de ejemplo (`validar-entorno.ts:9-15`). |
| `NODE_ENV`                                                                       | Recomendada (`production`)                | No                            | Activa la validación anterior.                                                                                |
| `PORT`                                                                           | No (3001 por defecto, `main.ts:11`)       | No                            | App Platform inyecta `PORT`; la API ya lo respeta.                                                            |
| `CORS_ORIGINS`                                                                   | Sí en la práctica                         | No                            | Sin valor solo permite `http://localhost:3000` (`common/config/cors.ts:3`). Sin comodines.                    |
| `STORAGE_DRIVER`                                                                 | Sí (`spaces`)                             | No                            | Por defecto `local`.                                                                                          |
| `SPACES_KEY`, `SPACES_SECRET`                                                    | Con `spaces`                              | **Sí**                        | Llave de acceso y secreto.                                                                                    |
| `SPACES_REGION`, `SPACES_ENDPOINT`, `SPACES_BUCKET`                              | Con `spaces`                              | No                            |                                                                                                               |
| `STORAGE_LOCAL_DIR`                                                              | Solo con `local`                          | No                            | Por defecto `./almacenamiento`.                                                                               |
| `ETL_EQUIVALENCIAS`                                                              | Solo para importar Excel por la API       | No (el contenido son correos) | **Ruta de un archivo JSON** (`etl/etl.service.ts:255`). Sin ella `POST /etl/importaciones` responde 503.      |
| `ETL_SALIDA`                                                                     | No (`./etl-salida`, `etl.service.ts:285`) | No                            | Carpeta donde se escribe el reporte de cada importación; en App Platform es disco efímero.                    |
| `SEED_SUPERVISOR_CORREO`, `SEED_SUPERVISOR_CONTRASENA`, `SEED_SUPERVISOR_NOMBRE` | Solo al crear el Supervisor (script)      | Contraseña: **sí**            | No las lee la API; las lee `db/seed-supervisor.mjs`.                                                          |
| `TEST_DATABASE_URL`                                                              | No en producción                          | **Sí**                        | Solo pruebas locales y CI.                                                                                    |
| `PRUEBAS_*` (correos y contraseñas de los 4 usuarios de Newman)                  | Solo para Newman                          | **Sí**                        | Se pasan por entorno; nunca en el repositorio.                                                                |

Los marcadores están en `.env.example`. Secretos: `DATABASE_URL`, `JWT_SECRET`, `SPACES_KEY`, `SPACES_SECRET` y las contraseñas de los scripts.

### CORS y HTTPS

- CORS: `app.setup.ts:11` llama a `enableCors` con los orígenes de `CORS_ORIGINS`; sin la variable solo `http://localhost:3000` (`cors.ts:3`). Métodos `GET, POST, PUT, PATCH, DELETE, OPTIONS`, sin credenciales, `Content-Disposition` expuesta (`cors.ts:24-29`). Rechaza comodines y entradas vacías (`cors.ts:11-15`).
- **Qué cambiar:** solo configuración. Poner en `CORS_ORIGINS` el origen exacto del frontend publicado (con `https://`, sin barra final). No hace falta tocar código.
- HTTPS: la API escucha HTTP simple (`main.ts:12`). App Platform termina el TLS delante y entrega `https://` al público, así que no hay que configurar certificados en el código. La API no redirige HTTP a HTTPS por sí misma (lo hace la plataforma).
- `listen(port)` sin host abre todas las interfaces, que es lo que App Platform espera.

### Salud

- Existe `GET /api/v1/health`, pública, que responde `{ "status": "ok" }` (`health/health.controller.ts:8-15`).
- **Sirve como health check de vida del proceso**, pero **no consulta la base de datos**: respondería 200 aunque PostgreSQL esté caído.

### Construcción y arranque

- No hay Dockerfile, `Procfile` ni archivo de App Platform en el repositorio.
- Construcción: `pnpm --filter @h3ga/api build` (`nest build`; copia los recursos de los PDF por `nest-cli.json`). Genera `apps/api/dist/main.js`.
- Arranque: `node dist/main` desde `apps/api` (script `start` de `apps/api/package.json`).
- **Cuidado:** `pnpm build` en la raíz corre `pnpm -r build`, que incluye `apps/web` (un Nuxt de relleno; el frontend real está en el repositorio `h3ga-frontend`). En App Platform hay que usar el filtro de la API.
- Node: `engines` pide `>=22.9` (`package.json:7`); CI usa 22.
- Swagger se publica siempre en `/api/docs` (`main.ts:10`, `swagger.setup.ts:6`), también en producción.

## 2. Plan mínimo de despliegue (App Platform + PostgreSQL administrado)

No se ejecuta nada hasta que se apruebe. Orden:

1. **Base.** Crear el clúster PostgreSQL 16 administrado, la base y un usuario de aplicación. Restringir el acceso entrante a la app (Trusted Sources). Guardar la URL como secreto de App Platform.
2. **Spaces.** Crear el bucket y una llave de acceso limitada a ese bucket. Secretos: `SPACES_KEY` y `SPACES_SECRET`.
3. **Migraciones.** Desde una máquina autorizada (o un job de una sola ejecución): `pnpm db:migrate -- --dry-run --permitir-remota`, revisar la lista y luego `pnpm db:migrate -- --permitir-remota`. Después `pnpm db:seed:supervisor -- --permitir-remota` con una contraseña propia. Las migraciones **no** corren solas al desplegar, como pide la regla 1 de CLAUDE.md.
4. **API.** Componente de servicio desde GitHub (rama `main`), build `pnpm install --frozen-lockfile && pnpm --filter @h3ga/api build`, ejecución `node apps/api/dist/main.js`, health check `GET /api/v1/health`. Variables: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET` (largo y aleatorio), `STORAGE_DRIVER=spaces`, las cinco `SPACES_*` y `CORS_ORIGINS` (se completa en el paso 5).
5. **Frontend.** Sitio o servicio de Nuxt desde `h3ga-frontend`, con `NUXT_PUBLIC_API_BASE=https://<url-de-la-api>/api/v1`. Con la URL final del frontend, volver a la API y fijar `CORS_ORIGINS`.
6. **Verificación.** Salud (`/api/v1/health`), inicio de sesión del Supervisor, subir y descargar un documento (confirma Spaces) y un PDF (confirma las fuentes).

### Newman contra la URL pública

La colección toma la dirección de `PRUEBAS_BASE_URL` (`scripts/postman/correr-newman.mjs:19`, `medir-tiempos.mjs:25`). El obstáculo es `pnpm pruebas:datos`: solo corre contra una base local cuyo nombre termina en `_test` (`apps/api/src/scripts/preparar-datos-integrales.ts:47-55`). Opciones:

- **A (recomendada):** probar contra una app y una base de **staging** separadas, no la de producción. Los datos de prueba se cargarían con `pruebas:datos`, lo que exige relajar ese candado (sección 3, cambio 5).
- **B:** solo las carpetas que no escriben (salud, acceso, matriz de acceso) contra producción. Las carpetas de clientes, F1, agenda y ETL crean datos y no deben correr en producción.

`pruebas:tiempos` mediría la red real y no la computadora local: los umbrales de RNF-01 se revisan igual y se reportan como medición de nube.

### Rollback

- **API:** App Platform conserva los despliegues anteriores; se revierte al despliegue previo desde el panel.
- **Variables:** una variable mal puesta se corrige y se vuelve a desplegar; `CORS_ORIGINS` y `JWT_SECRET` no tocan datos.
- **Base:** no hay migraciones hacia atrás ni se permiten `DROP` o `TRUNCATE` (regla 1). El rollback de esquema es una **migración nueva** que corrige. Antes de cada migración en producción, tomar una copia de seguridad de la base administrada y probarla primero en staging.
- **Documentos:** Spaces no se toca al revertir la API.

## 3. Cambios de código necesarios

| #   | Cambio                                                                                                                                                                                                                                                    | Estimado             | Riesgo para las 738 pruebas                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **TLS hacia la base.** TypeORM recibe solo `url` (`app.module.ts:61`) y no hay opción `ssl`; el runner de migraciones tampoco. Hace falta una variable (por ejemplo `DATABASE_SSL`) que active TLS con la CA de DigitalOcean, en la API y en los scripts. | 30 a 60 min          | Bajo si es opcional y sin ella todo sigue igual, pero toca `app.module.ts`, que cargan casi todas las suites. **Aviso antes de tocar.**                                         |
| 2   | **Equivalencias del ETL como contenido y no como ruta.** `ETL_EQUIVALENCIAS` es una ruta (`etl.service.ts:255`); en App Platform no hay dónde dejar un JSON con correos reales sin versionarlo. Aceptar el JSON en una variable.                          | 30 a 60 min          | Bajo: se agrega una rama nueva y se conserva la ruta. Afecta el servicio del ETL y sus pruebas. **Aviso antes de tocar.**                                                       |
| 3   | **Salud con base.** Agregar una ruta que haga `SELECT 1` y dejar `/health` como está.                                                                                                                                                                     | menos de 30 min      | **Sí rompe si no se actualiza:** `acceso-matriz.spec.ts:186` exige exactamente 119 rutas y la matriz `docs/pruebas-matriz-acceso.csv` también cambia. **Aviso antes de tocar.** |
| 4   | **Swagger en producción.** Ocultar `/api/docs` con `NODE_ENV=production`, o dejarlo por decisión explícita.                                                                                                                                               | menos de 30 min      | Bajo: `swagger.e2e.spec.ts` no fija `NODE_ENV`.                                                                                                                                 |
| 5   | **Candado de base local en `pruebas:datos`.** Para cargar datos de prueba en staging habría que permitir otra base `*_test` no local con una bandera explícita.                                                                                           | 30 a 60 min          | Bajo para las pruebas, pero relaja una protección: decisión tuya.                                                                                                               |
| 6   | **Archivo de App Platform (`.do/app.yaml`)** con build, arranque, health check y variables sin valores.                                                                                                                                                   | menos de 30 min      | Ninguno: no toca código.                                                                                                                                                        |
| 7   | **Probar contra Spaces y la base reales** (migraciones, TLS, subir y bajar un documento, PDF).                                                                                                                                                            | 1 a 3 h, con cuentas | No es código; depende de que existan los recursos.                                                                                                                              |

**Tardan más de 30 minutos:** 1, 2, 5 y la prueba real (7). **Pueden romper pruebas actuales:** el 3 con seguridad si no se actualiza la matriz; el 1 y el 2 en menor grado, por tocar módulos que usan muchas suites. Ninguno se ha tocado; se avisa antes de empezar cada uno.

## 4. Lo que no se verificó

- Nada se probó contra DigitalOcean (base, Spaces ni App Platform): todo sale de leer el código.
- Si `sslmode=require` basta para `pg` y TypeORM con la CA de DigitalOcean depende de la versión de `pg` (8.23.1) y no se comprobó.
- No se revisó el frontend más allá de que `nuxt.config.ts` toma la API de `NUXT_PUBLIC_API_BASE`.
