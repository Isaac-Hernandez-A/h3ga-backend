# Backend de apoyo al frontend (Actividad 4): plan de implementación

> **Para Claude Code (repositorio `h3ga-backend`):** ejecuta las tareas en orden, una por vez. Si tienes las skills superpowers, usa `executing-plans`; si no, sigue el "Ciclo de cada tarea". No avances sin mi confirmación.

**Objetivo:** agregar el inicio de sesión que emite el token, CORS para el frontend, un usuario inicial, las lecturas de apoyo que hoy son 501 y el permiso de lectura de etapas para el Auxiliar, todo probado.

**Arquitectura:** un módulo `auth` nuevo firma tokens con el mismo secreto y los mismos datos que ya validan los guards (`sub`, `rol`, `exp`). Lo demás son consultas simples sobre tablas existentes y un cambio de permisos en `permisos.ts`.

**Tecnologías:** NestJS 11, TypeORM, PostgreSQL, Jest, `@nestjs/jwt` y `bcryptjs` (ya instalados). CORS con `app.enableCors` de Nest. Sin dependencias nuevas.

**Especificación:** `docs/superpowers/specs/2026-11-09-actividad-4-frontend-design.md` (secciones 2, 4 y 7), `docs/diccionario.md`, `docs/arquitectura.md`, `docs/endpoints.md`.

## Restricciones globales

- Las mismas del plan de la Actividad 3: prefijo `/api/v1`, errores `{ statusCode, error, message, path, timestamp }`, nombres exactos del diccionario, solo migraciones SQL nuevas, solo base local, `America/Cancun`, sin secretos en el repositorio, datos de prueba ficticios.
- Línea base de pruebas: la actual (267 pasan, 0 pendientes). Solo puede subir.
- Las rutas nuevas declaran sus roles con `PERMISOS`; el login se marca `@Publico()`.
- El hash de la contraseña nunca sale en una respuesta ni en un registro de errores.
- No agregues dependencias. Si crees necesitar una, pregúntame.

## Enfoque de revisión

1. El login revela si un correo existe (por el mensaje o por el tiempo de respuesta). Prueba: CP-71.
2. El token que emite el login no coincide con lo que validan los guards. Prueba: CP-70.
3. CORS abierto a cualquier origen o con credenciales. Prueba: CP-74.
4. El script del usuario inicial deja la contraseña en texto plano en algún lugar. Prueba: CP-75.
5. Al dar lectura de etapas al Auxiliar, se filtra a clientes no autorizados o se le abre la escritura. Prueba: CP-81.

## Ciclo de cada tarea

- [ ] **Paso 1:** escribe las pruebas de la tarea (abajo). Reutiliza los helpers existentes (`iniciarAppConBd`, `tokenDe`).
- [ ] **Paso 2:** ejecútalas y muéstrame que fallan por la razón correcta.
- [ ] **Paso 3:** implementa lo mínimo para que pasen.
- [ ] **Paso 4:** `npx jest` completo en `apps/api` y `pnpm lint`.
- [ ] **Paso 5:** regenera `docs/endpoints.md` si cambió algún estado de ruta y haz commit cuando yo confirme.

---

### Tarea B1: Inicio de sesión

**Archivos:**
- Crear: `apps/api/src/auth/auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `dto/login.dto.ts`
- Modificar: `apps/api/src/common/seguridad/password-hasher.ts` (agregar `verify`), `apps/api/src/app.module.ts`
- Probar: `apps/api/src/auth/auth.service.spec.ts`, `apps/api/src/auth/auth.e2e.spec.ts`

**Interfaces:**
- Produce: `PasswordHasher.verify(plain: string, hash: string): Promise<boolean>`.
- Produce: `AuthService.iniciarSesion(correo: string, contrasena: string): Promise<{ access_token: string; expires_in: number; usuario: { id: string; nombre: string; rol: Rol } }>`.
- Produce: `POST /api/v1/auth/login` (público). Cuerpo `{ correo_electronico, contrasena }`. Vigencia 28800 s.
- Reglas: busca el usuario por `correo_electronico` (sin distinguir mayúsculas), exige `activo = true`, compara con `contrasena_hash`. El `rol` del token es el valor normalizado que ya produce `normalizarRol`. `nombre` es nombre y apellido paterno. Si el usuario no existe, compara igual contra un hash ficticio para que el tiempo de respuesta no delate la diferencia.

**Pruebas:**

```ts
it('CP-69 login correcto: 200 con access_token, expires_in 28800 y usuario {id, nombre, rol}; el token trae sub, rol y exp a 8 horas', ...)
it('CP-70 el token emitido lo acepta el guard existente en GET /clientes para cada rol', ...)   // 200, no 401
it('CP-71 contraseña incorrecta, correo inexistente y usuario inactivo responden 401 con el mismo mensaje', ...)
it('CP-72 ninguna respuesta del login incluye contrasena_hash', ...)
it('CP-73 cuerpo sin correo o sin contraseña responde 400', ...)
it('CP-80 un token vencido emitido por el login responde 401 en una ruta protegida', ...)        // reloj controlado
```

- [ ] **Commit:** `feat(auth): inicio de sesión que emite el token JWT`

---

### Tarea B2: CORS y usuario inicial

**Archivos:**
- Modificar: `apps/api/src/main.ts` o `configureApp` (CORS), `apps/api/src/common/config/validar-entorno.ts` (variable `CORS_ORIGINS`), `.env.example`, `package.json` (script `db:seed:supervisor`)
- Crear: `apps/api/src/scripts/seed-supervisor.ts`
- Probar: `apps/api/src/common/config/cors.spec.ts`, `apps/api/src/scripts/seed-supervisor.spec.ts`

**Interfaces:**
- CORS: solo los orígenes de `CORS_ORIGINS` (lista separada por comas; por defecto `http://localhost:3000`), sin comodines y sin `credentials`. Métodos GET, POST, PUT, PATCH y OPTIONS; cabeceras `Authorization` y `Content-Type`; expone `Content-Disposition`.
- Script: lee `SEED_SUPERVISOR_CORREO`, `SEED_SUPERVISOR_CONTRASENA` y `SEED_SUPERVISOR_NOMBRE` del entorno, busca el rol Supervisor en la tabla `roles`, crea o actualiza el usuario por correo y cifra con `PasswordHasher`. Nunca imprime la contraseña.

