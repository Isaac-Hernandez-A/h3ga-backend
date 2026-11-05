# Endpoints de la API

Generado a partir de los controladores de `apps/api/src`. Prefijo global: `/api/v1`. Swagger UI: `/api/docs`.

- **Total: 81 rutas.** Implementadas: 2 (`GET /health` y `GET /clientes/:clienteId`). Las otras 79 están esbozadas (contrato, DTO y roles definidos) y responden **501 Not Implemented**.
- Roles: los de la Tabla 2 de la Memoria, definidos en un solo lugar (`common/auth/permisos.ts`) y declarados con `@Roles(...)`. Los supuestos que la Tabla 2 no cubre están anotados en ese archivo.
- **Aplicación real de los guards:** hoy solo `GET /clientes/:clienteId` encadena `JwtAuthGuard` → `RolesGuard` → `ClienteAccessGuard`. En las demás rutas el rol está _declarado_ pero aún no se hace cumplir (no hay guard global); cablearlos en cada ruta queda pendiente.
- Errores con formato uniforme: `{ statusCode, error, message, path, timestamp }`.

## Resumen por módulo

| Módulo         | Rutas |
| -------------- | ----- |
| usuarios-roles | 6     |
| clientes       | 18    |
| documentos     | 5     |
| etapas         | 6     |
| tramites       | 9     |
| diagnosticos   | 27    |
| agenda         | 4     |
| avisos         | 3     |
| reportes       | 1     |
| etl            | 1     |
| health         | 1     |

## usuarios-roles

| Método | Ruta                             | Descripción                                   | Roles                        | Estado |
| ------ | -------------------------------- | --------------------------------------------- | ---------------------------- | ------ |
| GET    | `/api/v1/usuarios`               | Listar usuarios                               | supervisor                   | 501    |
| GET    | `/api/v1/usuarios/:usuarioId`    | Obtener un usuario                            | supervisor                   | 501    |
| POST   | `/api/v1/usuarios`               | Crear un usuario                              | supervisor                   | 501    |
| PATCH  | `/api/v1/usuarios/:usuarioId`    | Actualizar o desactivar un usuario            | supervisor                   | 501    |
| GET    | `/api/v1/catalogos/roles`        | Listar roles                                  | asesor, auxiliar, supervisor | 501    |
| GET    | `/api/v1/catalogos/tipos-asesor` | Listar tipos de asesor (tabla de otro módulo) | asesor, auxiliar, supervisor | 501    |

## clientes

