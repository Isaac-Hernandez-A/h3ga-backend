# Resultados de pruebas

Generado el 2026-11-17 con `node scripts/reporte-pruebas.mjs` a partir de `jest --json` (apps/api). No se edita a mano.

## Resumen por suite

| Suite                                                 | Pruebas | Pasan   | Fallan | Tiempo (s) |
| ----------------------------------------------------- | ------- | ------- | ------ | ---------- |
| acceso-matriz.spec.ts                                 | 9       | 9       | 0      | 22.58      |
| agenda/agenda.e2e.spec.ts                             | 3       | 3       | 0      | 3.51       |
| auth/auth.e2e.spec.ts                                 | 7       | 7       | 0      | 3.60       |
| auth/auth.service.spec.ts                             | 9       | 9       | 0      | 1.91       |
| auth/contrasena.e2e.spec.ts                           | 7       | 7       | 0      | 4.96       |
| avisos/avisos-enriquecidos.e2e.spec.ts                | 7       | 7       | 0      | 3.88       |
| avisos/avisos-reapertura.e2e.spec.ts                  | 5       | 5       | 0      | 4.57       |
| avisos/avisos.service.spec.ts                         | 7       | 7       | 0      | 5.63       |
| catalogos.e2e.spec.ts                                 | 4       | 4       | 0      | 4.49       |
| clientes/auxiliares.e2e.spec.ts                       | 3       | 3       | 0      | 4.48       |
| clientes/cliente-auxiliar.autorizacion.spec.ts        | 4       | 4       | 0      | 1.42       |
| clientes/clientes-acceso.spec.ts                      | 14      | 14      | 0      | 2.08       |
| clientes/clientes-lecturas.e2e.spec.ts                | 5       | 5       | 0      | 3.78       |
| clientes/clientes.controller.roles.spec.ts            | 8       | 8       | 0      | 1.67       |
| clientes/clientes.e2e.spec.ts                         | 10      | 10      | 0      | 3.87       |
| clientes/clientes.service.spec.ts                     | 1       | 1       | 0      | 3.20       |
| clientes/crear-interno.spec.ts                        | 5       | 5       | 0      | 4.22       |
| clientes/issste.e2e.spec.ts                           | 12      | 12      | 0      | 5.41       |
| common/auth/cliente-access.guard.spec.ts              | 13      | 13      | 0      | 2.32       |
| common/auth/clientes-accesibles.spec.ts               | 4       | 4       | 0      | 0.08       |
| common/auth/dev-token.spec.ts                         | 11      | 11      | 0      | 2.89       |
| common/auth/jwt-auth.guard.spec.ts                    | 11      | 11      | 0      | 1.32       |
| common/auth/normalizar-rol.spec.ts                    | 10      | 10      | 0      | 0.09       |
| common/auth/permisos.spec.ts                          | 4       | 4       | 0      | 0.07       |
| common/auth/roles.guard.spec.ts                       | 9       | 9       | 0      | 0.85       |
| common/config/cors.spec.ts                            | 7       | 7       | 0      | 2.00       |
| common/config/validar-entorno.spec.ts                 | 9       | 9       | 0      | 0.11       |
| common/fechas.spec.ts                                 | 10      | 10      | 0      | 0.69       |
| common/filters/all-exceptions.filter.spec.ts          | 4       | 4       | 0      | 0.82       |
| common/seguridad/password-hasher.spec.ts              | 4       | 4       | 0      | 1.30       |
| common/testing/bd-pruebas.spec.ts                     | 5       | 5       | 0      | 2.22       |
| common/testing/defectos.spec.ts                       | 4       | 4       | 0      | 0.08       |
| dashboard/dashboard.e2e.spec.ts                       | 13      | 13      | 0      | 5.83       |
| diagnosticos/f1-avance-pdf.e2e.spec.ts                | 8       | 8       | 0      | 10.66      |
| diagnosticos/f1-cabecera.e2e.spec.ts                  | 8       | 8       | 0      | 4.79       |
| diagnosticos/f1-listas.e2e.spec.ts                    | 22      | 22      | 0      | 8.19       |
| diagnosticos/f1-secciones.e2e.spec.ts                 | 10      | 10      | 0      | 6.93       |
| documentos/documentos.e2e.spec.ts                     | 10      | 10      | 0      | 5.49       |
| documentos/storage/local-storage.adapter.spec.ts      | 4       | 4       | 0      | 0.13       |
| documentos/storage/spaces-storage.adapter.spec.ts     | 5       | 5       | 0      | 0.20       |
| etapas/etapas-auxiliar.e2e.spec.ts                    | 3       | 3       | 0      | 4.28       |
| etapas/etapas.e2e.spec.ts                             | 6       | 6       | 0      | 3.88       |
| etapas/etapas.service.spec.ts                         | 5       | 5       | 0      | 3.75       |
| etapas/reglas-avance.spec.ts                          | 9       | 9       | 0      | 0.10       |
| etl/aceptacion.e2e.spec.ts                            | 10      | 9       | 0      | 10.24      |
| etl/cargador.spec.ts                                  | 17      | 17      | 0      | 6.72       |
| etl/catalogos-etapa.spec.ts                           | 36      | 36      | 0      | 1.13       |
| etl/cli.spec.ts                                       | 12      | 12      | 0      | 7.18       |
| etl/etl.e2e.spec.ts                                   | 16      | 16      | 0      | 6.99       |
| etl/etl.service.spec.ts                               | 18      | 18      | 0      | 23.26      |
| etl/fecha.spec.ts                                     | 28      | 28      | 0      | 0.64       |
| etl/identificadores.spec.ts                           | 34      | 34      | 0      | 1.21       |
| etl/lector-excel.spec.ts                              | 8       | 8       | 0      | 2.47       |
| etl/mapa-asesores.spec.ts                             | 13      | 13      | 0      | 0.94       |
| etl/texto.spec.ts                                     | 20      | 20      | 0      | 0.11       |
| etl/validador.spec.ts                                 | 41      | 41      | 0      | 0.93       |
| health/health.controller.spec.ts                      | 1       | 1       | 0      | 1.92       |
| reporte-pruebas.spec.ts                               | 3       | 3       | 0      | 0.35       |
| reportes/pdf/f0-modelo.spec.ts                        | 12      | 12      | 0      | 0.18       |
| reportes/pdf/f0-pdf.e2e.spec.ts                       | 2       | 2       | 0      | 7.94       |
| reportes/pdf/f0-pdf.service.spec.ts                   | 6       | 6       | 0      | 22.93      |
| reportes/pdf/reporte-pdf.service.spec.ts              | 4       | 4       | 0      | 7.41       |
| reportes/reportes-pdf.e2e.spec.ts                     | 3       | 3       | 0      | 10.94      |
| reportes/reportes-trimestral-trazabilidad.e2e.spec.ts | 8       | 8       | 0      | 6.46       |
| reportes/reportes.e2e.spec.ts                         | 2       | 2       | 0      | 4.00       |
| reportes/reportes.service.spec.ts                     | 10      | 10      | 0      | 4.49       |
| scripts/seed-supervisor.spec.ts                       | 4       | 4       | 0      | 5.86       |
| swagger.e2e.spec.ts                                   | 3       | 3       | 0      | 3.15       |
| tramites/correcciones-modulo.e2e.spec.ts              | 16      | 16      | 0      | 18.99      |
| tramites/correcciones.e2e.spec.ts                     | 12      | 12      | 0      | 8.13       |
| tramites/reglas-correcciones.spec.ts                  | 9       | 9       | 0      | 0.65       |
| tramites/tramites.e2e.spec.ts                         | 11      | 11      | 0      | 5.10       |
| usuarios-roles/restablecer-contrasena.e2e.spec.ts     | 7       | 7       | 0      | 4.72       |
| usuarios-roles/usuarios-roles.e2e.spec.ts             | 11      | 11      | 0      | 4.74       |
| usuarios-roles/usuarios-roles.service.spec.ts         | 12      | 12      | 0      | 1.45       |
| **Total**                                             | **717** | **716** | **0**  | **335.52** |

Las pruebas pendientes (`it.todo`, `skip` o suites con base real sin `TEST_DATABASE_URL`) cuentan en "Pruebas" pero no en "Pasan" ni "Fallan".

## Casos CP

