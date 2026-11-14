# CLAUDE.md — H3GA (Seguros y Pensiones)

Responde siempre en español. Somos pares de programación.

## Proyecto

Sistema web para H3GA (seguros y pensiones), proyecto de estadía universitaria.

- Stack: Nuxt 3 (frontend), NestJS (backend), TypeScript en ambos, PostgreSQL en DigitalOcean, DigitalOcean Spaces, GitHub.
- ORM: TypeORM **solo para mapear tablas**.
- Monorepo pnpm: `apps/api`, `apps/web`, `db/migrations`, `docs`.

### Alcance de este desarrollador

Usuarios y roles (RBAC), clientes y diagnósticos F0/F1, seguimiento por etapas y trámites F2-F4, agenda, avisos, reportes y ETL desde Excel.

Fuera de alcance: login y emisión del JWT (otro estudiante) y etapas 5 en adelante.

## Reglas (obligatorias)

1. **Esquema compartido.** Hoy cada estudiante usa su PostgreSQL local; cuando la empresa active DigitalOcean será una sola base. PROHIBIDO:
   - `synchronize` de TypeORM (siempre `false`).
   - Migraciones automáticas.
   - `DROP`, `TRUNCATE`, reset de la base.
   - Tocar tablas que no estén en `docs/diccionario.md`.
     Solo migraciones SQL versionadas en `db/migrations`.
2. **Nombres exactos.** Tablas, columnas y enums se llaman exactamente como en `docs/diccionario.md` (snake_case en español). Esa es la única fuente de verdad del esquema.
3. **Sin secretos en el repositorio.** `.env.example` con marcadores; `.env` en `.gitignore`. Datos de prueba ficticios, nunca datos personales reales.
4. **No inventar.** No inventes campos ni reglas. Si algo es ambiguo, pregunta.
5. **Por pasos.** Trabaja por pasos y espera confirmación al terminar cada uno.
6. **Dependencias.** No agregues dependencias fuera de lo necesario; si hace falta una no acordada, pregunta.
