# Endpoints de la API

Generado a partir de los controladores de `apps/api/src`. Prefijo global: `/api/v1`. Swagger UI: `/api/docs`.

- **Total: 119 rutas.** Implementadas: 116. Siguen en 501 (esbozo) 3: `POST /clientes/:clienteId/etapas`, `GET /catalogos/etapas` y la importación ETL. La tabla siguiente y la sección de cada módulo dan el estado ruta por ruta.
- Roles: los de la Tabla 2 de la Memoria, definidos en un solo lugar (`common/auth/permisos.ts`) y declarados con `@Roles(...)`. Los supuestos que la Tabla 2 no cubre están anotados en ese archivo.
- **Aplicación real de los guards (las 114 rutas):** `JwtAuthGuard` y `RolesGuard` son globales y se niega por defecto: toda ruta debe declarar `@Roles(...)` o `@Publico()` (hoy solo `/health` y `/auth/login` son públicas). `ClienteAccessGuard` se aplica a los controladores con rutas `:clienteId` (`clientes`, `documentos`, `etapas`, `tramites`, `diagnosticos`) e ignora las rutas sin cliente, como los catálogos. La matriz de acceso se prueba sobre las rutas reales (`docs/pruebas-matriz-acceso.csv`).
- Errores con formato uniforme: `{ statusCode, error, message, path, timestamp }`.

## Resumen por módulo

| Módulo         | Rutas   | Implementadas | Esbozo (501) |
| -------------- | ------- | ------------- | ------------ |
| auth           | 2       | 2             | 0            |
| usuarios-roles | 8       | 8             | 0            |
| clientes       | 19      | 19            | 0            |
| documentos     | 6       | 6             | 0            |
| etapas         | 6       | 4             | 2            |
| tramites       | 11      | 11            | 0            |
| diagnosticos   | 55      | 55            | 0            |
| agenda         | 4       | 4             | 0            |
| avisos         | 3       | 3             | 0            |
| dashboard      | 1       | 1             | 0            |
| reportes       | 2       | 2             | 0            |
| etl            | 1       | 0             | 1            |
| health         | 1       | 1             | 0            |
| **Total**      | **119** | **116**       | **3**        |

## auth

| Método | Ruta                      | Descripción                  | Roles                        | Estado       |
| ------ | ------------------------- | ---------------------------- | ---------------------------- | ------------ |
| POST   | `/api/v1/auth/login`      | Iniciar sesión               | pública                      | Implementada |
| PATCH  | `/api/v1/auth/contrasena` | Cambiar la contraseña propia | asesor, auxiliar, supervisor | Implementada |

`PATCH /auth/contrasena`: cuerpo `{ contrasena_actual, contrasena_nueva }` (la nueva de 8 a 72 caracteres). Responde **204** sin cuerpo; **400** si el cuerpo es inválido, si la actual es incorrecta (`La contraseña actual es incorrecta.`; no es 401 para no cerrar la sesión del frontend) o si la nueva es igual a la actual; **401** sin token o si el usuario está inactivo o ya no existe.

## usuarios-roles

