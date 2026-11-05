# Servicios del backend (Actividad 3): plan de implementación

> **Para Claude Code:** ejecuta las tareas en orden, una por vez. Si tienes las skills superpowers, usa `executing-plans`; si no, sigue el ciclo de la sección "Ciclo de cada tarea". Las casillas `- [ ]` sirven para marcar el avance. No avances a la siguiente tarea sin mi confirmación.

**Objetivo:** convertir en servicios reales las rutas del contrato que hoy responden 501, con control de acceso aplicado en todas, lógica transaccional de etapas y trámites F2 a F4, agenda, avisos, documentos y PDF del formato F0, todo probado.

**Arquitectura:** cada módulo de `apps/api/src` mantiene el patrón controlador, servicio y entidades. La seguridad se aplica con guards globales (JWT y roles) más `ClienteAccessGuard` en las rutas con `:clienteId`. Las reglas de negocio puras (avance de etapas, ventana de avisos) viven en funciones sin dependencias para probarlas sin base de datos; las operaciones que tocan varias tablas usan una sola transacción.

**Tecnologías:** NestJS 11, TypeORM (solo mapeo, `synchronize: false`), PostgreSQL, Jest con supertest, migraciones SQL, PDFKit (Tarea 8), cliente S3 compatible para DigitalOcean Spaces (Tarea 7).

**Especificación:** Memoria (RF-01 a RF-37 y RNF-01 a RNF-12), `docs/diccionario.md`, `docs/arquitectura.md` y `docs/endpoints.md`. Cuando un nombre de tabla o columna no aparezca aquí, la fuente de verdad es `docs/diccionario.md`.

## Restricciones globales

- Prefijo `/api/v1`; errores con formato `{ statusCode, error, message, path, timestamp }`.
- Nombres de tablas, columnas y enums exactos como `docs/diccionario.md`.
- El esquema solo cambia con migraciones SQL nuevas (`AAAAMMDDHHMM_descripcion.sql`). No se edita ninguna migración existente. Solo base local.
- `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`; `usuarios.contrasena_hash` nunca sale en una respuesta.
- Si el usuario no tiene acceso a un cliente, o el cliente no existe, la respuesta es 404 con el mismo mensaje.
- Roles del token: `asesor`, `auxiliar`, `supervisor`. Los permisos por ruta viven solo en `apps/api/src/common/auth/permisos.ts`.
- Zona horaria de negocio: `America/Cancun` (UTC-5, sin horario de verano).
- Sin secretos en el repositorio y solo datos de prueba ficticios.
- Línea base de pruebas: 87 pasan y 2 `it.todo` en 13 suites. Ese número solo puede subir.
- No agregues dependencias sin preguntarme. Las que este plan prevé están marcadas como "pregunta antes".
- `tipos_asesor` es de otro módulo: solo lectura.

## Enfoque de revisión

Lo que el contrato implica y es más probable que falle, con su prueba en la tarea dueña:

1. Un asesor llega al cliente de otro por una ruta anidada (documentos, etapas, correcciones) y recibe datos en vez de 404. Prueba: CP-05 (Tarea 1).
2. Los avisos se duplican por consultas repetidas o simultáneas. Pruebas: CP-39 (Tarea 6).
3. Un cambio de estatus falla a la mitad y deja la etapa cambiada sin bitácora. Prueba: CP-25 (Tarea 4).
4. Una autorización del Auxiliar se revoca y se vuelve a otorgar, y queda con duplicados o con acceso viejo. Pruebas: CP-19 y CP-20 (Tarea 3).
5. Un evento cae justo en el límite del día en Cancún y la alerta sale un día antes o un día después. Prueba: CP-40 (Tarea 6).

## Ciclo de cada tarea

