# H3GA — Seguros y Pensiones

Monorepo pnpm del sistema web H3GA: API REST (NestJS, desplegada en DigitalOcean) y frontend (Nuxt 3).

```
apps/api        NestJS (prefijo /api/v1)
apps/web        Nuxt 3
db/migrations   Migraciones SQL versionadas (única vía para cambiar el esquema)
docs            Documentación (docs/diccionario.md es la fuente de verdad del esquema)
```

## Requisitos

- Node.js 22 o superior
- pnpm 10 (`npm i -g pnpm@10`)
- Docker (opcional, ver "Base de datos local")

## Instalación

```bash
pnpm install
cp .env.example .env   # y reemplaza los marcadores CAMBIAR_*
```

## Base de datos local

El esquema se comparte con otros estudiantes: **no uses `synchronize` de TypeORM ni migraciones automáticas**; solo migraciones SQL en `db/migrations`.

### Opción A: Docker (PostgreSQL 16, igual que el clúster de DigitalOcean)

Define `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` en `.env` y construye `DATABASE_URL` con los mismos valores.

```bash
pnpm db:up     # levanta PostgreSQL y espera a que esté saludable
pnpm db:down   # lo detiene (el volumen con los datos se conserva)
```

Si el puerto 5432 está ocupado, define `POSTGRES_PORT` en `.env` y usa ese puerto en `DATABASE_URL`.

### Opción B: PostgreSQL instalado de forma nativa

1. Instala PostgreSQL **16** (misma versión mayor que DigitalOcean).
2. Crea un usuario y una base vacía, por ejemplo con `psql`:
   ```sql
   CREATE ROLE mi_usuario LOGIN PASSWORD 'mi_contrasena';
   CREATE DATABASE h3ga OWNER mi_usuario;
   ```
3. Apunta `DATABASE_URL` en `.env` a esa base (`postgresql://mi_usuario:mi_contrasena@localhost:5432/h3ga`). Las variables `POSTGRES_*` solo las usa Docker.

### Migraciones

Los cambios de esquema son archivos SQL en `db/migrations`, con nombre `AAAAMMDDHHMM_descripcion.sql` (la marca de tiempo evita choques entre personas).

```bash
pnpm db:migrate --dry-run   # lista lo pendiente sin tocar la base
pnpm db:migrate             # aplica lo pendiente y lo registra en schema_migrations
```

- Cada archivo corre en su propia transacción; una migración ya aplicada no se edita (se crea otra).
- El runner rechaza `DROP` y `TRUNCATE`, y solo corre contra una base local salvo que pases `--permitir-remota` (para la base de DigitalOcean, después de revisar las migraciones).
- `tipos_asesor` es de otro módulo: se crea vacía y no se siembra.

## Desarrollo

```bash
pnpm dev     # api (http://localhost:3001) y web (http://localhost:3000)
pnpm build
pnpm lint
pnpm test
pnpm format  # aplica Prettier
```

Comprobación rápida: `GET http://localhost:3001/api/v1/health` responde `{ "status": "ok" }`.

## Convención de ramas

- `main`: código estable.
- `develop`: integración.
- Ramas por funcionalidad, salen de `develop` y vuelven a `develop` por pull request: `feat/<tema>`, `fix/<tema>`, `docs/<tema>`, `chore/<tema>`.

Cada pull request ejecuta lint y pruebas en GitHub Actions.

## Convención de commits

[Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/), en español y en imperativo:

```
feat(clientes): agrega alta de clientes
fix(api): corrige validación de rol
docs: actualiza README
chore: actualiza dependencias
```