| Método | Ruta                                     | Descripción                                   | Roles                        | Estado       |
| ------ | ---------------------------------------- | --------------------------------------------- | ---------------------------- | ------------ |
| GET    | `/api/v1/auxiliares`                     | Listar los usuarios con rol auxiliar          | asesor, supervisor           | Implementada |
| GET    | `/api/v1/usuarios`                       | Listar usuarios                               | supervisor                   | Implementada |
| GET    | `/api/v1/usuarios/:usuarioId`            | Obtener un usuario                            | supervisor                   | Implementada |
| POST   | `/api/v1/usuarios`                       | Crear un usuario                              | supervisor                   | Implementada |
| PATCH  | `/api/v1/usuarios/:usuarioId`            | Actualizar o desactivar un usuario            | supervisor                   | Implementada |
| PATCH  | `/api/v1/usuarios/:usuarioId/contrasena` | Restablecer la contraseña de un usuario       | supervisor                   | Implementada |
| GET    | `/api/v1/catalogos/roles`                | Listar roles                                  | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/tipos-asesor`         | Listar tipos de asesor (tabla de otro módulo) | asesor, auxiliar, supervisor | Implementada |

## clientes

| Método | Ruta                                                        | Descripción                                          | Roles                        | Estado       |
| ------ | ----------------------------------------------------------- | ---------------------------------------------------- | ---------------------------- | ------------ |
| GET    | `/api/v1/clientes`                                          | Listar clientes                                      | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/clientes/:clienteId`                               | Obtener un cliente                                   | asesor, auxiliar, supervisor | Implementada |
| POST   | `/api/v1/clientes`                                          | Registrar un cliente                                 | asesor                       | Implementada |
| PATCH  | `/api/v1/clientes/:clienteId`                               | Actualizar un cliente                                | asesor                       | Implementada |
| PATCH  | `/api/v1/clientes/:clienteId/asesor`                        | Reasignar el expediente del cliente a otro asesor    | supervisor                   | Implementada |
| GET    | `/api/v1/clientes/:clienteId/auxiliares`                    | Listar auxiliares asignados al cliente               | asesor, supervisor           | Implementada |
| POST   | `/api/v1/clientes/:clienteId/auxiliares`                    | Asignar un auxiliar al cliente                       | asesor                       | Implementada |
| PATCH  | `/api/v1/clientes/:clienteId/auxiliares/:clienteAuxiliarId` | Activar o desactivar la asignación de un auxiliar    | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/historial-laboral`             | Obtener el historial laboral                         | asesor, supervisor           | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/historial-laboral`             | Crear o reemplazar el historial laboral              | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/historial-laboral/issste`      | Obtener la información ISSSTE                        | asesor, supervisor           | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/historial-laboral/issste`      | Crear o reemplazar la información ISSSTE             | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/objetivos-especificos`         | Listar los objetivos específicos marcados (F0)       | asesor, supervisor           | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/objetivos-especificos`         | Reemplazar los objetivos específicos marcados (F0)   | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico-inicial/pdf`       | Descargar el formato F0 (Diagnóstico Inicial) en PDF | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/regimenes`                               | Listar regímenes                                     | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/leyes-probables`                         | Listar leyes probables                               | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/afores`                                  | Listar AFORE                                         | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/objetivos-especificos`                   | Listar el catálogo de objetivos específicos (F0)     | asesor, auxiliar, supervisor | Implementada |

## documentos

| Método | Ruta                                                            | Descripción                                                 | Roles                        | Estado       |
| ------ | --------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------- | ------------ |
| GET    | `/api/v1/clientes/:clienteId/documentos`                        | Listar documentos del cliente                               | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/clientes/:clienteId/documentos/:documentoId`           | Obtener un documento                                        | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/clientes/:clienteId/documentos/:documentoId/descargar` | Descargar el archivo de un documento                        | asesor, auxiliar, supervisor | Implementada |
| POST   | `/api/v1/clientes/:clienteId/documentos`                        | Subir un documento (multipart: PDF, JPG o PNG, máx. 10 MB)  | asesor, auxiliar             | Implementada |
| PATCH  | `/api/v1/clientes/:clienteId/documentos/:documentoId`           | Revisar un documento: actualizar su estatus u observaciones | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/tipos-documento`                             | Listar tipos de documento                                   | asesor, auxiliar, supervisor | Implementada |

## etapas