- [ ] **Paso 1:** escribe las pruebas de la tarea (nombres y aserciones abajo). Reutiliza los helpers de las suites existentes.
- [ ] **Paso 2:** ejecútalas y confirma que fallan por la razón correcta. Muéstrame la salida.
- [ ] **Paso 3:** implementa lo mínimo para que pasen.
- [ ] **Paso 4:** ejecuta `npx jest` completo en `apps/api` y `pnpm lint`. Deben pasar sin bajar la línea base.
- [ ] **Paso 5:** regenera `docs/endpoints.md` si cambió el estado de alguna ruta, y haz commit con el mensaje indicado.

## Decisiones (todas confirmadas)

| ID | Decisión | Resultado | Tarea |
|---|---|---|---|
| D1 | Quién cifra la contraseña al crear un usuario | El módulo `usuarios-roles`, con bcrypt (costo 10), detrás de una interfaz `PasswordHasher` | 2 |
| D2 | Correcciones F2 que modifican el expediente al finalizar la etapa 2 | CURP, RFC, fecha de nacimiento, sexo y nombre. La corrección de nombre actualiza solo `clientes.nombre` (nombres de pila) y deja los apellidos intactos; los apellidos se corrigen editando el cliente. Acta de nacimiento, AFORE, Actualización IMSS y Otro solo registran el trámite | 5 |
| D3 | Qué actualiza el dictamen del IMSS en F4 | Se guarda el dictamen y se actualiza `clientes.semanas_imss_reconocidas`; el archivo del dictamen se guarda por Documentos (Tarea 7); `semanas_a_recuperar` no se recalcula | 5 |
| D4 | Unicidad de avisos | Un aviso por etapa o evento y fecha de alerta, con índices únicos parciales en una migración nueva | 6 |
| D5 | Límites de archivos | PDF, JPG o PNG, máximo 10 MB | 7 |
| D6 | Almacenamiento | Interfaz `StorageService` con adaptador local por defecto; el adaptador de Spaces se prueba con un cliente simulado, no contra DigitalOcean | 7 |

## Mapa de archivos

Los módulos siguen las carpetas de `docs/arquitectura.md`. Archivos nuevos:

- `apps/api/src/common/auth/publico.decorator.ts`, `clientes-accesibles.ts`
- `apps/api/src/common/seguridad/password-hasher.ts`
- `apps/api/src/common/fechas.ts`
- `apps/api/src/etapas/reglas-avance.ts`
- `apps/api/src/documentos/storage/` (interfaz y dos adaptadores)
- `apps/api/src/reportes/pdf/f0-pdf.service.ts`
- `apps/api/test/helpers/tokens.ts` (solo si no existe uno equivalente)
- `scripts/reporte-pruebas.mjs`
- Migración de índices únicos de avisos (Tarea 6)

---

### Tarea 1: Seguridad aplicada en todas las rutas

**Archivos:**
- Modificar: `apps/api/src/app.module.ts` (guards globales `JwtAuthGuard` y `RolesGuard` con `APP_GUARD`)
- Crear: `apps/api/src/common/auth/publico.decorator.ts`
- Modificar: `apps/api/src/health/health.controller.ts` (`@Publico()`)
- Modificar: controladores con `:clienteId` (`clientes`, `documentos`, `etapas`, `tramites`, `diagnosticos`): `@UseGuards(ClienteAccessGuard)` a nivel de clase
- Probar: `apps/api/test/acceso-matriz.e2e-spec.ts` (sigue la convención de las pruebas e2e existentes)

**Interfaces:**
- Produce: `@Publico()` (marca de ruta sin token), `tokenDe(rol: Rol, sub?: string): string` en `apps/api/test/helpers/tokens.ts`.
- Regla: una ruta sin `@Roles` ni `@Publico` se niega (403). `ClienteAccessGuard` debe ignorar las rutas sin `:clienteId`.

**Pruebas (la prueba recorre las rutas reales del router, no una lista escrita a mano):**