| Método | Ruta                                                        | Descripción                                        | Roles                        | Estado       |
| ------ | ----------------------------------------------------------- | -------------------------------------------------- | ---------------------------- | ------------ |
| GET    | `/api/v1/clientes`                                          | Listar clientes                                    | asesor, auxiliar, supervisor | 501          |
| GET    | `/api/v1/clientes/:clienteId`                               | Obtener un cliente                                 | asesor, auxiliar, supervisor | Implementada |
| POST   | `/api/v1/clientes`                                          | Registrar un cliente                               | asesor                       | 501          |
| PATCH  | `/api/v1/clientes/:clienteId`                               | Actualizar un cliente                              | asesor                       | 501          |
| PATCH  | `/api/v1/clientes/:clienteId/asesor`                        | Reasignar el expediente del cliente a otro asesor  | supervisor                   | 501          |
| GET    | `/api/v1/clientes/:clienteId/auxiliares`                    | Listar auxiliares asignados al cliente             | asesor, supervisor           | 501          |
| POST   | `/api/v1/clientes/:clienteId/auxiliares`                    | Asignar un auxiliar al cliente                     | asesor                       | 501          |
| PATCH  | `/api/v1/clientes/:clienteId/auxiliares/:clienteAuxiliarId` | Activar o desactivar la asignación de un auxiliar  | asesor                       | 501          |
| GET    | `/api/v1/clientes/:clienteId/historial-laboral`             | Obtener el historial laboral                       | asesor, supervisor           | 501          |
| PUT    | `/api/v1/clientes/:clienteId/historial-laboral`             | Crear o reemplazar el historial laboral            | asesor                       | 501          |
| GET    | `/api/v1/clientes/:clienteId/historial-laboral/issste`      | Obtener la información ISSSTE                      | asesor, supervisor           | 501          |
| PUT    | `/api/v1/clientes/:clienteId/historial-laboral/issste`      | Crear o reemplazar la información ISSSTE           | asesor                       | 501          |
| GET    | `/api/v1/clientes/:clienteId/objetivos-especificos`         | Listar los objetivos específicos marcados (F0)     | asesor, supervisor           | 501          |
| PUT    | `/api/v1/clientes/:clienteId/objetivos-especificos`         | Reemplazar los objetivos específicos marcados (F0) | asesor                       | 501          |
| GET    | `/api/v1/catalogos/regimenes`                               | Listar regímenes                                   | asesor, auxiliar, supervisor | 501          |
| GET    | `/api/v1/catalogos/leyes-probables`                         | Listar leyes probables                             | asesor, auxiliar, supervisor | 501          |
| GET    | `/api/v1/catalogos/afores`                                  | Listar AFORE                                       | asesor, auxiliar, supervisor | 501          |
| GET    | `/api/v1/catalogos/objetivos-especificos`                   | Listar el catálogo de objetivos específicos (F0)   | asesor, auxiliar, supervisor | 501          |

## documentos

| Método | Ruta                                                  | Descripción                                                 | Roles                        | Estado |
| ------ | ----------------------------------------------------- | ----------------------------------------------------------- | ---------------------------- | ------ |
| GET    | `/api/v1/clientes/:clienteId/documentos`              | Listar documentos del cliente                               | asesor, auxiliar, supervisor | 501    |
| GET    | `/api/v1/clientes/:clienteId/documentos/:documentoId` | Obtener un documento                                        | asesor, auxiliar, supervisor | 501    |
| POST   | `/api/v1/clientes/:clienteId/documentos`              | Registrar un documento del cliente                          | asesor, auxiliar             | 501    |
| PATCH  | `/api/v1/clientes/:clienteId/documentos/:documentoId` | Revisar un documento: actualizar su estatus u observaciones | asesor, auxiliar, supervisor | 501    |
| GET    | `/api/v1/catalogos/tipos-documento`                   | Listar tipos de documento                                   | asesor, auxiliar, supervisor | 501    |

## etapas

| Método | Ruta                                                           | Descripción                                            | Roles                        | Estado |
| ------ | -------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------- | ------ |
| GET    | `/api/v1/clientes/:clienteId/etapas`                           | Listar las etapas del cliente                          | asesor, supervisor           | 501    |
| POST   | `/api/v1/clientes/:clienteId/etapas`                           | Registrar una etapa del cliente                        | asesor                       | 501    |
| PATCH  | `/api/v1/clientes/:clienteId/etapas/:etapaTramiteId`           | Actualizar estatus, avance o acción de una etapa       | asesor                       | 501    |
| GET    | `/api/v1/clientes/:clienteId/etapas/:etapaTramiteId/historial` | Listar el historial de cambios de estatus de una etapa | asesor, supervisor           | 501    |
| GET    | `/api/v1/catalogos/etapas`                                     | Listar las etapas del proceso (0 a 15)                 | asesor, auxiliar, supervisor | 501    |
| GET    | `/api/v1/catalogos/estatus`                                    | Listar los estatus de trámite                          | asesor, auxiliar, supervisor | 501    |

## tramites

