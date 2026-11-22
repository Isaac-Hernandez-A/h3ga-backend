# Preparación para producción (Actividad 7)

Fecha del reporte: 2026-11-18. Actualizado el 2026-11-22.

**Estado actual:** los cambios de código 1 a 5 de la sección 3 ya están hechos y probados (PR #9 en `main`), y existe `.do/app.yaml`. Solo falta lo que exige la nube real (sección 3, cambio 7). Nada se ha desplegado ni se creó ningún recurso en la nube. Orden exacto y comandos: [`docs/despliegue/guia-paso-a-paso.md`](despliegue/guia-paso-a-paso.md).

Las secciones 1 y 2 conservan el diagnóstico original; sus números de línea son de la fecha del reporte y lo que ya cambió lleva una nota «Actualizado».

## 1. Reporte del backend

### Migraciones

- `synchronize: false` y `migrationsRun: false` en `apps/api/src/app.module.ts:64-65`. La API nunca cambia el esquema al arrancar.
- Comando: `pnpm db:migrate` (`package.json:19`), que corre `db/migrate.mjs`. Aplica en orden los 13 archivos de `db/migrations/`, cada uno en su transacción, con registro y checksum en `schema_migrations` (`db/migrate.mjs:81-86,114-124`) y un candado contra corridas simultáneas (`:114`).
- Tiene `--dry-run` (`:22`) para listar lo pendiente sin tocar nada.
- **Para producción:** sirve, pero por defecto se niega a correr contra una base que no sea local; hay que pasar `--permitir-remota` (`db/migrate.mjs:67-71`). Lo mismo hace `db/seed-supervisor.mjs:49-53`.
- **Actualizado (PR #9):** el script ya acepta `DATABASE_SSL` (`db/ssl-bd.mjs`), igual que la API (`common/config/ssl-bd.ts`). Con `DATABASE_SSL=true` verifica el certificado (CA opcional en `DATABASE_SSL_CA`) y quita `?sslmode=` de la URL. Contra la base local, sin TLS, falla con «The server does not support SSL connections», lo que muestra que la opción se aplica. **Sigue pendiente comprobarlo contra la base administrada real.**
- El Supervisor inicial se crea con `pnpm db:seed:supervisor` (`package.json:20`, variables `SEED_SUPERVISOR_*`).

### Documentos subidos

- **Ya está resuelto en código.** Hay dos adaptadores: disco local (`documentos/storage/local-storage.adapter.ts`) y Spaces (`documentos/storage/spaces-storage.adapter.ts`, con `@aws-sdk/client-s3`). Se elige con `STORAGE_DRIVER` (`documentos/storage/crear-storage.ts:14-30`); el valor por defecto es `local`.
- Para Spaces no cambia código: `STORAGE_DRIVER=spaces` y las cinco variables `SPACES_*` (`documentos/storage/variables-spaces.ts`). Si falta alguna, la API no arranca y el mensaje nombra cuáles (`common/config/validar-entorno.ts:24-37`).
- En App Platform el disco es efímero, así que `local` perdería los documentos en cada despliegue: producción debe usar `spaces`.
- El cliente S3 se crea con región, endpoint y credenciales (`spaces-storage.adapter.ts:75-81`). Falta probarlo contra un Spaces real: hoy solo hay pruebas con cliente simulado.

### Variables de entorno

| Variable                                                                         | ¿Obligatoria?                             | ¿Secreto?                     | Notas                                                                                                                                                                       |
| -------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                   | Sí (`app.module.ts:61`, `getOrThrow`)     | **Sí**                        | Incluye usuario y contraseña.                                                                                                                                               |
| `DATABASE_SSL`                                                                   | No (`true` en producción)                 | No                            | Actualizado: activa TLS hacia la base (`true`, `no-verify` o vacío). Sin ella no hay TLS.                                                                                   |
| `DATABASE_SSL_CA`                                                                | No                                        | No                            | Actualizado: contenido PEM de la CA del servidor; acepta `                                                                                                                  |
| ` escritos como texto.                                                           |
| `JWT_SECRET`                                                                     | Sí en producción                          | **Sí**                        | Con `NODE_ENV=production` la API no arranca si falta o es el marcador de ejemplo (`validar-entorno.ts:9-15`).                                                               |
| `NODE_ENV`                                                                       | Recomendada (`production`)                | No                            | Activa la validación anterior.                                                                                                                                              |
| `PORT`                                                                           | No (3001 por defecto, `main.ts:11`)       | No                            | App Platform inyecta `PORT`; la API ya lo respeta.                                                                                                                          |
| `CORS_ORIGINS`                                                                   | Sí en la práctica                         | No                            | Sin valor solo permite `http://localhost:3000` (`common/config/cors.ts:3`). Sin comodines.                                                                                  |
| `STORAGE_DRIVER`                                                                 | Sí (`spaces`)                             | No                            | Por defecto `local`.                                                                                                                                                        |
| `SPACES_KEY`, `SPACES_SECRET`                                                    | Con `spaces`                              | **Sí**                        | Llave de acceso y secreto.                                                                                                                                                  |
| `SPACES_REGION`, `SPACES_ENDPOINT`, `SPACES_BUCKET`                              | Con `spaces`                              | No                            |                                                                                                                                                                             |
| `STORAGE_LOCAL_DIR`                                                              | Solo con `local`                          | No                            | Por defecto `./almacenamiento`.                                                                                                                                             |
| `ETL_EQUIVALENCIAS`                                                              | Solo para importar Excel por la API       | No (el contenido son correos) | **Ruta de un archivo JSON o el contenido del JSON** (si empieza con `{`; actualizado en el PR #9, `etl/equivalencias.ts`). Sin ella `POST /etl/importaciones` responde 503. |
| `ETL_SALIDA`                                                                     | No (`./etl-salida`, `etl.service.ts:285`) | No                            | Carpeta donde se escribe el reporte de cada importación; en App Platform es disco efímero.                                                                                  |
| `SEED_SUPERVISOR_CORREO`, `SEED_SUPERVISOR_CONTRASENA`, `SEED_SUPERVISOR_NOMBRE` | Solo al crear el Supervisor (script)      | Contraseña: **sí**            | No las lee la API; las lee `db/seed-supervisor.mjs`.                                                                                                                        |
| `TEST_DATABASE_URL`                                                              | No en producción                          | **Sí**                        | Solo pruebas locales y CI.                                                                                                                                                  |
| `PRUEBAS_*` (correos y contraseñas de los 4 usuarios de Newman)                  | Solo para Newman                          | **Sí**                        | Se pasan por entorno; nunca en el repositorio.                                                                                                                              |

Los marcadores están en `.env.example`. Secretos: `DATABASE_URL`, `JWT_SECRET`, `SPACES_KEY`, `SPACES_SECRET` y las contraseñas de los scripts.

### CORS y HTTPS

- CORS: `app.setup.ts:11` llama a `enableCors` con los orígenes de `CORS_ORIGINS`; sin la variable solo `http://localhost:3000` (`cors.ts:3`). Métodos `GET, POST, PUT, PATCH, DELETE, OPTIONS`, sin credenciales, `Content-Disposition` expuesta (`cors.ts:24-29`). Rechaza comodines y entradas vacías (`cors.ts:11-15`).
- **Qué cambiar:** solo configuración. Poner en `CORS_ORIGINS` el origen exacto del frontend publicado (con `https://`, sin barra final). No hace falta tocar código.
- HTTPS: la API escucha HTTP simple (`main.ts:12`). App Platform termina el TLS delante y entrega `https://` al público, así que no hay que configurar certificados en el código. La API no redirige HTTP a HTTPS por sí misma (lo hace la plataforma).
- `listen(port)` sin host abre todas las interfaces, que es lo que App Platform espera.

### Salud

- Existe `GET /api/v1/health`, pública, que responde `{ "status": "ok" }` (`health/health.controller.ts:8-15`).
- **Sirve como health check de vida del proceso**, pero **no consulta la base de datos**: respondería 200 aunque PostgreSQL esté caído.
- **Actualizado (PR #9):** existe `GET /api/v1/health/db` (pública), que hace `SELECT 1` y responde 503 genérico si falla. Es el health check de `.do/app.yaml`.

### Construcción y arranque

- No hay Dockerfile ni `Procfile`. **Actualizado:** `.do/app.yaml` define el servicio, el build, el arranque, el health check y las variables (los secretos sin valor).
- Construcción: `pnpm --filter @h3ga/api build` (`nest build`; copia los recursos de los PDF por `nest-cli.json`). Genera `apps/api/dist/main.js`.
- Arranque: `node dist/main` desde `apps/api` (script `start` de `apps/api/package.json`).
- **Cuidado:** `pnpm build` en la raíz corre `pnpm -r build`, que incluye `apps/web` (un Nuxt de relleno; el frontend real está en el repositorio `h3ga-frontend`). En App Platform hay que usar el filtro de la API.
- Node: `engines` pide `>=22.9` (`package.json:7`); CI usa 22.
- Swagger se publicaba siempre en `/api/docs`. **Actualizado (PR #9):** con `NODE_ENV=production` ya no se publica (`swagger.setup.ts`).

## 2. Plan mínimo de despliegue (App Platform + PostgreSQL administrado)

No se ha ejecutado nada. Los pasos con comandos están en `docs/despliegue/guia-paso-a-paso.md`. Orden:

1. **Base.** Crear el clúster PostgreSQL 16 administrado, la base y un usuario de aplicación. Restringir el acceso entrante a la app (Trusted Sources). Guardar la URL como secreto de App Platform.
2. **Spaces.** Crear el bucket y una llave de acceso limitada a ese bucket. Secretos: `SPACES_KEY` y `SPACES_SECRET`.
3. **Migraciones.** Desde una máquina autorizada (o un job de una sola ejecución): `pnpm db:migrate --dry-run --permitir-remota`, revisar la lista y luego `pnpm db:migrate --permitir-remota` (con `DATABASE_SSL=true`). Después `pnpm db:seed:supervisor --permitir-remota` con una contraseña propia. Las migraciones **no** corren solas al desplegar, como pide la regla 1 de CLAUDE.md.
4. **API.** Componente de servicio desde GitHub (rama `main`), build `pnpm install --frozen-lockfile && pnpm --filter @h3ga/api build`, ejecución `node apps/api/dist/main.js`, health check `GET /api/v1/health/db`. Variables: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET` (largo y aleatorio), `STORAGE_DRIVER=spaces`, las cinco `SPACES_*` y `CORS_ORIGINS` (se completa en el paso 5).
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

| #   | Cambio                                                                                                | Estado                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | TLS hacia la base (`DATABASE_SSL`, API y `db:migrate`/`db:seed:supervisor`)                           | **Hecho** (PR #9). Probado en local; falta contra la base administrada real.                                               |
| 2   | `ETL_EQUIVALENCIAS` como contenido y no solo como ruta                                                | **Hecho** (PR #9).                                                                                                         |
| 3   | Salud con base (`GET /health/db`); matriz de acceso de 119 a 120 rutas                                | **Hecho** (PR #9).                                                                                                         |
| 4   | Swagger oculto con `NODE_ENV=production`                                                              | **Hecho** (PR #9).                                                                                                         |
| 5   | `pruebas:datos --permitir-staging` para una base remota                                               | **Hecho** (PR #9).                                                                                                         |
| 6   | `.do/app.yaml` con build, arranque, health check y variables sin valores                              | **Hecho** (este PR).                                                                                                       |
| 7   | Probar contra la nube real: TLS con el certificado de DigitalOcean, Spaces, un PDF, Newman en staging | **Pendiente.** Requiere crear los recursos (clúster, bucket, app) y credenciales propias; la guía de despliegue lo ordena. |

Las pruebas actuales siguen en verde con estos cambios (80 suites, 782 pruebas: 781 pasan, 1 omitida).

## 4. Lo que no se verificó

- Nada se probó contra DigitalOcean (base, Spaces ni App Platform): todo sale de leer el código.
- Que `DATABASE_SSL=true` (con o sin `DATABASE_SSL_CA`) verifique el certificado de la base administrada de DigitalOcean no se comprobó: en local solo se comprobó que la opción se aplica.
- Que el build de App Platform con `pnpm` y el espacio de trabajo (`pnpm --filter @h3ga/api build`) funcione tal cual, y que `node_modules` quede completo en el arranque. Se verá en el primer despliegue.
- Que App Platform acepte variables `SECRET` sin valor al crear la app desde el archivo. La guía las carga después, en el panel.
- No se revisó el frontend más allá de que `nuxt.config.ts` toma la API de `NUXT_PUBLIC_API_BASE`.