```ts
it('CP-01 sin token responde 401 en todas las rutas salvo /health', ...) // rutas.length === 81; /health 200
it('CP-02 token vencido o con firma inválida responde 401', ...)
it('CP-03 rol no permitido responde 403 en cada ruta', ...)             // para cada ruta y cada rol fuera de @Roles
it('CP-04 rol permitido supera los guards en cada ruta', ...)           // nunca 401 ni 403 (501 o 2xx)
it('CP-05 asesor B sobre un cliente de asesor A recibe 404 en toda ruta :clienteId', ...)
it('CP-06 auxiliar: autorización activa pasa; sin registro o con activo=false recibe 404', ...)
it('CP-07 supervisor accede a cualquier cliente existente; inexistente da el mismo 404 que sin acceso', ...)
```

- [ ] **Paso 3:** la prueba de matriz lee las rutas con `DiscoveryService` y los metadatos de `@Roles`. Exporta su resultado a `docs/pruebas-matriz-acceso.csv` (ruta, método, rol, código esperado, código obtenido).
- [ ] **Commit:** `feat(auth): guards globales y matriz de acceso probada en las 81 rutas`

---

### Tarea 2: Usuarios y roles

**Archivos:**
- Modificar: `apps/api/src/usuarios-roles/usuarios-roles.service.ts` y `.controller.ts`
- Crear: `apps/api/src/common/seguridad/password-hasher.ts`
- Probar: `apps/api/src/usuarios-roles/usuarios-roles.service.spec.ts` y e2e del controlador

**Interfaces:**
- Produce: `interface PasswordHasher { hash(plain: string): Promise<string> }` y `BcryptPasswordHasher`.
- Produce en `UsuariosRolesService`: `crear(dto: CrearUsuarioDto): Promise<UsuarioRespuesta>`, `listar(filtro: { activo?: boolean }): Promise<UsuarioRespuesta[]>`, `obtener(usuarioId: string): Promise<UsuarioRespuesta>`, `actualizar(usuarioId: string, dto: ActualizarUsuarioDto): Promise<UsuarioRespuesta>`, `listarRoles()`, `listarTiposAsesor()`.
- Pregunta antes de agregar `bcrypt` (o `bcryptjs` si falla la compilación nativa).

**Pruebas:**

```ts
it('CP-08 supervisor crea usuario: 201, sin contrasena_hash en la respuesta y hash bcrypt en BD', ...) // hash.startsWith('$2'), hash !== contrasena
it('CP-09 correo repetido responde 409', ...)
it('CP-10 asesor y auxiliar no pueden crear ni editar usuarios (403)', ...)
it('CP-11 PATCH activo=false desactiva sin borrar; el listado filtra por activo', ...)
it('CP-12 tipo_asesor_id inexistente responde 400; nulo es válido', ...)
it('CP-13 los tres roles pueden leer el catálogo de roles', ...)
```

- [ ] **Commit:** `feat(usuarios): alta, edición y baja de usuarios con contraseña cifrada`

---

### Tarea 3: Clientes y autorizaciones del Auxiliar

**Archivos:**
- Crear: `apps/api/src/common/auth/clientes-accesibles.ts`
- Modificar: `apps/api/src/clientes/clientes.service.ts` y `.controller.ts`
- Probar: `apps/api/src/clientes/clientes.service.spec.ts` y e2e

**Interfaces:**
- Produce (lo usan las Tareas 6 y 7): `aplicarAlcanceClientes(qb: SelectQueryBuilder<any>, usuario: AuthenticatedUser, aliasCliente: string): SelectQueryBuilder<any>`. Asesor: `asesor_id = sub`; auxiliar: clientes con registro activo en `cliente_auxiliares`; supervisor: sin filtro.
- Produce en `ClientesService`: `listar(usuario)`, `crear(usuario, dto)`, `actualizar(clienteId, dto)`, `reasignarAsesor(clienteId, nuevoAsesorId)`, `autorizarAuxiliar(usuario, clienteId, auxiliarId)`, `cambiarAutorizacion(clienteId, clienteAuxiliarId, activo)`, `reemplazarHistorialLaboral(clienteId, dto)`, `reemplazarObjetivosEspecificos(clienteId, objetivoIds)`.