**Pruebas:**

```ts
it('CP-74 CORS: un origen permitido recibe Access-Control-Allow-Origin; otro origen no recibe permiso; sin comodín', ...)
it('CP-75 el script crea un Supervisor que puede iniciar sesión; repetirlo no duplica; la contraseña no queda en texto plano', ...)
```

- [ ] **Commit:** `feat(config): CORS por origen y script del usuario Supervisor inicial`

---

### Tarea B3: Catálogos

**Archivos:**
- Modificar: servicios y controladores de `clientes` (regímenes, leyes probables, AFORE, objetivos específicos del F0), `documentos` (tipos de documento) y `etapas` (estatus)
- Probar: un spec por módulo, o `apps/api/src/catalogos.e2e.spec.ts`

**Interfaces:** cada ruta devuelve la lista completa de su tabla, ordenada por `id`. Rutas: `GET /catalogos/estatus`, `/catalogos/regimenes`, `/catalogos/leyes-probables`, `/catalogos/afores`, `/catalogos/tipos-documento`, `/catalogos/objetivos-especificos`. Roles: `PERMISOS.catalogos.leer` (los tres).

**Pruebas:**

```ts
it('CP-76 los seis catálogos responden 200 con una lista para asesor, auxiliar y supervisor; sin token 401', ...)
```

- [ ] **Commit:** `feat(catalogos): lecturas de catálogos que necesita el frontend`

---

### Tarea B4: Lecturas del cliente y lectura de etapas para el Auxiliar

**Archivos:**
- Modificar: `apps/api/src/clientes/clientes.service.ts` y `.controller.ts`, `apps/api/src/common/auth/permisos.ts`, comentarios de `permisos.ts`, `docs/arquitectura.md` (fila de etapas)
- Probar: `apps/api/src/clientes/clientes-lecturas.e2e.spec.ts`, `apps/api/src/etapas/etapas-auxiliar.e2e.spec.ts`

**Interfaces:**
- Produce en `ClientesService`: `obtenerHistorialLaboral(clienteId)`, `obtenerIssste(clienteId)`, `listarObjetivosMarcados(clienteId)`, `listarAuxiliares(clienteId)`. Un cliente sin datos devuelve una respuesta vacía válida (objeto nulo o lista vacía según la ruta), nunca 500.
- Rutas: `GET /clientes/:clienteId/historial-laboral`, `/historial-laboral/issste`, `/objetivos-especificos` y `/auxiliares`, con los roles que ya declara el contrato.
- Permisos: `etapas.leer` pasa a Asesor, Auxiliar y Supervisor; `etapas.escribir` no cambia.

**Pruebas:**

```ts
it('CP-77 historial laboral, ISSSTE y objetivos: asesor dueño 200, asesor ajeno 404, auxiliar 403, supervisor 200; cliente sin datos responde vacío, no 500', ...)
it('CP-78 auxiliares del cliente: asesor dueño y supervisor 200; auxiliar 403', ...)
it('CP-81 el auxiliar con autorización activa lee etapas e historial (200); sin autorización o inactiva 404; cambiar estatus sigue 403', ...)
```

- [ ] **Commit:** `feat(clientes,etapas): lecturas del expediente y lectura de etapas para el auxiliar`

---

### Tarea B5: Matriz, Swagger y documentación

**Archivos:**
- Modificar: `apps/api/src/acceso-matriz.spec.ts`, `docs/endpoints.md`, `docs/arquitectura.md`, `docs/pruebas-matriz-acceso.csv`
- Verificar: que Swagger JSON se sirve en `/api/docs-json`

**Pruebas:**

```ts
it('CP-79 la matriz de acceso cubre las 85 rutas y ninguna combinación responde 500', ...)
it('el JSON de Swagger responde 200 en /api/docs-json y lista la ruta /api/v1/auth/login', ...)
```

- [ ] **Paso 3:** regenera `pnpm test:reporte` y los docs. Actualiza el total de rutas en la prueba de matriz.
- [ ] **Commit:** `docs: matriz de acceso y estado de implementación tras la Actividad 4 (backend)`

---

## Cobertura de la especificación

- Sección 4.1 (login): B1. Sección 4.2 y 4.3 (CORS, usuario inicial): B2. Sección 4.4 (etapas para el Auxiliar): B4. Sección 4.5 (lecturas de apoyo): B3 y B4. Sección 7 (CP-69 a CP-81): B1 a B5.