| Método | Ruta                                                           | Descripción                                                                                                           | Roles                        | Estado       |
| ------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------ |
| GET    | `/api/v1/clientes/:clienteId/etapas`                           | Listar las etapas del cliente                                                                                         | asesor, supervisor           | Implementada |
| POST   | `/api/v1/clientes/:clienteId/etapas`                           | Registrar una etapa del cliente                                                                                       | asesor                       | 501          |
| PATCH  | `/api/v1/clientes/:clienteId/etapas/:etapaTramiteId`           | Actualizar estatus, avance, acción o fecha de una etapa (cambiar la fecha reabre el aviso atendido de la fecha nueva) | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/etapas/:etapaTramiteId/historial` | Listar el historial de cambios de estatus de una etapa                                                                | asesor, supervisor           | Implementada |
| GET    | `/api/v1/catalogos/etapas`                                     | Listar las etapas del proceso (0 a 15)                                                                                | asesor, auxiliar, supervisor | 501          |
| GET    | `/api/v1/catalogos/estatus`                                    | Listar los estatus de trámite                                                                                         | asesor, auxiliar, supervisor | Implementada |

## tramites

| Método | Ruta                                                                                 | Descripción                                                                                                                           | Roles                        | Estado       |
| ------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------ |
| GET    | `/api/v1/correcciones`                                                               | Clientes del asesor que requieren al menos una fase (F2, F3 o F4), con `requiere`, `correcciones` y `documentos_cargados`; máximo 500 | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/correcciones`                                           | Listar correcciones del cliente                                                                                                       | asesor                       | Implementada |
| POST   | `/api/v1/clientes/:clienteId/correcciones`                                           | Registrar una corrección                                                                                                              | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/correcciones/:correccionId`                             | Obtener una corrección                                                                                                                | asesor                       | Implementada |
| PATCH  | `/api/v1/clientes/:clienteId/correcciones/:correccionId`                             | Actualizar una corrección                                                                                                             | asesor                       | Implementada |
| DELETE | `/api/v1/clientes/:clienteId/correcciones/:correccionId`                             | Quitar una corrección (si es de unificación de NSS, también su detalle y secundarios)                                                 | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/correcciones/:correccionId/unificacion-nss`             | Obtener el detalle de unificación de NSS                                                                                              | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/correcciones/:correccionId/unificacion-nss`             | Crear o reemplazar el detalle de unificación de NSS                                                                                   | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/correcciones/:correccionId/unificacion-nss/secundarios` | Listar los NSS secundarios                                                                                                            | asesor                       | Implementada |
| POST   | `/api/v1/clientes/:clienteId/correcciones/:correccionId/unificacion-nss/secundarios` | Agregar un NSS secundario                                                                                                             | asesor                       | Implementada |
| GET    | `/api/v1/catalogos/tipos-correccion`                                                 | Listar tipos de corrección                                                                                                            | asesor, auxiliar, supervisor | Implementada |

## diagnosticos