| ID     | Descripción                                                                                                                                                                            | Resultado   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| CP-01  | sin token responde 401 en todas las rutas salvo las públicas (/health y /auth/login)                                                                                                   | ✔ Pasa      |
| CP-02  | token vencido o con firma inválida responde 401                                                                                                                                        | ✔ Pasa      |
| CP-03  | rol no permitido responde 403 en cada ruta                                                                                                                                             | ✔ Pasa      |
| CP-04  | rol permitido supera los guards en cada ruta                                                                                                                                           | ✔ Pasa      |
| CP-05  | asesor B sobre un cliente de asesor A recibe 404 en toda ruta :clienteId                                                                                                               | ✔ Pasa      |
| CP-06  | auxiliar: autorización activa pasa; sin registro o con activo=false recibe 404                                                                                                         | ✔ Pasa      |
| CP-07  | supervisor accede a cualquier cliente existente; inexistente da el mismo 404 que sin acceso                                                                                            | ✔ Pasa      |
| CP-08  | supervisor crea usuario: 201, sin contrasena_hash en la respuesta y hash bcrypt en BD                                                                                                  | ✔ Pasa      |
| CP-08  | cifra la contraseña, guarda solo el hash y no devuelve contraseña ni hash                                                                                                              | ✔ Pasa      |
| CP-09  | correo repetido responde 409                                                                                                                                                           | ✔ Pasa      |
| CP-09  | un correo repetido responde 409                                                                                                                                                        | ✔ Pasa      |
| CP-10  | asesor y auxiliar no pueden crear ni editar usuarios (403)                                                                                                                             | ✔ Pasa      |
| CP-11  | PATCH activo=false desactiva sin borrar; el listado filtra por activo                                                                                                                  | ✔ Pasa      |
| CP-11  | PATCH activo=false desactiva sin borrar al usuario                                                                                                                                     | ✔ Pasa      |
| CP-11  | el listado filtra por activo                                                                                                                                                           | ✔ Pasa      |
| CP-12  | tipo_asesor_id inexistente responde 400; nulo es válido                                                                                                                                | ✔ Pasa      |
| CP-12  | un tipo_asesor_id inexistente responde 400; nulo y omitido son válidos                                                                                                                 | ✔ Pasa      |
| CP-13  | los tres roles pueden leer el catálogo de roles                                                                                                                                        | ✔ Pasa      |
| CP-13  | listarRoles devuelve los roles y listarTiposAsesor el catálogo (de solo lectura)                                                                                                       | ✔ Pasa      |
| CP-14  | listar: asesor ve solo los suyos, auxiliar solo los autorizados activos, supervisor todos                                                                                              | ✔ Pasa      |
| CP-15  | crear fija asesor_id = sub e ignora el asesor_id enviado                                                                                                                               | ✔ Pasa      |
| CP-15b | crear deja las 16 etapas del cliente, una por paso, en Por iniciar con avance 10                                                                                                       | ✔ Pasa      |
| CP-15c | si falla la creación de las etapas, no queda el cliente (rollback)                                                                                                                     | ✔ Pasa      |
| CP-16  | CURP con formato inválido responde 400; CURP repetida responde 409                                                                                                                     | ✔ Pasa      |
| CP-17  | un asesor que no es dueño no puede editar el cliente (404)                                                                                                                             | ✔ Pasa      |
| CP-18  | reasignar: supervisor 200; asesor 403; destino inexistente o que no es asesor responde 400                                                                                             | ✔ Pasa      |
| CP-19  | autorizar guarda autorizado_por = sub; repetir el par reactiva la fila sin duplicar; el usuario debe ser auxiliar                                                                      | ✔ Pasa      |
| CP-20  | desactivar la autorización quita el acceso en la siguiente petición (404)                                                                                                              | ✔ Pasa      |
| CP-21  | PUT historial-laboral es idempotente: dos PUT iguales dejan un solo registro                                                                                                           | ✔ Pasa      |
| CP-22  | Por iniciar 10; Finalizado 100; En proceso 55 queda 55; En proceso 15 o 95 lanza error; Bloqueado conserva 40                                                                          | ✔ Pasa      |
| CP-23  | Bloqueado sin motivo_rechazo responde 400; con motivo, el historial lo guarda                                                                                                          | ✔ Pasa      |
| CP-24  | cada cambio inserta una fila de historial con estatus anterior y nuevo, usuario y fecha                                                                                                | ✔ Pasa      |
| CP-25  | si falla el insert del historial, la etapa conserva estatus y avance (rollback)                                                                                                        | ✔ Pasa      |
| CP-26  | no existe ruta ni método que modifique o elimine el historial                                                                                                                          | ✔ Pasa      |
| CP-27  | avanceGlobal excluye las etapas No aplica                                                                                                                                              | ✔ Pasa      |
| CP-28  | asesor ajeno recibe 404; auxiliar recibe 403 al escribir etapas                                                                                                                        | ✔ Pasa      |
| CP-29  | corrección CURP con dato_actual y dato_correcto: 201; sin dato_correcto responde 400                                                                                                   | ✔ Pasa      |
| CP-30  | al finalizar la etapa 2 se copian CURP, RFC, nacimiento, sexo y nombre; Acta, AFORE, IMSS y Otro no sobrescriben                                                                       | ✔ Pasa      |
| CP-31  | dato_correcto con CURP mal formada responde 400 y el cliente queda intacto                                                                                                             | ✔ Pasa      |
| CP-32  | nss_principal de 11 dígitos, criterio válido y etapa institucional válida; fuera de rango responde 400                                                                                 | ✔ Pasa      |
| CP-33  | un secundario igual al principal responde 400; uno repetido responde 409                                                                                                               | ✔ Pasa      |
| CP-34  | registrar el dictamen actualiza semanas_imss_reconocidas y no toca semanas_a_recuperar                                                                                                 | ✔ Pasa      |
| CP-35  | un asesor no registra correcciones de clientes ajenos (404); el auxiliar recibe 403                                                                                                    | ✔ Pasa      |
| CP-36  | el asesor agenda para su cliente; para uno ajeno 404; estatus fuera de pendiente, cumplido, reagendado o cancelado responde 400                                                        | ✔ Pasa      |
| CP-37  | el asesor ve la suya, el auxiliar la de clientes autorizados, el supervisor toda; filtra por fecha                                                                                     | ✔ Pasa      |
| CP-38  | se generan avisos para etapas y eventos a 2 días o menos; no para Finalizado, Cancelado ni No aplica; las citas pendientes y reagendadas sí, las cumplidas y canceladas no             | ✔ Pasa      |
| CP-39  | dos consultas seguidas y dos en paralelo no duplican avisos                                                                                                                            | ✔ Pasa      |
| CP-40  | borde de zona: a las 23:30 de Cancún del día D-3 no hay aviso; a las 00:00 del día D-2 sí                                                                                              | ✔ Pasa      |
| CP-41  | atender guarda atendido_por = sub y fecha_atencion; atender de nuevo conserva la primera fecha                                                                                         | ✔ Pasa      |
| CP-42  | avisos: el asesor ve los de sus clientes, el auxiliar los de autorizados, el supervisor todos                                                                                          | ✔ Pasa      |
| CP-43  | con 1,000 eventos sembrados, agenda y avisos responden en menos de 5 s (RNF-01)                                                                                                        | ✔ Pasa      |
| CP-44  | subir un archivo nuevo del mismo tipo reemplaza al anterior: queda una fila vigente y el archivo viejo se borra                                                                        | ✔ Pasa      |
| CP-45  | tipo distinto de PDF, JPG o PNG, o más de 10 MB, responde 400                                                                                                                          | ✔ Pasa      |
| CP-46  | asesor y auxiliar (autorizado) suben; el supervisor no sube (403) pero sí revisa                                                                                                       | ✔ Pasa      |
| CP-47  | revisar actualiza estatus y observaciones del documento                                                                                                                                | ✔ Pasa      |
| CP-48  | descargar el documento de un cliente ajeno responde 404                                                                                                                                | ✔ Pasa      |
| CP-49  | guarda, lee y borra con la clave esperada en el bucket configurado                                                                                                                     | ✔ Pasa      |
| CP-49  | nunca expone credenciales: ni en el objeto ni en los errores                                                                                                                           | ✔ Pasa      |
| CP-50  | la ruta responde 200, Content-Type application/pdf y el cuerpo empieza con %PDF-                                                                                                       | ✔ Pasa      |
| CP-51  | el texto del PDF contiene el nombre y la CURP del cliente de prueba                                                                                                                    | ✔ Pasa      |
| CP-52  | un cliente sin datos opcionales genera el PDF sin error                                                                                                                                | ✔ Pasa      |
| CP-53  | asesor ajeno recibe 404; asesor dueño, auxiliar autorizado y supervisor reciben 200                                                                                                    | ✔ Pasa      |
| CP-54  | mide e imprime el tiempo de generación (sin umbral)                                                                                                                                    | ✔ Pasa      |
| CP-55  | el reporte lista cada prueba cuyo título empieza con CP- y su resultado                                                                                                                | ✔ Pasa      |
| CP-56  | semana de lunes a domingo y mes calendario en Cancún; domingo 23:30 pertenece a esa semana, lunes 00:00 a la siguiente                                                                 | ✔ Pasa      |
| CP-57  | el asesor recibe solo métricas de sus clientes; el supervisor las de todos; el auxiliar recibe 403                                                                                     | ✔ Pasa      |
| CP-57  | el asesor y el supervisor reciben el reporte (200); el auxiliar recibe 403; sin token, 401                                                                                             | ✔ Pasa      |
| CP-58  | la matriz etapa por estatus cuenta correctamente con datos sembrados y solo incluye las etapas 0 a 4                                                                                   | ✔ Pasa      |
| CP-59  | finalizados del periodo incluye los límites del rango y excluye lo de fuera                                                                                                            | ✔ Pasa      |
| CP-60  | vencidos y por vencer respecto a un reloj fijo; excluye Finalizado, Cancelado y No aplica                                                                                              | ✔ Pasa      |
| CP-60b | la lista de vencimientos es corta (10) pero los conteos son completos                                                                                                                  | ✔ Pasa      |
| CP-61  | tasa de rechazo = bloqueos con motivo / etapas con cambios; 0 cuando no hay cambios (sin dividir entre cero)                                                                           | ✔ Pasa      |
| CP-61b | los motivos se ordenan por frecuencia y se limitan a los 5 más frecuentes                                                                                                              | ✔ Pasa      |
| CP-62  | el desglose por asesor solo aparece para el supervisor                                                                                                                                 | ✔ Pasa      |
| CP-63  | clientes nuevos y distribución por régimen respetan el periodo y el alcance                                                                                                            | ✔ Pasa      |
| CP-64  | la ruta responde 200, Content-Type application/pdf y el cuerpo empieza con %PDF-                                                                                                       | ✔ Pasa      |
| CP-65  | el texto del PDF contiene el periodo, los totales y la tasa de rechazo del reporte                                                                                                     | ✔ Pasa      |
| CP-66  | un periodo sin datos genera el PDF sin error, con ceros                                                                                                                                | ✔ Pasa      |
| CP-67  | el auxiliar recibe 403 y el asesor solo obtiene un PDF con sus clientes                                                                                                                | ✔ Pasa      |
| CP-68  | ninguna combinación ruta-rol responde 500 (el handler no falla)                                                                                                                        | ✔ Pasa      |
| CP-69  | login correcto: 200 con access_token, expires_in 28800 y usuario {id, nombre, rol}; el token trae sub, rol y exp a 8 horas                                                             | ✔ Pasa      |
| CP-69  | el correo no distingue mayúsculas                                                                                                                                                      | ✔ Pasa      |
| CP-70  | el token emitido lo acepta el guard existente en GET /clientes para cada rol                                                                                                           | ✔ Pasa      |
| CP-71  | contraseña incorrecta, correo inexistente y usuario inactivo responden 401 con el mismo mensaje                                                                                        | ✔ Pasa      |
| CP-71  | usuario inexistente: compara contra un hash ficticio y responde el mismo 401                                                                                                           | ✔ Pasa      |
| CP-71  | contraseña incorrecta y usuario inactivo responden el mismo 401                                                                                                                        | ✔ Pasa      |
| CP-72  | ninguna respuesta del login incluye contrasena_hash ni el hash                                                                                                                         | ✔ Pasa      |
| CP-73  | cuerpo sin correo o sin contraseña responde 400                                                                                                                                        | ✔ Pasa      |
| CP-74  | un origen permitido recibe Access-Control-Allow-Origin; otro origen no recibe permiso; sin comodín                                                                                     | ✔ Pasa      |
| CP-74  | la verificación previa de un DELETE (cabeceras de la pantalla de Correcciones) concede DELETE                                                                                          | ✔ Pasa      |
| CP-74  | solo concede lo acordado: métodos, cabeceras, Content-Disposition expuesta y sin credenciales                                                                                          | ✔ Pasa      |
| CP-74  | sin CORS_ORIGINS solo permite http://localhost:3000                                                                                                                                    | ✔ Pasa      |
| CP-75  | el script crea un Supervisor que puede iniciar sesión; repetirlo no duplica; la contraseña no queda en texto plano                                                                     | ✔ Pasa      |
| CP-76  | los seis catálogos responden 200 con la lista completa de su tabla, ordenada por id, para asesor, auxiliar y supervisor                                                                | ✔ Pasa      |
| CP-76  | los catálogos traen el nombre de cada elemento                                                                                                                                         | ✔ Pasa      |
| CP-76  | sin token o con un rol fuera del contrato los catálogos responden 401                                                                                                                  | ✔ Pasa      |
| CP-77  | historial laboral: asesor dueño 200, asesor ajeno 404, auxiliar 403, supervisor 200; sin datos responde vacío, no 500                                                                  | ✔ Pasa      |
| CP-77  | información ISSSTE: asesor dueño 200, asesor ajeno 404, auxiliar 403, supervisor 200; sin historial o sin datos responde vacío                                                         | ✔ Pasa      |
| CP-77  | objetivos específicos marcados: asesor dueño 200, asesor ajeno 404, auxiliar 403, supervisor 200; sin datos responde lista vacía                                                       | ✔ Pasa      |
| CP-78  | auxiliares del cliente: asesor dueño y supervisor 200; auxiliar 403; asesor ajeno 404; sin auxiliares responde lista vacía                                                             | ✔ Pasa      |
| CP-78  | la lista de auxiliares incluye también las autorizaciones desactivadas                                                                                                                 | ✔ Pasa      |
| CP-79  | la matriz cubre todas las rutas del router (3 roles cada una), ninguna combinación responde 500 y el CSV y endpoints.md coinciden con ella                                             | ✔ Pasa      |
| CP-80  | un token vencido emitido por el login responde 401 en una ruta protegida                                                                                                               | ✔ Pasa      |
| CP-81  | el auxiliar con autorización activa lee las etapas y el historial (200)                                                                                                                | ✔ Pasa      |
| CP-81  | sin autorización o con autorización inactiva el auxiliar recibe 404                                                                                                                    | ✔ Pasa      |
| CP-81  | el auxiliar sigue sin poder cambiar el estatus ni crear etapas (403), aun con autorización activa                                                                                      | ✔ Pasa      |
| CP-82  | el supervisor restablece la de un asesor: 204 sin cuerpo; entra con la nueva y ya no con la vieja                                                                                      | ✔ Pasa      |
| CP-82  | funciona también sobre un usuario inactivo (sigue inactivo y no puede entrar)                                                                                                          | ✔ Pasa      |
| CP-83  | asesor y auxiliar reciben 403 y no se cambia nada; sin token 401                                                                                                                       | ✔ Pasa      |
| CP-84  | usuario inexistente 404; id que no es uuid 400                                                                                                                                         | ✔ Pasa      |
| CP-85  | cuerpo inválido (falta, corta, larga, tipo erróneo, campo extra) responde 400 y no cambia nada                                                                                         | ✔ Pasa      |
| CP-85  | los límites de 8 y de 72 caracteres son válidos                                                                                                                                        | ✔ Pasa      |
| CP-86  | cada rol cambia la suya: 204 sin cuerpo; el login funciona con la nueva y ya no con la vieja                                                                                           | ✔ Pasa      |
| CP-86  | con la actual correcta guarda el hash de la nueva en contrasena_hash                                                                                                                   | ✔ Pasa      |
| CP-87  | la actual incorrecta responde 400 (no 401) con su mensaje y no cambia nada                                                                                                             | ✔ Pasa      |
| CP-87  | la actual incorrecta responde 400 con su mensaje y no guarda nada                                                                                                                      | ✔ Pasa      |
| CP-88  | la nueva igual a la actual responde 400 y no cambia nada                                                                                                                               | ✔ Pasa      |
| CP-88  | la nueva igual a la actual responde 400 y no guarda nada                                                                                                                               | ✔ Pasa      |
| CP-89  | cuerpo inválido (falta, nueva corta o larga, tipos erróneos, campos extra) responde 400                                                                                                | ✔ Pasa      |
| CP-90  | sin token responde 401; la nueva de 72 caracteres es válida                                                                                                                            | ✔ Pasa      |
| CP-91  | un usuario inactivo o inexistente no puede cambiarla (401) y no se modifica nada                                                                                                       | ✔ Pasa      |
| CP-91  | usuario inactivo o inexistente responde 401 y no guarda nada                                                                                                                           | ✔ Pasa      |
| CP-92  | ninguna respuesta incluye contrasena_hash ni el hash                                                                                                                                   | ✔ Pasa      |
| CP-92  | ninguna respuesta incluye contrasena_hash ni el hash                                                                                                                                   | ✔ Pasa      |
| CP-93  | crear: el asesor dueño guarda la información ISSSTE (200); sin id ni activo se genera el id y activo es true; anios_laborados vuelve como número                                       | ✔ Pasa      |
| CP-93  | el id enviado se usa al crear; activo y anios_laborados son opcionales (anios queda en null)                                                                                           | ✔ Pasa      |
| CP-94  | reemplazar: dos PUT dejan una sola fila con el mismo id, y el segundo reemplaza los datos                                                                                              | ✔ Pasa      |
| CP-94  | PUT simultáneos del mismo cliente no duplican la fila                                                                                                                                  | ✔ Pasa      |
| CP-94  | un id que ya pertenece a otro cliente responde 409 en español, no 500                                                                                                                  | ✔ Pasa      |
| CP-95  | sin historial laboral responde 409 con "Primero registra el historial laboral del cliente." y no guarda nada                                                                           | ✔ Pasa      |
| CP-96  | GET después del PUT devuelve lo guardado, para el asesor dueño y para el supervisor                                                                                                    | ✔ Pasa      |
| CP-97  | validaciones: sin nss, nss de 21 caracteres, años negativos, 1000 o con 3 decimales responden 400 y no guardan                                                                         | ✔ Pasa      |
| CP-97  | los límites válidos se aceptan: nss de 20 caracteres, años 0 y 999.99                                                                                                                  | ✔ Pasa      |
| CP-98  | roles: asesor ajeno 404, cliente inexistente 404, supervisor 403, auxiliar 403 (aun autorizado), sin token 401                                                                         | ✔ Pasa      |
| CP-99  | ninguna entrada responde 500: cuerpos que no son objeto, JSON roto y valores extremos dan 4xx                                                                                          | ✔ Pasa      |
| CP-100 | Swagger describe anios_laborados como número (nullable) y id y activo como opcionales en el cuerpo del PUT                                                                             | ✔ Pasa      |
| CP-101 | GET /catalogos/tipos-correccion devuelve los 12 tipos ordenados por id para asesor, auxiliar y supervisor; sin token 401                                                               | ✔ Pasa      |
| CP-102 | un cliente sin correcciones responde 200 con []                                                                                                                                        | ✔ Pasa      |
| CP-103 | la lista trae las correcciones del cliente en el orden de inserción (el mismo del PDF, ORDER BY ctid) y no las de otro cliente                                                         | ✔ Pasa      |
| CP-104 | GET de una corrección: 200 con sus campos; inexistente o de otro cliente 404; id que no es uuid 400                                                                                    | ✔ Pasa      |
| CP-105 | PATCH parcial: cambia solo lo enviado, devuelve la corrección actualizada y no toca el tipo ni el cliente                                                                              | ✔ Pasa      |
| CP-105 | PATCH con cuerpo {} responde 200 y deja la corrección igual                                                                                                                            | ✔ Pasa      |
| CP-106 | PATCH que borra una observación (null) y el tiempo promedio; el resto queda                                                                                                            | ✔ Pasa      |
| CP-107 | PATCH en un tipo que exige dato_correcto: no se puede borrar ni dejar con formato inválido, y el registro queda intacto                                                                | ✔ Pasa      |
| CP-108 | PATCH inválido responde 400: tipo_correccion_id y otros campos fuera del contrato, valores que no son texto y JSON roto                                                                | ✔ Pasa      |
| CP-109 | roles: asesor dueño 200; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404                                                             | ✔ Pasa      |
| CP-110 | el PDF del F0 sigue respondiendo 200 después de crear y modificar correcciones, y muestra lo modificado                                                                                | ✔ Pasa      |
| CP-111 | ninguna entrada responde 500 en las rutas de correcciones                                                                                                                              | ✔ Pasa      |
| CP-112 | un cuerpo demasiado grande (error 413 del parser, que no es HttpException) responde 413 en español, no 500                                                                             | ✔ Pasa      |
| CP-112 | otros errores 4xx del parser conservan su estado; un objeto con estado 5xx sigue siendo 500                                                                                            | ✔ Pasa      |
| CP-113 | POST crea el borrador con {}: asesor_id es el asesor del cliente, fecha_analisis es hoy (America/Cancun) y lo demás queda vacío                                                        | ✔ Pasa      |
| CP-113 | POST con datos los guarda (numéricos como número); un segundo POST responde 409; asesor_id del cuerpo no se acepta                                                                     | ✔ Pasa      |
| CP-114 | GET: sin diagnóstico responde 200 con el cuerpo vacío; con diagnóstico, la fila                                                                                                        | ✔ Pasa      |
| CP-115 | PATCH parcial: cambia solo lo enviado, null borra, {} no cambia nada; sin diagnóstico 404                                                                                              | ✔ Pasa      |
| CP-115 | PATCH inválido responde 400 y no cambia nada: enumerados, rangos, fechas, decimales y campos fuera del contrato                                                                        | ✔ Pasa      |
| CP-116 | roles: asesor dueño 200; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404                                                             | ✔ Pasa      |
| CP-117 | los 8 catálogos del F1 devuelven la lista completa de su tabla, ordenada por id, para asesor, auxiliar y supervisor; sin token 401                                                     | ✔ Pasa      |
| CP-118 | ninguna entrada responde 500 en POST y PATCH del diagnóstico                                                                                                                           | ✔ Pasa      |
| CP-119 | objetivos: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                                  | ✔ Pasa      |
| CP-119 | estrategias-recomendadas: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                   | ✔ Pasa      |
| CP-119 | inconsistencias-generales: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                  | ✔ Pasa      |
| CP-119 | objetivos-modalidad-10: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                     | ✔ Pasa      |
| CP-119 | objetivos-modalidad-40: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                     | ✔ Pasa      |
| CP-119 | recuperacion-gestiones: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                     | ✔ Pasa      |
| CP-119 | recuperacion-evidencias: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                    | ✔ Pasa      |
| CP-119 | documentos: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                                 | ✔ Pasa      |
| CP-120 | objetivos: valida los elementos (400) y no cambia lo guardado                                                                                                                          | ✔ Pasa      |
| CP-120 | estrategias-recomendadas: valida los elementos (400) y no cambia lo guardado                                                                                                           | ✔ Pasa      |
| CP-120 | inconsistencias-generales: valida los elementos (400) y no cambia lo guardado                                                                                                          | ✔ Pasa      |
| CP-120 | objetivos-modalidad-10: valida los elementos (400) y no cambia lo guardado                                                                                                             | ✔ Pasa      |
| CP-120 | objetivos-modalidad-40: valida los elementos (400) y no cambia lo guardado                                                                                                             | ✔ Pasa      |
| CP-120 | recuperacion-gestiones: valida los elementos (400) y no cambia lo guardado                                                                                                             | ✔ Pasa      |
| CP-120 | recuperacion-evidencias: valida los elementos (400) y no cambia lo guardado                                                                                                            | ✔ Pasa      |
| CP-120 | documentos: valida los elementos (400) y no cambia lo guardado                                                                                                                         | ✔ Pasa      |
| CP-121 | criterios-modalidad-10: PUT reemplaza la lista (con id generado) y GET la devuelve en el mismo orden; los valores inválidos dan 400                                                    | ✔ Pasa      |
| CP-121 | criterios-modalidad-40: PUT reemplaza la lista (con id generado) y GET la devuelve en el mismo orden; los valores inválidos dan 400                                                    | ✔ Pasa      |
| CP-121 | conveniencia-retroactivo: PUT reemplaza la lista (con id generado) y GET la devuelve en el mismo orden; los valores inválidos dan 400                                                  | ✔ Pasa      |
| CP-122 | sin el dueño de la lista: GET responde [] y PUT 409 con el mensaje que dice qué falta                                                                                                  | ✔ Pasa      |
| CP-123 | roles en todas las listas: asesor dueño 200; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404                                         | ✔ Pasa      |
| CP-124 | ninguna entrada responde 500 en las listas: cuerpos que no son objeto, JSON roto y valores extremos                                                                                    | ✔ Pasa      |
| CP-125 | recuperación de semanas: GET vacío sin análisis; PUT lo crea (aplica obligatorio) y GET lo devuelve; la docs de semanas_imss_reconocidas sigue vigente                                 | ✔ Pasa      |
| CP-126 | retroactivo: PUT {} crea el análisis vacío, PUT parcial lo reemplaza, GET lo devuelve (números como número); sin diagnóstico 409; valores inválidos 400                                | ✔ Pasa      |
| CP-127 | escenarios: POST (orden 1 a 3), GET ordenado por orden, PATCH parcial; orden repetido 409; orden fuera de 1 a 3 y valores inválidos 400; otro cliente 404                              | ✔ Pasa      |
| CP-128 | periodos de inconsistencias: POST, GET en orden de captura, PATCH parcial, DELETE 204; otro cliente 404; inválidos 400                                                                 | ✔ Pasa      |
| CP-129 | plan de acción: POST (estatus por omisión pendiente), GET en orden de captura, PATCH parcial, DELETE 204; sin diagnóstico 409; otro cliente 404; inválidos 400                         | ✔ Pasa      |
| CP-130 | situación patrimonial: GET vacío sin registro; PUT todo opcional (reemplaza, números como número); sin diagnóstico 409; inválidos 400                                                  | ✔ Pasa      |
| CP-131 | hijos: una fila por hijo; GET [], POST agrega, PUT reemplaza la lista; sin situación patrimonial 409; inválidos 400                                                                    | ✔ Pasa      |
| CP-132 | roles en las rutas de este grupo: asesor dueño bien; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404                                 | ✔ Pasa      |
| CP-133 | ninguna entrada responde 500 en las rutas de este grupo: cuerpos que no son objeto, JSON roto, valores extremos y NUL                                                                  | ✔ Pasa      |
| CP-134 | avance: un diagnóstico vacío no mueve la etapa 1; con la primera sección completa pasa a En proceso asesor (25 %) y deja su fila en la bitácora; cada sección completa suma hasta 90 % | ✔ Pasa      |
| CP-135 | avance: si una sección deja de estar completa, el avance baja; borrar es tan válido como guardar                                                                                       | ✔ Pasa      |
| CP-136 | avance: no toca una etapa Finalizada ni un cliente sin etapas, y un guardado sin etapa 1 no falla                                                                                      | ✔ Pasa      |
| CP-137 | PDF incompleto: sin diagnóstico 409; con diagnóstico vacío 409 con la lista de campos faltantes (sección, campo y etiqueta) y sin generar el archivo                                   | ✔ Pasa      |
| CP-138 | PDF completo: 200 application/pdf (%PDF-) con el nombre de archivo; trae las 14 secciones, el aviso de alcance, las líneas de firma y los datos capturados                             | ✔ Pasa      |
| CP-139 | PDF: la fórmula de recuperación y los años para recuperar la inversión se imprimen (meses ÷ 12)                                                                                        | ✔ Pasa      |
| CP-140 | PDF roles: asesor dueño 200/409; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404; nunca 500                                          | ✔ Pasa      |
| CP-141 | escenarios: DELETE responde 204 y lo quita; otro cliente, inexistente 404, id inválido 400; roles; borrar libera el orden                                                              | ✔ Pasa      |
| CP-142 | avance: quitar el último escenario hace que la sección deje de estar completa y el avance baja                                                                                         | ✔ Pasa      |
| CP-143 | GET, POST y PATCH de /clientes/:id/auxiliares responden con el asesor dueño, también en ráfaga y en secuencia                                                                          | ✔ Pasa      |
| CP-144 | GET /auxiliares: asesor y supervisor reciben solo usuarios con rol auxiliar, ordenados por nombre y sin datos sensibles                                                                | ✔ Pasa      |
| CP-145 | GET /auxiliares: el auxiliar recibe 403 y sin token 401                                                                                                                                | ✔ Pasa      |
| CP-146 | un aviso de trámite y uno de cita traen cliente, asesor, título, descripción, compromiso, hora y datos de la etapa                                                                     | ✔ Pasa      |
| CP-147 | la etapa sin accion_a_realizar da descripcion null; los campos antiguos no cambian y no se expone nada más del asesor                                                                  | ✔ Pasa      |
| CP-148 | el filtro atendido sigue funcionando y un aviso atendido conserva atendido_por y fecha_atencion enriquecido                                                                            | ✔ Pasa      |
| CP-149 | el auxiliar recibe solo los de sus clientes autorizados y ve asesor_nombre; el supervisor recibe todos                                                                                 | ✔ Pasa      |
| CP-150 | GET /avisos/:id devuelve el aviso enriquecido; ajeno o inexistente 404; id inválido 400; sin token 401                                                                                 | ✔ Pasa      |
| CP-151 | PATCH atender: aviso ajeno o inexistente 404 y sin token 401                                                                                                                           | ✔ Pasa      |
| CP-152 | listar 10 avisos no hace más consultas que listar 2 (sin consultas por aviso)                                                                                                          | ✔ Pasa      |
| CP-153 | cliente activo vs pensionado, resumen y fecha de hoy en Cancún                                                                                                                         | ✔ Pasa      |
| CP-154 | etapa actual: en proceso, bloqueada, detenida, por iniciar y todo finalizado; 16 filas que suman los activos                                                                           | ✔ Pasa      |
| CP-155 | avance detenido: etapa Detenido o 15 días sin actividad (14 días no cuenta); más días primero                                                                                          | ✔ Pasa      |
| CP-156 | acciones del mes: tres estados, excluye Cancelado, No aplica, otros meses y pensionados; orden y límite con total completo                                                             | ✔ Pasa      |
| CP-157 | documentos: conteos solo de clientes activos, pendientes por fecha de carga con total, y límite                                                                                        | ✔ Pasa      |
| CP-158 | alcance por rol: el auxiliar solo ve sus clientes autorizados activos; el supervisor ve todo con asesores y carga                                                                      | ✔ Pasa      |
| CP-159 | un asesor sin clientes recibe todo en cero: 16 etapas, listas vacías y totales 0                                                                                                       | ✔ Pasa      |
| CP-160 | ?limite inválido (0, 51, "x", 1.5) responde 400 en español; 1 y 50 son válidos; sin token 401                                                                                          | ✔ Pasa      |
| CP-161 | sin N+1: el número de consultas no crece con el número de clientes                                                                                                                     | ✔ Pasa      |
| CP-162 | periodo trimestral: el trimestre de calendario que contiene la fecha, con el borde de fin de año                                                                                       | ✔ Pasa      |
| CP-163 | periodo inválido sigue dando 400 en español, en JSON y en PDF                                                                                                                          | ✔ Pasa      |
| CP-164 | las secciones existentes usan el rango del trimestre (finalizados, clientes nuevos, rechazo)                                                                                           | ✔ Pasa      |
| CP-165 | trazabilidad: cambios de etapas 0 a 4 dentro del periodo, recientes primero, con estatus anterior null en el primero                                                                   | ✔ Pasa      |
| CP-166 | trazabilidad con alcance por rol: el asesor solo lo suyo, el supervisor todo, el auxiliar 403                                                                                          | ✔ Pasa      |
| CP-167 | la lista de trazabilidad se limita a 20 pero el total es completo, y el orden es del más reciente al más antiguo                                                                       | ✔ Pasa      |
| CP-168 | sin N+1: el número de consultas del reporte no crece con el número de cambios                                                                                                          | ✔ Pasa      |
| CP-169 | PDF trimestral: título, nombre de archivo y la tabla de trazabilidad después de Clientes nuevos                                                                                        | ✔ Pasa      |
| CP-170 | avance_por_cliente (asesor): solo clientes activos propios, ordenados por nombre, con las 16 etapas en orden                                                                           | ✔ Pasa      |
| CP-171 | un cliente sin etapas devuelve las 16 con avance 0 y estatus_id null                                                                                                                   | ✔ Pasa      |
| CP-172 | tope de 200 clientes con total_avance_por_cliente completo                                                                                                                             | ✔ Pasa      |
| CP-173 | avance_por_cliente es null para el auxiliar y el supervisor                                                                                                                            | ✔ Pasa      |
| CP-174 | GET /correcciones: solo el asesor (auxiliar y supervisor 403, sin token 401) y solo sus clientes que requieren una fase                                                                | ✔ Pasa      |
| CP-175 | reglas de requiere: F2 con correcciones que no son de tipo NSS, F3 con una de tipo NSS, F4 con análisis aplica si o requiere_mas_evidencia                                             | ✔ Pasa      |
| CP-176 | documentos_cargados: F3 cuenta el tipo de certificación; F4 cuenta constancia de aclaración y solicitud de reintegro; F2 es null                                                       | ✔ Pasa      |
| CP-177 | cada cliente trae las 3 fases en orden con sus campos de etapa; sin la etapa: estatus null y avance 0; orden por actualizado_el                                                        | ✔ Pasa      |
| CP-179 | GET detalle: con datos devuelve nss_principal_elegido, criterio_seleccion y etapa_institucional_actual                                                                                 | ✔ Pasa      |
| CP-180 | GET detalle: sin detalle, corrección inexistente o de otro cliente responde 404; roles y alcance                                                                                       | ✔ Pasa      |
| CP-181 | GET secundarios: lista con id, nss y observaciones; vacía sin detalle o sin secundarios                                                                                                | ✔ Pasa      |
| CP-182 | GET secundarios: corrección de otro cliente o inexistente 404; asesor ajeno 404, auxiliar y supervisor 403, sin token 401                                                              | ✔ Pasa      |
| CP-183 | el catálogo de tipos de documento incluye los 3 tipos de Correcciones, en orden y con ids consecutivos a los existentes                                                                | ✔ Pasa      |
| CP-184 | los 3 tipos de documento de Correcciones se pueden subir como los demás                                                                                                                | ✔ Pasa      |
| CP-185 | resumen: clientes_con_correcciones y documentos_por_subir (fases F3 o F4 requeridas sin documentos); sin tramites_*                                                                    | ✔ Pasa      |
| CP-186 | máximo 500 filas, las más recientes primero; el resumen cuenta todos los clientes que cumplen                                                                                          | ✔ Pasa      |
| CP-187 | sin N+1: el número de consultas de GET /correcciones no crece con los clientes                                                                                                         | ✔ Pasa      |
| CP-188 | borra la corrección: 204 sin cuerpo y la fila desaparece; las demás correcciones del cliente se conservan                                                                              | ✔ Pasa      |
| CP-189 | 404 en español si la corrección no existe o es de otro cliente; 400 con un id inválido; la ajena no se borra                                                                           | ✔ Pasa      |
| CP-190 | alcance por rol: asesor ajeno 404, auxiliar y supervisor 403, sin token 401; nada se borra                                                                                             | ✔ Pasa      |
| CP-191 | una corrección de tipo NSS se borra con su detalle y sus NSS secundarios; otras unificaciones no se tocan                                                                              | ✔ Pasa      |
| CP-192 | GET /correcciones refleja el borrado: F2 deja de requerirse sin correcciones que no sean de tipo NSS; lo demás no cambia                                                               | ✔ Pasa      |
| CP-193 | una cita reagendada genera aviso con alerta a 2 días; las cumplidas y canceladas no                                                                                                    | ✔ Pasa      |
| CP-194 | mover una cita a un día cuya alerta ya existía y estaba atendida la deja pendiente; los avisos de otras fechas no se tocan                                                             | ✔ Pasa      |
| CP-195 | cambiar solo la hora de la cita reabre su aviso atendido; un PATCH sin cambio de fecha ni hora, o con otro campo, no lo reabre                                                         | ✔ Pasa      |
| CP-196 | mover fecha_compromiso de una etapa a un día cuya alerta ya existía y estaba atendida la deja pendiente; otras fechas intactas                                                         | ✔ Pasa      |
| CP-197 | un cambio rechazado (400) no reabre el aviso atendido; un evento inexistente da 404                                                                                                    | ✔ Pasa      |
| CP-198 | lee_54_renglones_del_fixture: el primero es la fila 6; fechas como Date y números como number                                                                                          | ✔ Pasa      |
| CP-199 | reconoce_encabezados_con_espacio_final: '1. ACTA ' se lee como '1. ACTA'                                                                                                               | ✔ Pasa      |
| CP-199 | solo se recortan los encabezados: los valores de las celdas se devuelven sin limpiar                                                                                                   | ✔ Pasa      |
| CP-200 | ignora_renglones_vacios_con_estilo: 3 datos y 5 filas vacías dan 3 renglones                                                                                                           | ✔ Pasa      |
| CP-201 | valores_cacheados_y_texto_enriquecido: fórmulas devuelven su resultado guardado; richText e hipervínculos, su texto simple                                                             | ✔ Pasa      |
| CP-202 | hoja_sin_datos: solo encabezados lanza ArchivoInvalidoError con "sin renglones de datos"                                                                                               | ✔ Pasa      |
| CP-203 | falta_hoja_clientes: lanza con "hoja Clientes"                                                                                                                                         | ✔ Pasa      |
| CP-204 | falta_columna_obligatoria: sin la columna CURP lanza con el nombre de la columna                                                                                                       | ✔ Pasa      |
| CP-205 | nombre_mayusculas: pasa a nombre propio y lo anota                                                                                                                                     | ✔ Pasa      |
| CP-206 | nombre_minusculas_y_espacios: quita espacios de más y pasa a nombre propio                                                                                                             | ✔ Pasa      |
| CP-207 | nombre_mixto_solo_espacios: no cambia las mayúsculas de un nombre mixto                                                                                                                | ✔ Pasa      |
| CP-207 | las partículas quedan en minúsculas al pasar a nombre propio, salvo al inicio                                                                                                          | ✔ Pasa      |
| CP-207 | no inventa acentos: "jose" se queda sin acento                                                                                                                                         | ✔ Pasa      |
| CP-208 | nombre_unicode_y_invisibles: sale en NFC y sin caracteres invisibles                                                                                                                   | ✔ Pasa      |
| CP-209 | un nombre de una sola palabra rechaza (faltan los apellidos)                                                                                                                           | ✔ Pasa      |
| CP-209 | un nombre vacío rechaza                                                                                                                                                                | ✔ Pasa      |
| CP-209 | nombre_vacio_rechaza: null, texto en blanco o solo invisibles dan rechazo                                                                                                              | ✔ Pasa      |
| CP-210 | correo_mayusculas: quita espacios y pasa a minúsculas                                                                                                                                  | ✔ Pasa      |
| CP-211 | correo_invalido_advierte: sin arroba da null y una advertencia                                                                                                                         | ✔ Pasa      |
| CP-211 | un correo vacío da null sin advertencia                                                                                                                                                | ✔ Pasa      |
| CP-212 | teléfono y correo inválidos se cargan vacíos con advertencia; válidos con formato raro se ajustan                                                                                      | ✔ Pasa      |
| CP-212 | telefono_formatos: deja 10 dígitos en todos los formatos                                                                                                                               | ✔ Pasa      |
| CP-212 | un número de 10 dígitos que ya viene limpio no lleva ajustes                                                                                                                           | ✔ Pasa      |
| CP-213 | telefono_invalido_advierte: "12345" da null y advertencia                                                                                                                              | ✔ Pasa      |
| CP-213 | un teléfono vacío da null sin advertencia                                                                                                                                              | ✔ Pasa      |
| CP-214 | ningún mensaje contiene la CURP ni el NSS completos                                                                                                                                    | ✔ Pasa      |
| CP-214 | sin_pii_en_mensajes: ningún mensaje contiene el valor original completo                                                                                                                | ✔ Pasa      |
| CP-215 | acepta_fecha_de_excel: un Date a medianoche UTC pasa sin ajustes                                                                                                                       | ✔ Pasa      |
| CP-215 | un Date con hora se normaliza a UTC a medianoche y lo anota                                                                                                                            | ✔ Pasa      |
| CP-215 | un Date inválido (NaN) no es fecha: nacimiento rechaza, compromiso advierte                                                                                                            | ✔ Pasa      |
| CP-215 | un número es una serie de Excel: 45995 es 2025-12-04                                                                                                                                   | ✔ Pasa      |
| CP-215 | una serie con parte decimal descarta la hora                                                                                                                                           | ✔ Pasa      |
| CP-215 | un número fuera de toda serie razonable no se acepta como fecha                                                                                                                        | ✔ Pasa      |
| CP-215 | a CP-221 dan el mismo resultado con TZ de Mérida, Samoa, Kiritimati y UTC                                                                                                              | ✔ Pasa      |
| CP-216 | texto_dd_mm_aaaa: "20/03/2025" da 2025-03-20 con ajuste                                                                                                                                | ✔ Pasa      |
| CP-216 | es siempre dd/mm: "03/20/2025" (mm/dd) no se acepta y "05/06/2025" es 5 de junio                                                                                                       | ✔ Pasa      |
| CP-216 | día y mes de un dígito y espacios alrededor valen                                                                                                                                      | ✔ Pasa      |
| CP-216 | un año de dos dígitos se rechaza, no se adivina el siglo                                                                                                                               | ✔ Pasa      |
| CP-217 | texto_aaaa_mm_dd: "2025-08-16"                                                                                                                                                         | ✔ Pasa      |
| CP-218 | texto_dd_mmm_aaaa: "19-nov-2025" da 2025-11-19                                                                                                                                         | ✔ Pasa      |
| CP-218 | todos los meses abreviados en español, con sept y sin importar mayúsculas                                                                                                              | ✔ Pasa      |
| CP-218 | un mes en inglés o inventado no se acepta                                                                                                                                              | ✔ Pasa      |
| CP-219 | fecha_inexistente_nacimiento_rechaza: "31/02/1968" da rechazo                                                                                                                          | ✔ Pasa      |
| CP-219 | inexistentes en los demás formatos, y el 29 de febrero solo en bisiesto                                                                                                                | ✔ Pasa      |
| CP-219 | nacimiento e ingreso vacíos o ilegibles rechazan                                                                                                                                       | ✔ Pasa      |
| CP-220 | ingreso_futuro_rechaza: con hoy 2026-11-16, "2027-01-15" da rechazo                                                                                                                    | ✔ Pasa      |
| CP-220 | el ingreso de hoy pasa y el de mañana se rechaza                                                                                                                                       | ✔ Pasa      |
| CP-221 | edad_fuera_de_rango_rechaza: 18 años cumplidos hoy pasa; los cumple mañana, se rechaza                                                                                                 | ✔ Pasa      |
| CP-221 | 100 años cumplidos hoy pasa; 101 cumplidos hoy se rechaza; 101 mañana todavía pasa                                                                                                     | ✔ Pasa      |
| CP-221 | nacer en el futuro se rechaza y el 29 de febrero cumple el 1 de marzo en año no bisiesto                                                                                               | ✔ Pasa      |
| CP-221 | el rango de edad no se aplica a ingreso ni a compromiso                                                                                                                                | ✔ Pasa      |
| CP-222 | compromiso_invalido_advierte: "pronto" da null con advertencia, sin rechazo                                                                                                            | ✔ Pasa      |
| CP-222 | una fecha compromiso vacía da null sin advertencia; una válida pasa                                                                                                                    | ✔ Pasa      |
| CP-222 | una fecha compromiso inexistente advierte y no rechaza                                                                                                                                 | ✔ Pasa      |
| CP-222 | los mensajes no incluyen el valor original                                                                                                                                             | ✔ Pasa      |
| CP-223 | curp_minusculas: pasa a mayúsculas con ajuste                                                                                                                                          | ✔ Pasa      |
| CP-223 | una CURP ya limpia no lleva ajustes ni advertencias                                                                                                                                    | ✔ Pasa      |
| CP-224 | curp_con_espacios: "QAQD 760716 MOCPJXE8" da 18 caracteres sin espacios                                                                                                                | ✔ Pasa      |
| CP-224 | también quita guiones, espacios de no separación y caracteres invisibles                                                                                                               | ✔ Pasa      |
| CP-225 | curp_17_caracteres_rechaza                                                                                                                                                             | ✔ Pasa      |
| CP-226 | curp_mes_13_rechaza: CAQH751312MQRBZC31 rechaza                                                                                                                                        | ✔ Pasa      |
| CP-226 | rechaza también día inexistente, sexo inválido, estado inválido y números donde van letras                                                                                             | ✔ Pasa      |
| CP-226 | la segunda posición debe ser vocal: una CURP válida con vocal pasa                                                                                                                     | ✔ Pasa      |
| CP-226 | una consonante en la segunda posición rechaza por formato inválido                                                                                                                     | ✔ Pasa      |
| CP-226 | la segunda letra X pasa (es la que se usa cuando el apellido no tiene vocal)                                                                                                           | ✔ Pasa      |
| CP-226 | el 29 de febrero solo existe en año bisiesto (el siglo sale del carácter 17)                                                                                                           | ✔ Pasa      |
| CP-226 | sobre el fixture solo las 2 CURP defectuosas sembradas (IDs 44 y 45) se rechazan                                                                                                       | ✔ Pasa      |
| CP-227 | una CURP que no coincide con el nacimiento carga con advertencia; el RFC inválido se carga vacío                                                                                       | ✔ Pasa      |
| CP-227 | curp_no_coincide_con_nacimiento_advierte: carga con advertencia                                                                                                                        | ✔ Pasa      |
| CP-227 | sin fecha de nacimiento no se compara y no advierte                                                                                                                                    | ✔ Pasa      |
| CP-228 | nss_guiones_y_espacios: dan 11 dígitos                                                                                                                                                 | ✔ Pasa      |
| CP-228 | un NSS de 11 dígitos ya limpio no lleva ajustes                                                                                                                                        | ✔ Pasa      |
| CP-229 | nss_numerico: el número 99446026195 da "99446026195"                                                                                                                                   | ✔ Pasa      |
| CP-229 | un número no entero o negativo no es NSS                                                                                                                                               | ✔ Pasa      |
| CP-230 | nss_9_digitos_rechaza                                                                                                                                                                  | ✔ Pasa      |
| CP-230 | un NSS con letras rechaza                                                                                                                                                              | ✔ Pasa      |
| CP-230 | sobre el fixture: solo el NSS de 9 dígitos (ID 47) se rechaza y los vacíos son de ISSSTE                                                                                               | ✔ Pasa      |
| CP-231 | NSS: vacío con ISSSTE no advierte, vacío con IMSS advierte, de 9 dígitos rechaza                                                                                                       | ✔ Pasa      |
| CP-231 | nss_vacio_issste_ok_otro_advierte: vacío con ISSSTE no advierte; con IMSS advierte                                                                                                     | ✔ Pasa      |
| CP-231 | vacío con texto en blanco o régimen desconocido o sin régimen también advierte                                                                                                         | ✔ Pasa      |
| CP-231 | ningún mensaje contiene el NSS                                                                                                                                                         | ✔ Pasa      |
| CP-232 | rfc_mayusculas: ajusta y acepta 12 o 13 caracteres                                                                                                                                     | ✔ Pasa      |
| CP-232 | un RFC ya limpio no lleva ajustes y acepta Ñ y &                                                                                                                                       | ✔ Pasa      |
| CP-232 | sobre el fixture los RFC dan RFC válido sin advertencias                                                                                                                               | ✔ Pasa      |
| CP-233 | rfc_invalido_advierte: da null con advertencia y sin rechazo                                                                                                                           | ✔ Pasa      |
| CP-233 | un RFC vacío da null sin advertencia                                                                                                                                                   | ✔ Pasa      |
| CP-233 | ningún mensaje contiene el RFC                                                                                                                                                         | ✔ Pasa      |
| CP-234 | dato_vacio_curp_rechaza: CURP vacía rechaza                                                                                                                                            | ✔ Pasa      |
| CP-234 | una celda con número o booleano en la CURP rechaza                                                                                                                                     | ✔ Pasa      |
| CP-234 | ningún mensaje contiene la CURP completa, ni como venía ni normalizada                                                                                                                 | ✔ Pasa      |
| CP-235 | compara_sin_acentos_ni_mayusculas: "imss" da "IMSS" y "xxi banorte" da "XXI Banorte"                                                                                                   | ✔ Pasa      |
| CP-235 | sin acentos y con espacios de más: "decimo transitorio issste " da el nombre del catálogo                                                                                              | ✔ Pasa      |
| CP-235 | un valor ya exacto no lleva ajustes                                                                                                                                                    | ✔ Pasa      |
| CP-235 | el estado civil de la hoja Catálogo ("Soltero (a)") da el valor del enum de la base                                                                                                    | ✔ Pasa      |
| CP-235 | sobre el fixture: solo "Ley 71" (ID 40) advierte y ninguna AFORE ni estado civil rechaza                                                                                               | ✔ Pasa      |
| CP-236 | alias_banamex: "Banamex" da "Citibanamex" y "Pension ISSSTE" da "PENSIONISSSTE"                                                                                                        | ✔ Pasa      |
| CP-236 | el alias de la hoja Catálogo "Mixto / revisar" da "Mixto/revisar" del sistema                                                                                                          | ✔ Pasa      |
| CP-237 | régimen y ley desconocidos pasan a "No determinado" con advertencia                                                                                                                    | ✔ Pasa      |
| CP-237 | regimen_y_ley_desconocidos: dan "No determinado" con advertencia ("Ley 71")                                                                                                            | ✔ Pasa      |
| CP-237 | régimen o ley vacíos también dan "No determinado" con advertencia                                                                                                                      | ✔ Pasa      |
| CP-237 | "No determinado" escrito en el Excel pasa sin advertencia                                                                                                                              | ✔ Pasa      |
| CP-238 | afore_y_estado_civil_vacios_o_desconocidos: dan rechazo, sin valor neutro                                                                                                              | ✔ Pasa      |
| CP-238 | "No determinado" no es una AFORE ni un estado civil: rechaza                                                                                                                           | ✔ Pasa      |
| CP-239 | estatus_desconocido_rechaza: "En trámite" da rechazo                                                                                                                                   | ✔ Pasa      |
| CP-239 | un estatus vacío o que no es texto también rechaza                                                                                                                                     | ✔ Pasa      |
| CP-239 | reconoce los 9 estatus sin importar mayúsculas, acentos ni espacios                                                                                                                    | ✔ Pasa      |
| CP-239 | sobre el fixture: solo el estatus "En trámite" (ID 50) rechaza                                                                                                                         | ✔ Pasa      |
| CP-240 | por_iniciar_avance_0_o_10_da_10: con 0 da 10 con ajuste; con 0.1 da 10 sin ajuste                                                                                                      | ✔ Pasa      |
| CP-240 | por iniciar con otro avance (0.5) también queda en 10, con advertencia                                                                                                                 | ✔ Pasa      |
| CP-241 | en_proceso_rango: 0.2 da 20 y 0.9 da 90, sin advertencia                                                                                                                               | ✔ Pasa      |
| CP-241 | fuera de rango: 0.1 da 20 con advertencia y 1 da 90 con advertencia                                                                                                                    | ✔ Pasa      |
| CP-241 | la fracción se convierte sin error de coma flotante (0.29 es 29, no 28.999)                                                                                                            | ✔ Pasa      |
| CP-241 | un avance ya en porcentaje (55) o texto ("50%", "0,5") se acepta                                                                                                                       | ✔ Pasa      |
| CP-241 | la coma decimal es decimal: "0,5" da 50 y "1,5" no se interpreta como fracción (150 %)                                                                                                 | ✔ Pasa      |
| CP-242 | en_proceso_55_se_conserva: 0.55 da 55 con advertencia                                                                                                                                  | ✔ Pasa      |
| CP-243 | finalizado_siempre_100: 0.6 da 100 con advertencia; 1 da 100 sin advertencia                                                                                                           | ✔ Pasa      |
| CP-244 | no_aplica_sin_avance: el avance es null, venga lo que venga                                                                                                                            | ✔ Pasa      |
| CP-245 | bloqueado_pone_motivo: guarda el motivo fijo, avisa y conserva el avance                                                                                                               | ✔ Pasa      |
| CP-246 | detenido_y_cancelado_conservan_avance: sin motivo y sin advertencia                                                                                                                    | ✔ Pasa      |
| CP-246 | un avance ausente o ilegible: en proceso da 20 y congelados dan 0, ambos con advertencia                                                                                               | ✔ Pasa      |
| CP-247 | resuelve_con_lic_y_acentos: "Lic. Marco Hernández" resuelve a su usuario                                                                                                               | ✔ Pasa      |
| CP-247 | consulta cada usuario una sola vez aunque el asesor aparezca en muchos renglones                                                                                                       | ✔ Pasa      |
| CP-247 | sobre el fixture: solo el asesor "Lic. Pedro Gómez" (ID 49) se rechaza                                                                                                                 | ✔ Pasa      |
| CP-248 | resuelve_sin_lic_ni_acento: "Marco Hernandez" y "LIC. ANA HERNANDEZ" resuelven                                                                                                         | ✔ Pasa      |
| CP-248 | también sin el punto, con "Licda." y con espacios de más                                                                                                                               | ✔ Pasa      |
| CP-248 | las claves del JSON también se normalizan (sin Lic., con otras mayúsculas)                                                                                                             | ✔ Pasa      |
| CP-248 | el correo de la equivalencia se busca en minúsculas y sin espacios                                                                                                                     | ✔ Pasa      |
| CP-249 | sin_equivalencia_rechaza: "Lic. Pedro Gómez" da rechazo "asesor sin equivalencia"                                                                                                      | ✔ Pasa      |
| CP-249 | una equivalencia que apunta a un correo sin usuario también rechaza                                                                                                                    | ✔ Pasa      |
| CP-249 | dos nombres que se normalizan igual con correos distintos son un error de configuración                                                                                                | ✔ Pasa      |
| CP-250 | usuario_inactivo_rechaza                                                                                                                                                               | ✔ Pasa      |
| CP-251 | usuario_sin_rol_asesor_rechaza: supervisor y auxiliar rechazan                                                                                                                         | ✔ Pasa      |
| CP-252 | nombre_vacio_rechaza: null, vacío, en blanco o que no es texto                                                                                                                         | ✔ Pasa      |
| CP-253 | renglon_limpio: sin rechazos; solo trae las marcas estructurales de siempre                                                                                                            | ✔ Pasa      |
| CP-253 | los datos del cliente quedan saneados y completos                                                                                                                                      | ✔ Pasa      |
| CP-253 | referidor vacío da texto vacío con advertencia; observaciones vacías, texto vacío sin advertencia                                                                                      | ✔ Pasa      |
| CP-253 | ISSSTE y contadora: Sí, No y Por confirmar; vacío o desconocido da por_confirmar con advertencia                                                                                       | ✔ Pasa      |
| CP-253 | dependientes económicos: entero de 0 en adelante; vacío, texto, negativo o con decimales rechazan                                                                                      | ✔ Pasa      |
| CP-253 | el estado civil de la hoja Catálogo ("Casado (a)") no cuenta como ajuste                                                                                                               | ✔ Pasa      |
| CP-254 | acumula_todos_los_rechazos: CURP, asesor y fecha de nacimiento inválidos traen los tres motivos                                                                                        | ✔ Pasa      |
| CP-254 | cada rechazo dice de qué columna viene                                                                                                                                                 | ✔ Pasa      |
| CP-254 | el idExcel es null si la celda ID no es un número                                                                                                                                      | ✔ Pasa      |
| CP-255 | no_carga_edad_ni_dias: datos tiene exactamente los campos de DatosCliente                                                                                                              | ✔ Pasa      |
| CP-256 | avance_y_estatus_por_etapa: las 16 etapas quedan con estatus, avance, acción y fecha                                                                                                   | ✔ Pasa      |
| CP-256 | una etapa Bloqueado guarda el motivo fijo y avisa; Detenido conserva el avance                                                                                                         | ✔ Pasa      |
| CP-256 | un estatus desconocido rechaza el renglón y dice de qué etapa                                                                                                                          | ✔ Pasa      |
| CP-256 | una fecha compromiso inválida de una etapa se carga vacía con advertencia, sin rechazo                                                                                                 | ✔ Pasa      |
| CP-256 | un avance fuera de rango en una etapa avisa con el número de etapa                                                                                                                     | ✔ Pasa      |
| CP-257 | duplicado_curp_en_archivo: el segundo se rechaza con la fila del primero                                                                                                               | ✔ Pasa      |
| CP-257 | no modifica los renglones recibidos                                                                                                                                                    | ✔ Pasa      |
| CP-257 | los renglones ya rechazados pasan tal cual y no se les agregan motivos de duplicado                                                                                                    | ✔ Pasa      |
| CP-258 | duplicado_nss_en_archivo: el segundo se rechaza con la fila del primero                                                                                                                | ✔ Pasa      |
| CP-259 | ya_existe_en_base: CURP o NSS existentes se rechazan con "ya existe"                                                                                                                   | ✔ Pasa      |
| CP-260 | posible_duplicado_advierte: mismo nombre y nacimiento con otro CURP se carga con advertencia                                                                                           | ✔ Pasa      |
| CP-260 | el mismo nombre con otra fecha de nacimiento no es posible duplicado                                                                                                                   | ✔ Pasa      |
| CP-261 | gana_el_primero: con tres renglones iguales, el segundo y el tercero apuntan al primero                                                                                                | ✔ Pasa      |
| CP-261 | se respeta el orden del arreglo, no el número de fila                                                                                                                                  | ✔ Pasa      |
| CP-262 | rechazado_no_cuenta_para_duplicados: un renglón rechazado no bloquea a uno posterior                                                                                                   | ✔ Pasa      |
| CP-262 | un renglón rechazado por duplicado tampoco registra su otro dato                                                                                                                       | ✔ Pasa      |
| CP-263 | sin_nss_no_se_compara: dos NSS vacíos no son duplicados                                                                                                                                | ✔ Pasa      |
| CP-264 | fixture_completo: los rechazos son exactamente los IDs 44, 45, 46, 47, 48, 49, 50, 52, 53 y 54                                                                                         | ✔ Pasa      |
| CP-265 | carga_clientes_con_16_etapas: cada cliente queda con sus 16 etapas                                                                                                                     | ✔ Pasa      |
| CP-265 | sin tercer argumento el comportamiento es el de siempre: asesor_id es el del token, transacción propia y 16 etapas                                                                     | ✔ Pasa      |
| CP-265 | con asesorId, ese usuario es el asesor y no el del token                                                                                                                               | ✔ Pasa      |
| CP-265 | el controlador no pasa el argumento interno: crear de HTTP recibe solo usuario y cuerpo                                                                                                | ✔ Pasa      |
| CP-266 | lotes_de_10: 25 válidos dan 3 lotes y se cargan todos                                                                                                                                  | ✔ Pasa      |
| CP-266 | un tamaño de lote que no es un entero positivo es un error de uso                                                                                                                      | ✔ Pasa      |
| CP-267 | cada_lote_es_transaccion: un fallo en el último lote lo reintenta y conserva los lotes anteriores                                                                                      | ✔ Pasa      |
| CP-267 | un fallo después de crear el cliente (etapa con estatus inexistente) no deja un cliente a medias                                                                                       | ✔ Pasa      |
| CP-267 | con manager, trabaja dentro de esa transacción: no abre otra y se revierte con ella                                                                                                    | ✔ Pasa      |
| CP-268 | lote_degradado_aisla_el_fallido: el renglón que viola la base se rechaza y los demás del lote se cargan                                                                                | ✔ Pasa      |
| CP-268 | los cargados salen en el orden de entrada                                                                                                                                              | ✔ Pasa      |
| CP-269 | simulacro_no_guarda: mismos totales que una carga real y la base queda igual                                                                                                           | ✔ Pasa      |
| CP-270 | etapas_con_el_estado_del_excel: estatus, avance, acción y fecha de cada etapa, incluido el congelado                                                                                   | ✔ Pasa      |
| CP-271 | concurrencia_unicidad: dos cargas simultáneas del mismo CURP dejan uno cargado y el otro como "ya existe"                                                                              | ✔ Pasa      |
| CP-271 | la unicidad también se respeta dentro de un lote y contra un cliente ya existente                                                                                                      | ✔ Pasa      |
| CP-271 | con manager, una CURP repetida sigue traduciéndose a 409 (Ya existe)                                                                                                                   | ✔ Pasa      |
| CP-272 | fechas_y_campos_opcionales_nulos: lo que no hay queda NULL y las fechas no se corren de día                                                                                            | ✔ Pasa      |
| CP-273 | responsable_del_registro: el cliente queda con el asesor del Excel y el ejecutor consta en los logs                                                                                    | ✔ Pasa      |
| CP-274 | sin_pii_en_logs: los logs no contienen CURP ni NSS completos, ni de cargados ni de rechazados                                                                                          | ✔ Pasa      |
| CP-275 | totales_con_fixture: leídos 54, cargados 44 y rechazados 10                                                                                                                            | ✔ Pasa      |
| CP-275 | sin tamanoLote el lote es de 25 (44 válidos dan 2 lotes)                                                                                                                               | ✔ Pasa      |
| CP-275 | cada renglón dice su fila, ID, clase y motivos; los rechazos traen al menos un motivo                                                                                                  | ✔ Pasa      |
| CP-276 | conciliacion_ok: leídos = cargados + rechazados y el conteo en base coincide con los CURP cargados                                                                                     | ✔ Pasa      |
| CP-277 | conciliacion_falla_se_marca: si la base no coincide, el reporte lo indica                                                                                                              | ✔ Pasa      |
| CP-278 | enmascara_curp_y_nss: solo se ven los últimos 4 caracteres y la longitud se conserva                                                                                                   | ✔ Pasa      |
| CP-278 | el reporte nunca trae una CURP ni un NSS completos; sí los últimos 4                                                                                                                   | ✔ Pasa      |
| CP-279 | reporte_y_csv_en_disco: se escriben reporte.json y rechazados.csv con una fila por rechazo                                                                                             | ✔ Pasa      |
| CP-279 | el CSV cita los campos con comas, comillas o saltos de línea                                                                                                                           | ✔ Pasa      |
| CP-280 | huella_sha256_del_archivo: la cabecera trae el SHA-256 del archivo y datos de la corrida                                                                                               | ✔ Pasa      |
| CP-281 | columnas_no_migradas: lista los 6 documentos (CJ a CO) y las 4 columnas que no se cargan                                                                                               | ✔ Pasa      |
| CP-282 | segunda_corrida_idempotente: 0 cargados y todo lo ya cargado se rechaza como "ya existe"                                                                                               | ✔ Pasa      |
| CP-283 | supervisor_importa_200: responde 200 con el reporte y carga los 44 clientes                                                                                                            | ✔ Pasa      |
| CP-284 | simulacro_true_no_guarda: mismos totales y la base queda igual                                                                                                                         | ✔ Pasa      |
| CP-284 | un valor de simulacro que no es exactamente true ni false responde 400 y no carga nada                                                                                                 | ✔ Pasa      |
| CP-285 | asesor_403_auxiliar_403: solo el Supervisor puede importar                                                                                                                             | ✔ Pasa      |
| CP-286 | sin_token_401: sin token, con token vencido o con firma inválida responde 401                                                                                                          | ✔ Pasa      |
| CP-287 | sin_archivo_400: sin el campo archivo responde 400 con un mensaje claro                                                                                                                | ✔ Pasa      |
| CP-288 | no_es_xlsx_400: un .xls renombrado, un archivo dañado o uno vacío dan 400, nunca 500                                                                                                   | ✔ Pasa      |
| CP-289 | mas_de_10_mb_400: un archivo de más de 10 MB responde 400 con el mismo contrato que los documentos                                                                                     | ✔ Pasa      |
| CP-290 | hoja_o_columnas_faltantes_400_con_detalle: el mensaje dice qué falta                                                                                                                   | ✔ Pasa      |
| CP-291 | matriz_de_acceso_incluye_la_ruta: la ruta ya no responde 501 y la documentación lo dice                                                                                                | ✔ Pasa      |
| CP-292 | importa_con_ejecutor_supervisor: código 0, 44 clientes cargados y reporte en la carpeta de salida                                                                                      | ✔ Pasa      |
| CP-292 | el correo del ejecutor se busca sin distinguir mayúsculas                                                                                                                              | ✔ Pasa      |
| CP-293 | ejecutor_inexistente_o_no_supervisor: código 1 y nada se carga ni se escribe                                                                                                           | ✔ Pasa      |
| CP-294 | simulacro: no guarda en la base pero sí escribe el reporte con los mismos totales                                                                                                      | ✔ Pasa      |
| CP-295 | faltan_argumentos: código 1 con mensaje de uso, diciendo qué falta                                                                                                                     | ✔ Pasa      |
| CP-295 | opciones inválidas: lote que no es entero positivo, opción desconocida o archivo ilegible dan código 1                                                                                 | ✔ Pasa      |
| CP-295 | sin --equivalencias ni ETL_EQUIVALENCIAS: código 1 diciendo qué configurar                                                                                                             | ✔ Pasa      |
| CP-296 | salida_sin_pii: nada de lo que imprime el comando contiene una CURP ni un NSS completos                                                                                                | ✔ Pasa      |
| CP-297 | corrida_completa: 54 leídos, 44 cargados y 10 rechazados, con la base cuadrada                                                                                                         | ✔ Pasa      |
| CP-298 | defectos_saneables_se_cargan_con_ajustes: los IDs 3, 7, 10, 13, 16, 19, 22, 25, 28 y 31                                                                                                | ✔ Pasa      |
| CP-299 | advertencias_esperadas: IDs 33, 34, 38, 40, 42 y el cliente con etapa Bloqueado; los 44 cargados llevan las dos marcas                                                                 | ✔ Pasa      |
| CP-300 | rechazos_con_motivo: cada ID rechazado trae un motivo legible y sin datos personales                                                                                                   | ✔ Pasa      |
| CP-301 | segunda_corrida: 0 cargados y todo lo ya cargado se rechaza como "ya existe" (46)                                                                                                      | ✔ Pasa      |
| CP-302 | simulacro_sin_cambios: mismos totales que la carga real y la base intacta                                                                                                              | ✔ Pasa      |
| CP-303 | catalogo_de_defectos_cuadra: cada fila de defectos-sembrados.csv se refleja en el reporte según su clase                                                                               | ✔ Pasa      |
| CP-303 | leerCsv respeta comillas, comas, saltos de línea y BOM                                                                                                                                 | ✔ Pasa      |
| CP-303 | el catálogo del fixture trae 36 defectos (25 renglones) con sus clases                                                                                                                 | ✔ Pasa      |
| CP-303 | cada clase se compara con su criterio                                                                                                                                                  | ✔ Pasa      |
| CP-303 | el markdown enmascara CURP y NSS y marca lo que no coincide                                                                                                                            | ✔ Pasa      |
| CP-304 | clientes_cargados_se_ven_con_la_api_existente: la lista, las 16 etapas y el alcance por asesor siguen funcionando                                                                      | ✔ Pasa      |
| CP-305 | evidencia_en_docs: docs/etl-corrida-ficticia trae las tres corridas y la comparación de defectos                                                                                       | ✔ Pasa      |
| CP-305 | el nombre se divide en nombre y apellidos, el sexo sale de la CURP y se anotan los ajustes                                                                                             | ✔ Pasa      |
| CP-305 | divide_3_palabras: 1 nombre y 2 apellidos                                                                                                                                              | ✔ Pasa      |
| CP-306 | genera_evidencia: escribe docs/etl-corrida-ficticia con las tres corridas                                                                                                              | ○ Pendiente |
| CP-306 | divide_4_palabras: 2 nombres y 2 apellidos                                                                                                                                             | ✔ Pasa      |
| CP-307 | divide_con_particulas: las partículas se pegan al apellido                                                                                                                             | ✔ Pasa      |
| CP-308 | un nombre de dos palabras queda con apellido materno vacío                                                                                                                             | ✔ Pasa      |
| CP-308 | divide_2_palabras: nombre y paterno, materno vacío                                                                                                                                     | ✔ Pasa      |
| CP-308 | una sola palabra deja los apellidos vacíos y 5 palabras dan 3 nombres                                                                                                                  | ✔ Pasa      |
| CP-309 | sexo_desde_curp: el carácter 11 "H" da "H" y "M" da "M"                                                                                                                                | ✔ Pasa      |
| CP-310 | semanas: reconocidas vacías dan 0 con advertencia, negativas rechazan y "N/D" en recuperar da 0 con advertencia                                                                        | ✔ Pasa      |
| CP-310 | semanas_entero_ok: 1094 da 1094 sin ajustes ni advertencias                                                                                                                            | ✔ Pasa      |
| CP-310 | un entero escrito como texto ("1094", " 1094 ") se acepta con ajuste                                                                                                                   | ✔ Pasa      |
| CP-310 | una celda vacía da null, sin advertencia ni rechazo (el validador decide qué hacer)                                                                                                    | ✔ Pasa      |
| CP-310 | sobre el fixture: "Semanas IMSS reconocidas" rechaza solo el ID 52 y "Semanas a recuperar" advierte solo el ID 34                                                                      | ✔ Pasa      |
| CP-311 | semanas_texto_da_0: "N/D" da 0 con advertencia                                                                                                                                         | ✔ Pasa      |
| CP-312 | semanas_negativas_rechaza: -35 da rechazo (también como texto)                                                                                                                         | ✔ Pasa      |
| CP-312 | un número con decimales no es un número de semanas: rechaza                                                                                                                            | ✔ Pasa      |
| CP-313 | campos_pendientes_de_captura: domicilio, estado y subdelegación pendientes, cambio de AFORE por confirmar                                                                              | ✔ Pasa      |
| CP-313 | los renglones rechazados no llevan datos ni las marcas estructurales                                                                                                                   | ✔ Pasa      |
| CP-314 | objetivo_asumido: pensionarse_asap con la advertencia                                                                                                                                  | ✔ Pasa      |
| CP-315 | etapas_sin_historial: no hay filas de historial y fecha_completada es NULL en las etapas Finalizado                                                                                    | ✔ Pasa      |
| CP-316 | sexo_y_apellidos_en_el_cliente: guarda el sexo de la CURP y el nombre dividido                                                                                                         | ✔ Pasa      |
| CP-316 | los catálogos viajan por nombre y se guardan con su id (régimen, ley y AFORE)                                                                                                          | ✔ Pasa      |
| CP-317 | reporte_cuenta_pendientes: pendientes de captura 44, objetivo asumido 44 y nombres divididos                                                                                           | ✔ Pasa      |
| CP-318 | un renglón que el cargador rechaza se reporta como rechazado y los totales siguen cuadrando                                                                                            | ✔ Pasa      |
| CP-319 | conteos_excluyen_rutinarios: conAjustes y conAdvertencias no cuentan lo rutinario o estructural                                                                                        | ✔ Pasa      |
| CP-319 | resumenPorCodigo sí incluye los códigos rutinarios y cuenta renglones cargados por código                                                                                              | ✔ Pasa      |
| CP-320 | simulacro_no_guarda: mismos totales que la carga real y la base queda igual                                                                                                            | ✔ Pasa      |
| CP-321 | archivo_invalido_no_carga: un archivo que no es Excel lanza ArchivoInvalidoError y no toca la base                                                                                     | ✔ Pasa      |
| CP-322 | reporte_en_disco: la corrida escribe reporte.json y rechazados.csv en la carpeta de salida                                                                                             | ✔ Pasa      |
| CP-323 | sin_equivalencias_configuradas_503: si falta la configuración responde un error claro y no carga nada                                                                                  | ✔ Pasa      |
| CP-324 | equivalencias_ilegibles_503: un JSON de equivalencias inválido responde 503 y no carga nada                                                                                            | ✔ Pasa      |
| CP-325 | respuesta_sin_pii: el cuerpo de la respuesta 200 no contiene ninguna CURP ni NSS completos                                                                                             | ✔ Pasa      |
| CP-326 | subcarpeta_de_salida_propia: la genera el servidor y nada del nombre del archivo entra en la ruta                                                                                      | ✔ Pasa      |
| CP-327 | mensajes_de_400_sin_valores: citan nombres de columnas, nunca valores de renglones ni del archivo                                                                                      | ✔ Pasa      |
| CP-328 | sin --salida usa ETL_SALIDA con una subcarpeta propia de la corrida                                                                                                                    | ✔ Pasa      |
| CP-329 | sin --equivalencias usa ETL_EQUIVALENCIAS, y sin --lote el lote es de 25                                                                                                               | ✔ Pasa      |
| CP-330 | el comando npm está declarado: script etl:importar y punto de entrada                                                                                                                  | ✔ Pasa      |
| CP-331 | un "--" inicial (pnpm etl:importar -- --archivo ...) se ignora                                                                                                                         | ✔ Pasa      |