**Pruebas:**

```ts
it('CP-14 listar: asesor ve solo los suyos, auxiliar solo los autorizados activos, supervisor todos', ...)
it('CP-15 crear fija asesor_id = sub e ignora el asesor_id enviado', ...)
it('CP-16 CURP con formato inválido responde 400; CURP repetida responde 409', ...)
it('CP-17 un asesor que no es dueño no puede editar el cliente (404)', ...)
it('CP-18 reasignar: supervisor 200; asesor 403; destino inexistente o que no es asesor responde 400', ...)
it('CP-19 autorizar guarda autorizado_por = sub; repetir el par reactiva la fila sin duplicar; el usuario debe ser auxiliar', ...)
it('CP-20 desactivar la autorización quita el acceso en la siguiente petición (404)', ...)
it('CP-21 PUT historial-laboral es idempotente: dos PUT iguales dejan un solo registro', ...)
```

- [ ] **Paso 3:** convierte el `it.todo` del listado por rol en la prueba CP-14.
- [ ] **Commit:** `feat(clientes): listado por rol, alta, reasignación y autorizaciones del auxiliar`

---

### Tarea 4: Etapas, avance y bitácora

**Archivos:**
- Crear: `apps/api/src/etapas/reglas-avance.ts`
- Modificar: `apps/api/src/etapas/etapas.service.ts` y `.controller.ts`
- Probar: `apps/api/src/etapas/reglas-avance.spec.ts`, `etapas.service.spec.ts`

**Interfaces:**
- Produce: `type NombreEstatus = 'No aplica' | 'Por iniciar' | 'En proceso cliente' | 'En proceso asesor' | 'En proceso Instituto' | 'Finalizado' | 'Bloqueado' | 'Cancelado' | 'Detenido'`.
- Produce: `calcularAvance(entrada: { estatusNuevo: NombreEstatus; avancePrevio: number; avanceSolicitado?: number }): number`; lanza `AvanceInvalidoError` si un estatus "En proceso" trae un avance fuera de 20 a 90.
- Produce en `EtapasService`: `cambiarEstatus(usuario: AuthenticatedUser, clienteId: string, etapaTramiteId: string, dto: CambiarEstatusDto): Promise<EtapaTramite>`, `avanceGlobal(clienteId: string): Promise<number>`, `listarHistorial(clienteId: string, etapaTramiteId: string)`.
- Regla de avance (RF-18): Por iniciar = 10; En proceso (cliente, asesor o Instituto) = el valor pedido entre 20 y 90; Finalizado = 100 y se llena `fecha_completada`; Bloqueado, Cancelado y Detenido conservan el avance previo; al volver a un estatus activo se llena `reactivado_en`. Confirma el caso de "No aplica" en el diccionario (queda fuera del avance global).

**Pruebas:**

```ts
it('CP-22 calcularAvance: Por iniciar 10; Finalizado 100; En proceso 55 queda 55; En proceso 15 o 95 lanza error; Bloqueado conserva 40', ...)
it('CP-23 Bloqueado sin motivo_rechazo responde 400; con motivo, el historial lo guarda', ...)
it('CP-24 cada cambio inserta una fila de historial con estatus anterior y nuevo, usuario y fecha', ...)
it('CP-25 si falla el insert del historial, la etapa conserva estatus y avance (rollback)', ...)
it('CP-26 no existe ruta ni método que modifique o elimine el historial', ...)
it('CP-27 avanceGlobal excluye las etapas No aplica', ...)
it('CP-28 asesor ajeno recibe 404; auxiliar recibe 403 al escribir etapas', ...)
```