| Método | Ruta                                                                  | Descripción                                                       | Roles                        | Estado       |
| ------ | --------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------- | ------------ |
| GET    | `/api/v1/clientes/:clienteId/diagnostico`                             | Obtener el diagnóstico especializado                              | asesor                       | Implementada |
| POST   | `/api/v1/clientes/:clienteId/diagnostico`                             | Crear el diagnóstico especializado                                | asesor                       | Implementada |
| PATCH  | `/api/v1/clientes/:clienteId/diagnostico`                             | Actualizar el diagnóstico especializado                           | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/recuperacion-semanas`        | Obtener el análisis de recuperación de semanas                    | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/recuperacion-semanas`        | Crear o reemplazar el análisis de recuperación de semanas         | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/modalidad-40-retroactivo`    | Obtener el análisis de Modalidad 40 retroactiva                   | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/modalidad-40-retroactivo`    | Crear o reemplazar el análisis de Modalidad 40 retroactiva        | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/escenarios`                  | Listar los escenarios de pensión                                  | asesor                       | Implementada |
| POST   | `/api/v1/clientes/:clienteId/diagnostico/escenarios`                  | Agregar un escenario de pensión                                   | asesor                       | Implementada |
| PATCH  | `/api/v1/clientes/:clienteId/diagnostico/escenarios/:escenarioId`     | Actualizar un escenario de pensión                                | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/periodos-inconsistencias`                | Listar los periodos con inconsistencias                           | asesor                       | Implementada |
| POST   | `/api/v1/clientes/:clienteId/periodos-inconsistencias`                | Agregar un periodo con inconsistencia                             | asesor                       | Implementada |
| PATCH  | `/api/v1/clientes/:clienteId/periodos-inconsistencias/:periodoId`     | Actualizar un periodo con inconsistencia                          | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/plan-accion`                 | Listar el plan de acción                                          | asesor                       | Implementada |
| POST   | `/api/v1/clientes/:clienteId/diagnostico/plan-accion`                 | Agregar una acción al plan                                        | asesor                       | Implementada |
| PATCH  | `/api/v1/clientes/:clienteId/diagnostico/plan-accion/:planAccionId`   | Actualizar una acción del plan                                    | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/situacion-patrimonial`       | Obtener la situación patrimonial                                  | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/situacion-patrimonial`       | Crear o reemplazar la situación patrimonial                       | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/situacion-patrimonial/hijos` | Listar los hijos de la situación patrimonial                      | asesor                       | Implementada |
| POST   | `/api/v1/clientes/:clienteId/diagnostico/situacion-patrimonial/hijos` | Agregar un hijo a la situación patrimonial                        | asesor                       | Implementada |
| GET    | `/api/v1/catalogos/estrategias-recomendadas`                          | Listar estrategias recomendadas                                   | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/objetivos-diagnostico`                             | Listar objetivos del diagnóstico                                  | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/tipos-inconsistencia`                              | Listar tipos de inconsistencia detectada                          | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/tipos-gestion-recuperacion`                        | Listar tipos de gestión de recuperación                           | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/tipos-evidencia-recuperacion`                      | Listar tipos de evidencia de recuperación                         | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/objetivos-modalidad-10`                            | Listar objetivos de Modalidad 10                                  | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/objetivos-modalidad-40`                            | Listar objetivos de Modalidad 40                                  | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/catalogos/documentos-diagnostico`                            | Listar los documentos requeridos del F1 (sección 2)               | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/conveniencia-retroactivo`    | Listar evaluación de conveniencia del retroactivo (sección 9)     | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/conveniencia-retroactivo`    | Reemplazar evaluación de conveniencia del retroactivo (sección 9) | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/criterios-modalidad-10`      | Listar criterios de aplicabilidad de Modalidad 10 (sección 7)     | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/criterios-modalidad-10`      | Reemplazar criterios de aplicabilidad de Modalidad 10 (sección 7) | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/criterios-modalidad-40`      | Listar requisitos y restricciones de Modalidad 40 (sección 8)     | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/criterios-modalidad-40`      | Reemplazar requisitos y restricciones de Modalidad 40 (sección 8) | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/documentos`                  | Listar documentos requeridos (sección 2)                          | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/documentos`                  | Reemplazar documentos requeridos (sección 2)                      | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/estrategias-recomendadas`    | Listar estrategias recomendadas (sección 12)                      | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/estrategias-recomendadas`    | Reemplazar estrategias recomendadas (sección 12)                  | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/inconsistencias-generales`   | Listar revisión de inconsistencias (sección 4)                    | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/inconsistencias-generales`   | Reemplazar revisión de inconsistencias (sección 4)                | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/objetivos`                   | Listar objetivos del cliente (sección 1)                          | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/objetivos`                   | Reemplazar objetivos del cliente (sección 1)                      | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/objetivos-modalidad-10`      | Listar objetivos de Modalidad 10 (sección 7)                      | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/objetivos-modalidad-10`      | Reemplazar objetivos de Modalidad 10 (sección 7)                  | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/objetivos-modalidad-40`      | Listar objetivos de Modalidad 40 (sección 8)                      | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/objetivos-modalidad-40`      | Reemplazar objetivos de Modalidad 40 (sección 8)                  | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/pdf`                         | Descargar el formato F1 en PDF                                    | asesor                       | Implementada |
| DELETE | `/api/v1/clientes/:clienteId/diagnostico/plan-accion/:planAccionId`   | Eliminar una acción del plan                                      | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/recuperacion-evidencias`     | Listar evidencia mínima de recuperación (sección 5)               | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/recuperacion-evidencias`     | Reemplazar evidencia mínima de recuperación (sección 5)           | asesor                       | Implementada |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/recuperacion-gestiones`      | Listar tipos de gestión de recuperación (sección 5)               | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/recuperacion-gestiones`      | Reemplazar tipos de gestión de recuperación (sección 5)           | asesor                       | Implementada |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/situacion-patrimonial/hijos` | Reemplazar la lista de hijos (una fila por hijo)                  | asesor                       | Implementada |
| DELETE | `/api/v1/clientes/:clienteId/periodos-inconsistencias/:periodoId`     | Eliminar un periodo de inconsistencia                             | asesor                       | Implementada |
| DELETE | `/api/v1/clientes/:clienteId/diagnostico/escenarios/:escenarioId`     | Eliminar un escenario de pensión                                  | asesor                       | Implementada |

## agenda

| Método | Ruta                       | Descripción                                                                                               | Roles                        | Estado       |
| ------ | -------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------ |
| GET    | `/api/v1/agenda`           | Listar eventos de la agenda                                                                               | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/agenda/:eventoId` | Obtener un evento                                                                                         | asesor, auxiliar, supervisor | Implementada |
| POST   | `/api/v1/agenda`           | Agendar un evento                                                                                         | asesor                       | Implementada |
| PATCH  | `/api/v1/agenda/:eventoId` | Reagendar, cumplir o cancelar un evento (cambiar fecha u hora reabre el aviso atendido de la fecha nueva) | asesor                       | Implementada |