| Método | Ruta                                                                                 | Descripción                                         | Roles                        | Estado |
| ------ | ------------------------------------------------------------------------------------ | --------------------------------------------------- | ---------------------------- | ------ |
| GET    | `/api/v1/clientes/:clienteId/correcciones`                                           | Listar correcciones del cliente                     | asesor                       | 501    |
| POST   | `/api/v1/clientes/:clienteId/correcciones`                                           | Registrar una corrección                            | asesor                       | 501    |
| GET    | `/api/v1/clientes/:clienteId/correcciones/:correccionId`                             | Obtener una corrección                              | asesor                       | 501    |
| PATCH  | `/api/v1/clientes/:clienteId/correcciones/:correccionId`                             | Actualizar una corrección                           | asesor                       | 501    |
| GET    | `/api/v1/clientes/:clienteId/correcciones/:correccionId/unificacion-nss`             | Obtener el detalle de unificación de NSS            | asesor                       | 501    |
| PUT    | `/api/v1/clientes/:clienteId/correcciones/:correccionId/unificacion-nss`             | Crear o reemplazar el detalle de unificación de NSS | asesor                       | 501    |
| GET    | `/api/v1/clientes/:clienteId/correcciones/:correccionId/unificacion-nss/secundarios` | Listar los NSS secundarios                          | asesor                       | 501    |
| POST   | `/api/v1/clientes/:clienteId/correcciones/:correccionId/unificacion-nss/secundarios` | Agregar un NSS secundario                           | asesor                       | 501    |
| GET    | `/api/v1/catalogos/tipos-correccion`                                                 | Listar tipos de corrección                          | asesor, auxiliar, supervisor | 501    |

## diagnosticos