- [ ] **Paso 3:** `cambiarEstatus` usa una sola transacción de TypeORM que actualiza la etapa e inserta el historial. La prueba CP-25 fuerza el fallo del segundo paso.
- [ ] **Commit:** `feat(etapas): reglas de avance, bitácora de estatus y transacción atómica`

---

### Tarea 5: Trámites F2, F3 y F4

**Archivos:**
- Modificar: `apps/api/src/tramites/tramites.service.ts` y `.controller.ts`, `apps/api/src/diagnosticos/` (solo la ruta de recuperación de semanas), `apps/api/src/etapas/etapas.service.ts` (gancho de la etapa 2)
- Probar: specs de cada servicio y un e2e del flujo F2

**Interfaces:**
- Consume: `EtapasService.cambiarEstatus` (Tarea 4) y los guards de la Tarea 1.
- Regla D2: `aplicarCorreccionesAlExpediente` copia `dato_correcto` según el tipo: CURP a `curp`, RFC a `rfc`, fecha de nacimiento a `fecha_nacimiento`, sexo a `sexo` y nombre solo a `nombre`.
- Produce en `TramitesService`: `crearCorreccion(usuario, clienteId, dto)`, `aplicarCorreccionesAlExpediente(manager: EntityManager, clienteId: string): Promise<void>`, `guardarUnificacionNss(clienteId, correccionId, dto)`, `agregarNssSecundario(clienteId, correccionId, dto)`.
- Consume: `EtapasService.cambiarEstatus` llama a `aplicarCorreccionesAlExpediente` dentro de su transacción cuando la etapa 2 pasa a Finalizado (D2).
- F4: la ruta `PUT /clientes/:clienteId/diagnostico/recuperacion-semanas` guarda el dictamen y actualiza `clientes.semanas_imss_reconocidas` en la misma transacción (D3). Lee el diccionario para los nombres de columna de `analisis_recuperacion_semanas`.

**Pruebas:**

```ts
it('CP-29 corrección CURP con dato_actual y dato_correcto: 201; sin dato_correcto responde 400', ...)
it('CP-30 al finalizar la etapa 2, CURP, RFC, fecha de nacimiento, sexo y nombre se copian a clientes (nombre solo actualiza clientes.nombre y deja los apellidos intactos); Acta, AFORE, Actualización IMSS y Otro no sobrescriben', ...)
it('CP-31 dato_correcto con CURP mal formada responde 400 y el cliente queda intacto', ...)
it('CP-32 F3: nss_principal de 11 dígitos, criterio válido y etapa institucional de 1 a 4; fuera de rango responde 400', ...)
it('CP-33 F3: un secundario igual al principal responde 400; uno repetido responde 409', ...)
it('CP-34 F4: registrar el dictamen actualiza semanas_imss_reconocidas y no toca semanas_a_recuperar', ...)
it('CP-35 un asesor no registra correcciones de clientes ajenos (404)', ...)
```

- [ ] **Commit:** `feat(tramites): correcciones F2, unificación de NSS F3 y actualización de saldo F4`

---

### Tarea 6: Agenda y avisos

**Archivos:**
- Crear: `apps/api/src/common/fechas.ts`, migración `db/migrations/AAAAMMDDHHMM_avisos_indices_unicos.sql`
- Modificar: `apps/api/src/agenda/*`, `apps/api/src/avisos/*`
- Probar: specs de agenda, avisos y de `fechas.ts`