## avisos

| Método | Ruta                              | Descripción                   | Roles                        | Estado       |
| ------ | --------------------------------- | ----------------------------- | ---------------------------- | ------------ |
| GET    | `/api/v1/avisos`                  | Listar avisos                 | asesor, auxiliar, supervisor | Implementada |
| GET    | `/api/v1/avisos/:avisoId`         | Obtener un aviso              | asesor, auxiliar, supervisor | Implementada |
| PATCH  | `/api/v1/avisos/:avisoId/atender` | Marcar un aviso como atendido | asesor, auxiliar, supervisor | Implementada |

## dashboard

| Método | Ruta                | Descripción                                                                                                                                                                | Roles                        | Estado       |
| ------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------ |
| GET    | `/api/v1/dashboard` | Resumen del Dashboard de Inicio ya calculado y con el alcance del usuario (parámetro opcional `limite`, entero de 1 a 50; 8; el asesor recibe además `avance_por_cliente`) | asesor, auxiliar, supervisor | Implementada |

## reportes

| Método | Ruta                   | Descripción                                                                                                                         | Roles              | Estado       |
| ------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------ |
| GET    | `/api/v1/reportes`     | Reporte operativo del periodo: semanal, mensual o trimestral (parámetros `periodo` y `fecha`; etapas 0 a 4; incluye `trazabilidad`) | asesor, supervisor | Implementada |
| GET    | `/api/v1/reportes/pdf` | Reporte operativo en PDF (mismos parámetros y alcance; diseño del F0)                                                               | asesor, supervisor | Implementada |

## etl

| Método | Ruta                        | Descripción                        | Roles      | Estado |
| ------ | --------------------------- | ---------------------------------- | ---------- | ------ |
| POST   | `/api/v1/etl/importaciones` | Importar un archivo Excel (esbozo) | supervisor | 501    |

## health

| Método | Ruta             | Descripción         | Roles                | Estado       |
| ------ | ---------------- | ------------------- | -------------------- | ------------ |
| GET    | `/api/v1/health` | Estado del servicio | (pública, sin token) | Implementada |