| Método | Ruta                                                                  | Descripción                                                | Roles                        | Estado |
| ------ | --------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------- | ------ |
| GET    | `/api/v1/clientes/:clienteId/diagnostico`                             | Obtener el diagnóstico especializado                       | asesor                       | 501    |
| POST   | `/api/v1/clientes/:clienteId/diagnostico`                             | Crear el diagnóstico especializado                         | asesor                       | 501    |
| PATCH  | `/api/v1/clientes/:clienteId/diagnostico`                             | Actualizar el diagnóstico especializado                    | asesor                       | 501    |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/recuperacion-semanas`        | Obtener el análisis de recuperación de semanas             | asesor                       | 501    |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/recuperacion-semanas`        | Crear o reemplazar el análisis de recuperación de semanas  | asesor                       | 501    |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/modalidad-40-retroactivo`    | Obtener el análisis de Modalidad 40 retroactiva            | asesor                       | 501    |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/modalidad-40-retroactivo`    | Crear o reemplazar el análisis de Modalidad 40 retroactiva | asesor                       | 501    |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/escenarios`                  | Listar los escenarios de pensión                           | asesor                       | 501    |
| POST   | `/api/v1/clientes/:clienteId/diagnostico/escenarios`                  | Agregar un escenario de pensión                            | asesor                       | 501    |
| PATCH  | `/api/v1/clientes/:clienteId/diagnostico/escenarios/:escenarioId`     | Actualizar un escenario de pensión                         | asesor                       | 501    |
| GET    | `/api/v1/clientes/:clienteId/periodos-inconsistencias`                | Listar los periodos con inconsistencias                    | asesor                       | 501    |
| POST   | `/api/v1/clientes/:clienteId/periodos-inconsistencias`                | Agregar un periodo con inconsistencia                      | asesor                       | 501    |
| PATCH  | `/api/v1/clientes/:clienteId/periodos-inconsistencias/:periodoId`     | Actualizar un periodo con inconsistencia                   | asesor                       | 501    |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/plan-accion`                 | Listar el plan de acción                                   | asesor                       | 501    |
| POST   | `/api/v1/clientes/:clienteId/diagnostico/plan-accion`                 | Agregar una acción al plan                                 | asesor                       | 501    |
| PATCH  | `/api/v1/clientes/:clienteId/diagnostico/plan-accion/:planAccionId`   | Actualizar una acción del plan                             | asesor                       | 501    |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/situacion-patrimonial`       | Obtener la situación patrimonial                           | asesor                       | 501    |
| PUT    | `/api/v1/clientes/:clienteId/diagnostico/situacion-patrimonial`       | Crear o reemplazar la situación patrimonial                | asesor                       | 501    |
| GET    | `/api/v1/clientes/:clienteId/diagnostico/situacion-patrimonial/hijos` | Listar los hijos de la situación patrimonial               | asesor                       | 501    |
| POST   | `/api/v1/clientes/:clienteId/diagnostico/situacion-patrimonial/hijos` | Agregar un hijo a la situación patrimonial                 | asesor                       | 501    |
| GET    | `/api/v1/catalogos/estrategias-recomendadas`                          | Listar estrategias recomendadas                            | asesor, auxiliar, supervisor | 501    |
| GET    | `/api/v1/catalogos/objetivos-diagnostico`                             | Listar objetivos del diagnóstico                           | asesor, auxiliar, supervisor | 501    |
| GET    | `/api/v1/catalogos/tipos-inconsistencia`                              | Listar tipos de inconsistencia detectada                   | asesor, auxiliar, supervisor | 501    |
| GET    | `/api/v1/catalogos/tipos-gestion-recuperacion`                        | Listar tipos de gestión de recuperación                    | asesor, auxiliar, supervisor | 501    |
| GET    | `/api/v1/catalogos/tipos-evidencia-recuperacion`                      | Listar tipos de evidencia de recuperación                  | asesor, auxiliar, supervisor | 501    |
| GET    | `/api/v1/catalogos/objetivos-modalidad-10`                            | Listar objetivos de Modalidad 10                           | asesor, auxiliar, supervisor | 501    |
| GET    | `/api/v1/catalogos/objetivos-modalidad-40`                            | Listar objetivos de Modalidad 40                           | asesor, auxiliar, supervisor | 501    |

## agenda

| Método | Ruta                       | Descripción                             | Roles                        | Estado |
| ------ | -------------------------- | --------------------------------------- | ---------------------------- | ------ |
| GET    | `/api/v1/agenda`           | Listar eventos de la agenda             | asesor, auxiliar, supervisor | 501    |
| GET    | `/api/v1/agenda/:eventoId` | Obtener un evento                       | asesor, auxiliar, supervisor | 501    |
| POST   | `/api/v1/agenda`           | Agendar un evento                       | asesor                       | 501    |
| PATCH  | `/api/v1/agenda/:eventoId` | Reagendar, cumplir o cancelar un evento | asesor                       | 501    |

## avisos

| Método | Ruta                              | Descripción                   | Roles                        | Estado |
| ------ | --------------------------------- | ----------------------------- | ---------------------------- | ------ |
| GET    | `/api/v1/avisos`                  | Listar avisos                 | asesor, auxiliar, supervisor | 501    |
| GET    | `/api/v1/avisos/:avisoId`         | Obtener un aviso              | asesor, auxiliar, supervisor | 501    |
| PATCH  | `/api/v1/avisos/:avisoId/atender` | Marcar un aviso como atendido | asesor, auxiliar, supervisor | 501    |

## reportes

| Método | Ruta               | Descripción                   | Roles              | Estado |
| ------ | ------------------ | ----------------------------- | ------------------ | ------ |
| GET    | `/api/v1/reportes` | Consultar un reporte (esbozo) | asesor, supervisor | 501    |

## etl

| Método | Ruta                        | Descripción                        | Roles      | Estado |
| ------ | --------------------------- | ---------------------------------- | ---------- | ------ |
| POST   | `/api/v1/etl/importaciones` | Importar un archivo Excel (esbozo) | supervisor | 501    |

## health

| Método | Ruta             | Descripción         | Roles                | Estado       |
| ------ | ---------------- | ------------------- | -------------------- | ------------ |
| GET    | `/api/v1/health` | Estado del servicio | (pública, sin token) | Implementada |