**Interfaces:**
- Consume: `aplicarAlcanceClientes` (Tarea 3) para limitar etapas y eventos al alcance del usuario.
- Produce en `common/fechas.ts`: `export const ZONA = 'America/Cancun'`, `fechaLocal(ahora: Date): string` (AAAA-MM-DD en Cancún), `dentroDeVentana(fechaCompromiso: string, hoy: string, diasAntes?: number): boolean` (por defecto 2), y una clase inyectable `Reloj { ahora(): Date }` para fijar la hora en las pruebas.
- Migración (D4): índices únicos parciales sobre `avisos (etapa_tramite_id, fecha_alerta)` donde `etapa_tramite_id` no es nulo y sobre `avisos (evento_id, fecha_alerta)` donde `evento_id` no es nulo.
- Produce en `AvisosService`: `listar(usuario, filtros)` (genera los avisos que falten con `INSERT ... ON CONFLICT DO NOTHING` y devuelve los del alcance del usuario), `atender(usuario, avisoId)`.
- Califican: etapas con `fecha_compromiso` cuyo estatus no sea Finalizado, Cancelado ni No aplica, y eventos con estatus `pendiente`. Sin tarea programada: la generación ocurre al consultar la bandeja (RF-28).

**Pruebas:**

```ts
it('CP-36 agenda: el asesor agenda para su cliente; para uno ajeno 404; estatus fuera de pendiente, cumplido, reagendado o cancelado responde 400', ...)
it('CP-37 agenda: asesor ve la suya, auxiliar la de clientes autorizados, supervisor toda; filtra por fecha', ...)
it('CP-38 avisos: se generan para etapas y eventos a 2 días o menos; no para Finalizado, Cancelado ni No aplica', ...)
it('CP-39 dos consultas seguidas y dos en paralelo no duplican avisos', ...)
it('CP-40 borde de zona: con la hora fijada en 23:30 de Cancún del día D-3 no hay aviso; a las 00:00 del día D-2 sí', ...)
it('CP-41 atender guarda atendido_por = sub y fecha_atencion; atender de nuevo conserva la primera fecha', ...)
it('CP-42 avisos: asesor ve los de sus clientes, auxiliar los de autorizados, supervisor todos', ...)
it('CP-43 con 1,000 eventos sembrados, agenda y avisos responden en menos de 5 s (RNF-01)', ...)
```

- [ ] **Paso 3:** convierte el `it.todo` de avisos en CP-42. Aplica la migración solo en la base local.
- [ ] **Commit:** `feat(agenda,avisos): agenda por rol y avisos generados al consultar, sin duplicados`

---

### Tarea 7: Documentos

**Archivos:**
- Crear: `apps/api/src/documentos/storage/storage.service.ts`, `local-storage.adapter.ts`, `spaces-storage.adapter.ts`
- Modificar: `apps/api/src/documentos/documentos.service.ts` y `.controller.ts`
- Probar: specs de los adaptadores y del servicio

**Interfaces:**
- Consume: `aplicarAlcanceClientes` (Tarea 3) y el guard de acceso al cliente (Tarea 1).
- Produce: `interface StorageService { guardar(clave: string, contenido: Buffer, tipoMime: string): Promise<void>; leer(clave: string): Promise<Buffer>; borrar(clave: string): Promise<void> }` y la variable `STORAGE_DRIVER=local|spaces`.
- Clave de almacenamiento: `clientes/{clienteId}/{tipoDocumentoId}-{marcaDeTiempo}.{ext}`.
- Produce en `DocumentosService`: `subir(usuario, clienteId, tipoDocumentoId, archivo: { buffer: Buffer; originalname: string; mimetype: string; size: number })`, `revisar(clienteId, documentoId, dto)`, `descargar(usuario, clienteId, documentoId)`.
- Pregunta antes de agregar `@aws-sdk/client-s3` y `@types/multer`. Ajusta el DTO de subida si el contrato lo requiere y regenera `docs/endpoints.md`.

**Pruebas:**

```ts
it('CP-44 subir un archivo nuevo del mismo tipo reemplaza al anterior: queda una fila vigente y el archivo viejo se borra', ...)
it('CP-45 tipo distinto de PDF, JPG o PNG, o más de 10 MB, responde 400', ...)
it('CP-46 asesor y auxiliar (autorizado) suben; el supervisor no sube (403) pero sí revisa', ...)
it('CP-47 revisar actualiza estatus y observaciones del documento', ...)
it('CP-48 descargar el documento de un cliente ajeno responde 404', ...)
it('CP-49 adaptador de Spaces con cliente S3 simulado usa la clave esperada y nunca expone credenciales', ...)
```

- [ ] **Commit:** `feat(documentos): repositorio documental con almacenamiento intercambiable`

---

### Tarea 8: PDF del formato F0

**Archivos:**
- Crear: `apps/api/src/reportes/pdf/f0-pdf.service.ts`
- Modificar: `apps/api/src/clientes/clientes.controller.ts` (ruta nueva `GET /api/v1/clientes/:clienteId/diagnostico-inicial/pdf`, roles `PERMISOS.clientes.consultar`)
- Probar: `f0-pdf.service.spec.ts` y e2e de la ruta

**Interfaces:**
- Produce: `F0PdfService.generar(clienteId: string): Promise<Buffer>`.
- Pregunta antes de agregar `pdfkit` y, como devDependency, `pdf-parse`. Si el formato oficial exige posiciones exactas, implementa primero una versión con la misma información y distribución simple, y avísame.

**Pruebas:**

```ts
it('CP-50 la ruta responde 200, Content-Type application/pdf y el cuerpo empieza con %PDF-', ...)
it('CP-51 el texto del PDF contiene el nombre y la CURP del cliente de prueba', ...)
it('CP-52 un cliente sin datos opcionales genera el PDF sin error', ...)
it('CP-53 asesor ajeno recibe 404; asesor dueño, auxiliar autorizado y supervisor reciben 200', ...)
it('CP-54 mide e imprime el tiempo de generación (sin umbral)', ...)
```

- [ ] **Paso 3:** agrega la ruta nueva a `docs/endpoints.md` y a la matriz de la Tarea 1 (ya no son 81 rutas: ajusta el total en la prueba CP-01).
- [ ] **Commit:** `feat(pdf): generación del formato F0 en PDF`

---

### Tarea 9: Reporte de pruebas y cierre

**Archivos:**
- Crear: `scripts/reporte-pruebas.mjs`
- Modificar: `docs/endpoints.md`, `docs/arquitectura.md`

**Interfaces:**
- Produce: `node scripts/reporte-pruebas.mjs` que lee `jest --json` y escribe `docs/pruebas-resultados.md` con dos tablas: resumen por suite (suite, pruebas, pasan, fallan, tiempo) y casos `CP-xx` (id, descripción, resultado).

**Pruebas:**

```ts
it('CP-55 el reporte lista cada prueba cuyo título empieza con CP- y su resultado', ...) // prueba del script con un JSON de ejemplo
```

- [ ] **Paso 3:** regenera `docs/endpoints.md` (rutas implementadas contra el total) y actualiza en `docs/arquitectura.md` la tabla de estado. No debe quedar ningún `it.todo` de listado ni de avisos.
- [ ] **Commit:** `docs: reporte de pruebas y estado de implementación de la Actividad 3`

---

## Cobertura de requisitos

| Requisito | Tarea |
|---|---|
| RF-03, RF-04, RNF-02 (roles y acceso por cliente) | 1 |
| RF-01, RF-02 (usuarios y roles) | 2 |
| RF-05, RF-06, RF-07 a RF-09 (clientes, reasignación, autorizaciones, F0) | 3 |
| RF-18, RF-19, RF-23, RNF-04 (etapas, bitácora, transacción) | 4 |
| RF-20 a RF-22 (F2, F3, F4) | 5 |
| RF-24 a RF-26, RF-28 a RF-30, RNF-01, RNF-06 (agenda, avisos, zona horaria) | 6 |
| RF-10, RF-11 (documentos) | 7 |
| RF-12 (PDF del F0) y RF-13 (expedientes con campos vacíos, CP-52) | 8 |

Fuera de este plan: RF-14 a RF-17 (diagnóstico F1), RF-27, RF-31 a RF-34 (reportes), RF-35 a RF-37 (ETL, Actividad 5).
