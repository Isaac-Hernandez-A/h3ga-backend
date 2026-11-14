# Resultados de pruebas

Generado el 2026-11-14 con `node scripts/reporte-pruebas.mjs` a partir de `jest --json` (apps/api). No se edita a mano.

## Resumen por suite

| Suite                                                 | Pruebas | Pasan   | Fallan | Tiempo (s) |
| ----------------------------------------------------- | ------- | ------- | ------ | ---------- |
| acceso-matriz.spec.ts                                 | 9       | 9       | 0      | 26.86      |
| agenda/agenda.e2e.spec.ts                             | 3       | 3       | 0      | 3.96       |
| auth/auth.e2e.spec.ts                                 | 7       | 7       | 0      | 4.31       |
| auth/auth.service.spec.ts                             | 9       | 9       | 0      | 1.90       |
| auth/contrasena.e2e.spec.ts                           | 7       | 7       | 0      | 4.78       |
| avisos/avisos-enriquecidos.e2e.spec.ts                | 7       | 7       | 0      | 4.64       |
| avisos/avisos-reapertura.e2e.spec.ts                  | 5       | 5       | 0      | 3.72       |
| avisos/avisos.service.spec.ts                         | 7       | 7       | 0      | 4.67       |
| catalogos.e2e.spec.ts                                 | 4       | 4       | 0      | 3.79       |
| clientes/auxiliares.e2e.spec.ts                       | 3       | 3       | 0      | 4.10       |
| clientes/cliente-auxiliar.autorizacion.spec.ts        | 4       | 4       | 0      | 1.27       |
| clientes/clientes-acceso.spec.ts                      | 14      | 14      | 0      | 2.62       |
| clientes/clientes-lecturas.e2e.spec.ts                | 5       | 5       | 0      | 4.62       |
| clientes/clientes.controller.roles.spec.ts            | 8       | 8       | 0      | 2.06       |
| clientes/clientes.e2e.spec.ts                         | 10      | 10      | 0      | 5.04       |
| clientes/clientes.service.spec.ts                     | 1       | 1       | 0      | 3.68       |
| clientes/issste.e2e.spec.ts                           | 12      | 12      | 0      | 4.30       |
| common/auth/cliente-access.guard.spec.ts              | 13      | 13      | 0      | 1.67       |
| common/auth/clientes-accesibles.spec.ts               | 4       | 4       | 0      | 0.08       |
| common/auth/dev-token.spec.ts                         | 11      | 11      | 0      | 2.45       |
| common/auth/jwt-auth.guard.spec.ts                    | 11      | 11      | 0      | 1.53       |
| common/auth/normalizar-rol.spec.ts                    | 10      | 10      | 0      | 0.09       |
| common/auth/permisos.spec.ts                          | 4       | 4       | 0      | 0.06       |
| common/auth/roles.guard.spec.ts                       | 9       | 9       | 0      | 1.08       |
| common/config/cors.spec.ts                            | 7       | 7       | 0      | 1.44       |
| common/config/validar-entorno.spec.ts                 | 9       | 9       | 0      | 0.10       |
| common/fechas.spec.ts                                 | 10      | 10      | 0      | 0.52       |
| common/filters/all-exceptions.filter.spec.ts          | 4       | 4       | 0      | 0.76       |
| common/seguridad/password-hasher.spec.ts              | 4       | 4       | 0      | 1.58       |
| common/testing/bd-pruebas.spec.ts                     | 5       | 5       | 0      | 1.80       |
| dashboard/dashboard.e2e.spec.ts                       | 13      | 13      | 0      | 5.52       |
| diagnosticos/f1-avance-pdf.e2e.spec.ts                | 8       | 8       | 0      | 13.08      |
| diagnosticos/f1-cabecera.e2e.spec.ts                  | 8       | 8       | 0      | 5.63       |
| diagnosticos/f1-listas.e2e.spec.ts                    | 22      | 22      | 0      | 9.69       |
| diagnosticos/f1-secciones.e2e.spec.ts                 | 10      | 10      | 0      | 7.02       |
| documentos/documentos.e2e.spec.ts                     | 10      | 10      | 0      | 5.45       |
| documentos/storage/local-storage.adapter.spec.ts      | 4       | 4       | 0      | 0.12       |
| documentos/storage/spaces-storage.adapter.spec.ts     | 5       | 5       | 0      | 0.13       |
| etapas/etapas-auxiliar.e2e.spec.ts                    | 3       | 3       | 0      | 3.39       |
| etapas/etapas.e2e.spec.ts                             | 6       | 6       | 0      | 4.21       |
| etapas/etapas.service.spec.ts                         | 5       | 5       | 0      | 3.15       |
| etapas/reglas-avance.spec.ts                          | 9       | 9       | 0      | 0.09       |
| health/health.controller.spec.ts                      | 1       | 1       | 0      | 2.12       |
| reporte-pruebas.spec.ts                               | 3       | 3       | 0      | 0.26       |
| reportes/pdf/f0-modelo.spec.ts                        | 12      | 12      | 0      | 0.11       |
| reportes/pdf/f0-pdf.e2e.spec.ts                       | 2       | 2       | 0      | 9.23       |
| reportes/pdf/f0-pdf.service.spec.ts                   | 6       | 6       | 0      | 26.90      |
| reportes/pdf/reporte-pdf.service.spec.ts              | 4       | 4       | 0      | 9.23       |
| reportes/reportes-pdf.e2e.spec.ts                     | 3       | 3       | 0      | 12.84      |
| reportes/reportes-trimestral-trazabilidad.e2e.spec.ts | 8       | 8       | 0      | 6.34       |
| reportes/reportes.e2e.spec.ts                         | 2       | 2       | 0      | 3.73       |
| reportes/reportes.service.spec.ts                     | 10      | 10      | 0      | 5.02       |
| scripts/seed-supervisor.spec.ts                       | 4       | 4       | 0      | 4.65       |
| swagger.e2e.spec.ts                                   | 3       | 3       | 0      | 3.86       |
| tramites/correcciones-modulo.e2e.spec.ts              | 16      | 16      | 0      | 20.45      |
| tramites/correcciones.e2e.spec.ts                     | 12      | 12      | 0      | 18.99      |
| tramites/reglas-correcciones.spec.ts                  | 9       | 9       | 0      | 0.46       |
| tramites/tramites.e2e.spec.ts                         | 11      | 11      | 0      | 4.32       |
| usuarios-roles/restablecer-contrasena.e2e.spec.ts     | 7       | 7       | 0      | 5.06       |
| usuarios-roles/usuarios-roles.e2e.spec.ts             | 11      | 11      | 0      | 4.92       |
| usuarios-roles/usuarios-roles.service.spec.ts         | 12      | 12      | 0      | 1.88       |
| **Total**                                             | **455** | **455** | **0**  | **297.32** |

Las pruebas pendientes (`it.todo`, `skip` o suites con base real sin `TEST_DATABASE_URL`) cuentan en "Pruebas" pero no en "Pasan" ni "Fallan".

## Casos CP

| ID     | Descripción                                                                                                                                                                            | Resultado |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| CP-01  | sin token responde 401 en todas las rutas salvo las públicas (/health y /auth/login)                                                                                                   | ✔ Pasa    |
| CP-02  | token vencido o con firma inválida responde 401                                                                                                                                        | ✔ Pasa    |
| CP-03  | rol no permitido responde 403 en cada ruta                                                                                                                                             | ✔ Pasa    |
| CP-04  | rol permitido supera los guards en cada ruta                                                                                                                                           | ✔ Pasa    |
| CP-05  | asesor B sobre un cliente de asesor A recibe 404 en toda ruta :clienteId                                                                                                               | ✔ Pasa    |
| CP-06  | auxiliar: autorización activa pasa; sin registro o con activo=false recibe 404                                                                                                         | ✔ Pasa    |
| CP-07  | supervisor accede a cualquier cliente existente; inexistente da el mismo 404 que sin acceso                                                                                            | ✔ Pasa    |
| CP-08  | supervisor crea usuario: 201, sin contrasena_hash en la respuesta y hash bcrypt en BD                                                                                                  | ✔ Pasa    |
| CP-08  | cifra la contraseña, guarda solo el hash y no devuelve contraseña ni hash                                                                                                              | ✔ Pasa    |
| CP-09  | correo repetido responde 409                                                                                                                                                           | ✔ Pasa    |
| CP-09  | un correo repetido responde 409                                                                                                                                                        | ✔ Pasa    |
| CP-10  | asesor y auxiliar no pueden crear ni editar usuarios (403)                                                                                                                             | ✔ Pasa    |
| CP-11  | PATCH activo=false desactiva sin borrar; el listado filtra por activo                                                                                                                  | ✔ Pasa    |
| CP-11  | PATCH activo=false desactiva sin borrar al usuario                                                                                                                                     | ✔ Pasa    |
| CP-11  | el listado filtra por activo                                                                                                                                                           | ✔ Pasa    |
| CP-12  | tipo_asesor_id inexistente responde 400; nulo es válido                                                                                                                                | ✔ Pasa    |
| CP-12  | un tipo_asesor_id inexistente responde 400; nulo y omitido son válidos                                                                                                                 | ✔ Pasa    |
| CP-13  | los tres roles pueden leer el catálogo de roles                                                                                                                                        | ✔ Pasa    |
| CP-13  | listarRoles devuelve los roles y listarTiposAsesor el catálogo (de solo lectura)                                                                                                       | ✔ Pasa    |
| CP-14  | listar: asesor ve solo los suyos, auxiliar solo los autorizados activos, supervisor todos                                                                                              | ✔ Pasa    |
| CP-15  | crear fija asesor_id = sub e ignora el asesor_id enviado                                                                                                                               | ✔ Pasa    |
| CP-15b | crear deja las 16 etapas del cliente, una por paso, en Por iniciar con avance 10                                                                                                       | ✔ Pasa    |
| CP-15c | si falla la creación de las etapas, no queda el cliente (rollback)                                                                                                                     | ✔ Pasa    |
| CP-16  | CURP con formato inválido responde 400; CURP repetida responde 409                                                                                                                     | ✔ Pasa    |
| CP-17  | un asesor que no es dueño no puede editar el cliente (404)                                                                                                                             | ✔ Pasa    |
| CP-18  | reasignar: supervisor 200; asesor 403; destino inexistente o que no es asesor responde 400                                                                                             | ✔ Pasa    |
| CP-19  | autorizar guarda autorizado_por = sub; repetir el par reactiva la fila sin duplicar; el usuario debe ser auxiliar                                                                      | ✔ Pasa    |
| CP-20  | desactivar la autorización quita el acceso en la siguiente petición (404)                                                                                                              | ✔ Pasa    |
| CP-21  | PUT historial-laboral es idempotente: dos PUT iguales dejan un solo registro                                                                                                           | ✔ Pasa    |
| CP-22  | Por iniciar 10; Finalizado 100; En proceso 55 queda 55; En proceso 15 o 95 lanza error; Bloqueado conserva 40                                                                          | ✔ Pasa    |
| CP-23  | Bloqueado sin motivo_rechazo responde 400; con motivo, el historial lo guarda                                                                                                          | ✔ Pasa    |
| CP-24  | cada cambio inserta una fila de historial con estatus anterior y nuevo, usuario y fecha                                                                                                | ✔ Pasa    |
| CP-25  | si falla el insert del historial, la etapa conserva estatus y avance (rollback)                                                                                                        | ✔ Pasa    |
| CP-26  | no existe ruta ni método que modifique o elimine el historial                                                                                                                          | ✔ Pasa    |
| CP-27  | avanceGlobal excluye las etapas No aplica                                                                                                                                              | ✔ Pasa    |
| CP-28  | asesor ajeno recibe 404; auxiliar recibe 403 al escribir etapas                                                                                                                        | ✔ Pasa    |
| CP-29  | corrección CURP con dato_actual y dato_correcto: 201; sin dato_correcto responde 400                                                                                                   | ✔ Pasa    |
| CP-30  | al finalizar la etapa 2 se copian CURP, RFC, nacimiento, sexo y nombre; Acta, AFORE, IMSS y Otro no sobrescriben                                                                       | ✔ Pasa    |
| CP-31  | dato_correcto con CURP mal formada responde 400 y el cliente queda intacto                                                                                                             | ✔ Pasa    |
| CP-32  | nss_principal de 11 dígitos, criterio válido y etapa institucional válida; fuera de rango responde 400                                                                                 | ✔ Pasa    |
| CP-33  | un secundario igual al principal responde 400; uno repetido responde 409                                                                                                               | ✔ Pasa    |
| CP-34  | registrar el dictamen actualiza semanas_imss_reconocidas y no toca semanas_a_recuperar                                                                                                 | ✔ Pasa    |
| CP-35  | un asesor no registra correcciones de clientes ajenos (404); el auxiliar recibe 403                                                                                                    | ✔ Pasa    |
| CP-36  | el asesor agenda para su cliente; para uno ajeno 404; estatus fuera de pendiente, cumplido, reagendado o cancelado responde 400                                                        | ✔ Pasa    |
| CP-37  | el asesor ve la suya, el auxiliar la de clientes autorizados, el supervisor toda; filtra por fecha                                                                                     | ✔ Pasa    |
| CP-38  | se generan avisos para etapas y eventos a 2 días o menos; no para Finalizado, Cancelado ni No aplica; las citas pendientes y reagendadas sí, las cumplidas y canceladas no             | ✔ Pasa    |
| CP-39  | dos consultas seguidas y dos en paralelo no duplican avisos                                                                                                                            | ✔ Pasa    |
| CP-40  | borde de zona: a las 23:30 de Cancún del día D-3 no hay aviso; a las 00:00 del día D-2 sí                                                                                              | ✔ Pasa    |
| CP-41  | atender guarda atendido_por = sub y fecha_atencion; atender de nuevo conserva la primera fecha                                                                                         | ✔ Pasa    |
| CP-42  | avisos: el asesor ve los de sus clientes, el auxiliar los de autorizados, el supervisor todos                                                                                          | ✔ Pasa    |
| CP-43  | con 1,000 eventos sembrados, agenda y avisos responden en menos de 5 s (RNF-01)                                                                                                        | ✔ Pasa    |
| CP-44  | subir un archivo nuevo del mismo tipo reemplaza al anterior: queda una fila vigente y el archivo viejo se borra                                                                        | ✔ Pasa    |
| CP-45  | tipo distinto de PDF, JPG o PNG, o más de 10 MB, responde 400                                                                                                                          | ✔ Pasa    |
| CP-46  | asesor y auxiliar (autorizado) suben; el supervisor no sube (403) pero sí revisa                                                                                                       | ✔ Pasa    |
| CP-47  | revisar actualiza estatus y observaciones del documento                                                                                                                                | ✔ Pasa    |
| CP-48  | descargar el documento de un cliente ajeno responde 404                                                                                                                                | ✔ Pasa    |
| CP-49  | guarda, lee y borra con la clave esperada en el bucket configurado                                                                                                                     | ✔ Pasa    |
| CP-49  | nunca expone credenciales: ni en el objeto ni en los errores                                                                                                                           | ✔ Pasa    |
| CP-50  | la ruta responde 200, Content-Type application/pdf y el cuerpo empieza con %PDF-                                                                                                       | ✔ Pasa    |
| CP-51  | el texto del PDF contiene el nombre y la CURP del cliente de prueba                                                                                                                    | ✔ Pasa    |
| CP-52  | un cliente sin datos opcionales genera el PDF sin error                                                                                                                                | ✔ Pasa    |
| CP-53  | asesor ajeno recibe 404; asesor dueño, auxiliar autorizado y supervisor reciben 200                                                                                                    | ✔ Pasa    |
| CP-54  | mide e imprime el tiempo de generación (sin umbral)                                                                                                                                    | ✔ Pasa    |
| CP-55  | el reporte lista cada prueba cuyo título empieza con CP- y su resultado                                                                                                                | ✔ Pasa    |
| CP-56  | semana de lunes a domingo y mes calendario en Cancún; domingo 23:30 pertenece a esa semana, lunes 00:00 a la siguiente                                                                 | ✔ Pasa    |
| CP-57  | el asesor recibe solo métricas de sus clientes; el supervisor las de todos; el auxiliar recibe 403                                                                                     | ✔ Pasa    |
| CP-57  | el asesor y el supervisor reciben el reporte (200); el auxiliar recibe 403; sin token, 401                                                                                             | ✔ Pasa    |
| CP-58  | la matriz etapa por estatus cuenta correctamente con datos sembrados y solo incluye las etapas 0 a 4                                                                                   | ✔ Pasa    |
| CP-59  | finalizados del periodo incluye los límites del rango y excluye lo de fuera                                                                                                            | ✔ Pasa    |
| CP-60  | vencidos y por vencer respecto a un reloj fijo; excluye Finalizado, Cancelado y No aplica                                                                                              | ✔ Pasa    |
| CP-60b | la lista de vencimientos es corta (10) pero los conteos son completos                                                                                                                  | ✔ Pasa    |
| CP-61  | tasa de rechazo = bloqueos con motivo / etapas con cambios; 0 cuando no hay cambios (sin dividir entre cero)                                                                           | ✔ Pasa    |
| CP-61b | los motivos se ordenan por frecuencia y se limitan a los 5 más frecuentes                                                                                                              | ✔ Pasa    |
| CP-62  | el desglose por asesor solo aparece para el supervisor                                                                                                                                 | ✔ Pasa    |
| CP-63  | clientes nuevos y distribución por régimen respetan el periodo y el alcance                                                                                                            | ✔ Pasa    |
| CP-64  | la ruta responde 200, Content-Type application/pdf y el cuerpo empieza con %PDF-                                                                                                       | ✔ Pasa    |
| CP-65  | el texto del PDF contiene el periodo, los totales y la tasa de rechazo del reporte                                                                                                     | ✔ Pasa    |
| CP-66  | un periodo sin datos genera el PDF sin error, con ceros                                                                                                                                | ✔ Pasa    |
| CP-67  | el auxiliar recibe 403 y el asesor solo obtiene un PDF con sus clientes                                                                                                                | ✔ Pasa    |
| CP-68  | ninguna combinación ruta-rol responde 500 (el handler no falla)                                                                                                                        | ✔ Pasa    |
| CP-69  | login correcto: 200 con access_token, expires_in 28800 y usuario {id, nombre, rol}; el token trae sub, rol y exp a 8 horas                                                             | ✔ Pasa    |
| CP-69  | el correo no distingue mayúsculas                                                                                                                                                      | ✔ Pasa    |
| CP-70  | el token emitido lo acepta el guard existente en GET /clientes para cada rol                                                                                                           | ✔ Pasa    |
| CP-71  | contraseña incorrecta, correo inexistente y usuario inactivo responden 401 con el mismo mensaje                                                                                        | ✔ Pasa    |
| CP-71  | usuario inexistente: compara contra un hash ficticio y responde el mismo 401                                                                                                           | ✔ Pasa    |
| CP-71  | contraseña incorrecta y usuario inactivo responden el mismo 401                                                                                                                        | ✔ Pasa    |
| CP-72  | ninguna respuesta del login incluye contrasena_hash ni el hash                                                                                                                         | ✔ Pasa    |
| CP-73  | cuerpo sin correo o sin contraseña responde 400                                                                                                                                        | ✔ Pasa    |
| CP-74  | un origen permitido recibe Access-Control-Allow-Origin; otro origen no recibe permiso; sin comodín                                                                                     | ✔ Pasa    |
| CP-74  | la verificación previa de un DELETE (cabeceras de la pantalla de Correcciones) concede DELETE                                                                                          | ✔ Pasa    |
| CP-74  | solo concede lo acordado: métodos, cabeceras, Content-Disposition expuesta y sin credenciales                                                                                          | ✔ Pasa    |
| CP-74  | sin CORS_ORIGINS solo permite http://localhost:3000                                                                                                                                    | ✔ Pasa    |
| CP-75  | el script crea un Supervisor que puede iniciar sesión; repetirlo no duplica; la contraseña no queda en texto plano                                                                     | ✔ Pasa    |
| CP-76  | los seis catálogos responden 200 con la lista completa de su tabla, ordenada por id, para asesor, auxiliar y supervisor                                                                | ✔ Pasa    |
| CP-76  | los catálogos traen el nombre de cada elemento                                                                                                                                         | ✔ Pasa    |
| CP-76  | sin token o con un rol fuera del contrato los catálogos responden 401                                                                                                                  | ✔ Pasa    |
| CP-77  | historial laboral: asesor dueño 200, asesor ajeno 404, auxiliar 403, supervisor 200; sin datos responde vacío, no 500                                                                  | ✔ Pasa    |
| CP-77  | información ISSSTE: asesor dueño 200, asesor ajeno 404, auxiliar 403, supervisor 200; sin historial o sin datos responde vacío                                                         | ✔ Pasa    |
| CP-77  | objetivos específicos marcados: asesor dueño 200, asesor ajeno 404, auxiliar 403, supervisor 200; sin datos responde lista vacía                                                       | ✔ Pasa    |
| CP-78  | auxiliares del cliente: asesor dueño y supervisor 200; auxiliar 403; asesor ajeno 404; sin auxiliares responde lista vacía                                                             | ✔ Pasa    |
| CP-78  | la lista de auxiliares incluye también las autorizaciones desactivadas                                                                                                                 | ✔ Pasa    |
| CP-79  | la matriz cubre todas las rutas del router (3 roles cada una), ninguna combinación responde 500 y el CSV y endpoints.md coinciden con ella                                             | ✔ Pasa    |
| CP-80  | un token vencido emitido por el login responde 401 en una ruta protegida                                                                                                               | ✔ Pasa    |
| CP-81  | el auxiliar con autorización activa lee las etapas y el historial (200)                                                                                                                | ✔ Pasa    |
| CP-81  | sin autorización o con autorización inactiva el auxiliar recibe 404                                                                                                                    | ✔ Pasa    |
| CP-81  | el auxiliar sigue sin poder cambiar el estatus ni crear etapas (403), aun con autorización activa                                                                                      | ✔ Pasa    |
| CP-82  | el supervisor restablece la de un asesor: 204 sin cuerpo; entra con la nueva y ya no con la vieja                                                                                      | ✔ Pasa    |
| CP-82  | funciona también sobre un usuario inactivo (sigue inactivo y no puede entrar)                                                                                                          | ✔ Pasa    |
| CP-83  | asesor y auxiliar reciben 403 y no se cambia nada; sin token 401                                                                                                                       | ✔ Pasa    |
| CP-84  | usuario inexistente 404; id que no es uuid 400                                                                                                                                         | ✔ Pasa    |
| CP-85  | cuerpo inválido (falta, corta, larga, tipo erróneo, campo extra) responde 400 y no cambia nada                                                                                         | ✔ Pasa    |
| CP-85  | los límites de 8 y de 72 caracteres son válidos                                                                                                                                        | ✔ Pasa    |
| CP-86  | cada rol cambia la suya: 204 sin cuerpo; el login funciona con la nueva y ya no con la vieja                                                                                           | ✔ Pasa    |
| CP-86  | con la actual correcta guarda el hash de la nueva en contrasena_hash                                                                                                                   | ✔ Pasa    |
| CP-87  | la actual incorrecta responde 400 (no 401) con su mensaje y no cambia nada                                                                                                             | ✔ Pasa    |
| CP-87  | la actual incorrecta responde 400 con su mensaje y no guarda nada                                                                                                                      | ✔ Pasa    |
| CP-88  | la nueva igual a la actual responde 400 y no cambia nada                                                                                                                               | ✔ Pasa    |
| CP-88  | la nueva igual a la actual responde 400 y no guarda nada                                                                                                                               | ✔ Pasa    |
| CP-89  | cuerpo inválido (falta, nueva corta o larga, tipos erróneos, campos extra) responde 400                                                                                                | ✔ Pasa    |
| CP-90  | sin token responde 401; la nueva de 72 caracteres es válida                                                                                                                            | ✔ Pasa    |
| CP-91  | un usuario inactivo o inexistente no puede cambiarla (401) y no se modifica nada                                                                                                       | ✔ Pasa    |
| CP-91  | usuario inactivo o inexistente responde 401 y no guarda nada                                                                                                                           | ✔ Pasa    |
| CP-92  | ninguna respuesta incluye contrasena_hash ni el hash                                                                                                                                   | ✔ Pasa    |
| CP-92  | ninguna respuesta incluye contrasena_hash ni el hash                                                                                                                                   | ✔ Pasa    |
| CP-93  | crear: el asesor dueño guarda la información ISSSTE (200); sin id ni activo se genera el id y activo es true; anios_laborados vuelve como número                                       | ✔ Pasa    |
| CP-93  | el id enviado se usa al crear; activo y anios_laborados son opcionales (anios queda en null)                                                                                           | ✔ Pasa    |
| CP-94  | reemplazar: dos PUT dejan una sola fila con el mismo id, y el segundo reemplaza los datos                                                                                              | ✔ Pasa    |
| CP-94  | PUT simultáneos del mismo cliente no duplican la fila                                                                                                                                  | ✔ Pasa    |
| CP-94  | un id que ya pertenece a otro cliente responde 409 en español, no 500                                                                                                                  | ✔ Pasa    |
| CP-95  | sin historial laboral responde 409 con "Primero registra el historial laboral del cliente." y no guarda nada                                                                           | ✔ Pasa    |
| CP-96  | GET después del PUT devuelve lo guardado, para el asesor dueño y para el supervisor                                                                                                    | ✔ Pasa    |
| CP-97  | validaciones: sin nss, nss de 21 caracteres, años negativos, 1000 o con 3 decimales responden 400 y no guardan                                                                         | ✔ Pasa    |
| CP-97  | los límites válidos se aceptan: nss de 20 caracteres, años 0 y 999.99                                                                                                                  | ✔ Pasa    |
| CP-98  | roles: asesor ajeno 404, cliente inexistente 404, supervisor 403, auxiliar 403 (aun autorizado), sin token 401                                                                         | ✔ Pasa    |
| CP-99  | ninguna entrada responde 500: cuerpos que no son objeto, JSON roto y valores extremos dan 4xx                                                                                          | ✔ Pasa    |
| CP-100 | Swagger describe anios_laborados como número (nullable) y id y activo como opcionales en el cuerpo del PUT                                                                             | ✔ Pasa    |
| CP-101 | GET /catalogos/tipos-correccion devuelve los 12 tipos ordenados por id para asesor, auxiliar y supervisor; sin token 401                                                               | ✔ Pasa    |
| CP-102 | un cliente sin correcciones responde 200 con []                                                                                                                                        | ✔ Pasa    |
| CP-103 | la lista trae las correcciones del cliente en el orden de inserción (el mismo del PDF, ORDER BY ctid) y no las de otro cliente                                                         | ✔ Pasa    |
| CP-104 | GET de una corrección: 200 con sus campos; inexistente o de otro cliente 404; id que no es uuid 400                                                                                    | ✔ Pasa    |
| CP-105 | PATCH parcial: cambia solo lo enviado, devuelve la corrección actualizada y no toca el tipo ni el cliente                                                                              | ✔ Pasa    |
| CP-105 | PATCH con cuerpo {} responde 200 y deja la corrección igual                                                                                                                            | ✔ Pasa    |
| CP-106 | PATCH que borra una observación (null) y el tiempo promedio; el resto queda                                                                                                            | ✔ Pasa    |
| CP-107 | PATCH en un tipo que exige dato_correcto: no se puede borrar ni dejar con formato inválido, y el registro queda intacto                                                                | ✔ Pasa    |
| CP-108 | PATCH inválido responde 400: tipo_correccion_id y otros campos fuera del contrato, valores que no son texto y JSON roto                                                                | ✔ Pasa    |
| CP-109 | roles: asesor dueño 200; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404                                                             | ✔ Pasa    |
| CP-110 | el PDF del F0 sigue respondiendo 200 después de crear y modificar correcciones, y muestra lo modificado                                                                                | ✔ Pasa    |
| CP-111 | ninguna entrada responde 500 en las rutas de correcciones                                                                                                                              | ✔ Pasa    |
| CP-112 | un cuerpo demasiado grande (error 413 del parser, que no es HttpException) responde 413 en español, no 500                                                                             | ✔ Pasa    |
| CP-112 | otros errores 4xx del parser conservan su estado; un objeto con estado 5xx sigue siendo 500                                                                                            | ✔ Pasa    |
| CP-113 | POST crea el borrador con {}: asesor_id es el asesor del cliente, fecha_analisis es hoy (America/Cancun) y lo demás queda vacío                                                        | ✔ Pasa    |
| CP-113 | POST con datos los guarda (numéricos como número); un segundo POST responde 409; asesor_id del cuerpo no se acepta                                                                     | ✔ Pasa    |
| CP-114 | GET: sin diagnóstico responde 200 con el cuerpo vacío; con diagnóstico, la fila                                                                                                        | ✔ Pasa    |
| CP-115 | PATCH parcial: cambia solo lo enviado, null borra, {} no cambia nada; sin diagnóstico 404                                                                                              | ✔ Pasa    |
| CP-115 | PATCH inválido responde 400 y no cambia nada: enumerados, rangos, fechas, decimales y campos fuera del contrato                                                                        | ✔ Pasa    |
| CP-116 | roles: asesor dueño 200; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404                                                             | ✔ Pasa    |
| CP-117 | los 8 catálogos del F1 devuelven la lista completa de su tabla, ordenada por id, para asesor, auxiliar y supervisor; sin token 401                                                     | ✔ Pasa    |
| CP-118 | ninguna entrada responde 500 en POST y PATCH del diagnóstico                                                                                                                           | ✔ Pasa    |
| CP-119 | objetivos: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                                  | ✔ Pasa    |
| CP-119 | estrategias-recomendadas: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                   | ✔ Pasa    |
| CP-119 | inconsistencias-generales: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                  | ✔ Pasa    |
| CP-119 | objetivos-modalidad-10: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                     | ✔ Pasa    |
| CP-119 | objetivos-modalidad-40: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                     | ✔ Pasa    |
| CP-119 | recuperacion-gestiones: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                     | ✔ Pasa    |
| CP-119 | recuperacion-evidencias: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                    | ✔ Pasa    |
| CP-119 | documentos: PUT reemplaza la lista completa y GET devuelve lo guardado                                                                                                                 | ✔ Pasa    |
| CP-120 | objetivos: valida los elementos (400) y no cambia lo guardado                                                                                                                          | ✔ Pasa    |
| CP-120 | estrategias-recomendadas: valida los elementos (400) y no cambia lo guardado                                                                                                           | ✔ Pasa    |
| CP-120 | inconsistencias-generales: valida los elementos (400) y no cambia lo guardado                                                                                                          | ✔ Pasa    |
| CP-120 | objetivos-modalidad-10: valida los elementos (400) y no cambia lo guardado                                                                                                             | ✔ Pasa    |
| CP-120 | objetivos-modalidad-40: valida los elementos (400) y no cambia lo guardado                                                                                                             | ✔ Pasa    |
| CP-120 | recuperacion-gestiones: valida los elementos (400) y no cambia lo guardado                                                                                                             | ✔ Pasa    |
| CP-120 | recuperacion-evidencias: valida los elementos (400) y no cambia lo guardado                                                                                                            | ✔ Pasa    |
| CP-120 | documentos: valida los elementos (400) y no cambia lo guardado                                                                                                                         | ✔ Pasa    |
| CP-121 | criterios-modalidad-10: PUT reemplaza la lista (con id generado) y GET la devuelve en el mismo orden; los valores inválidos dan 400                                                    | ✔ Pasa    |
| CP-121 | criterios-modalidad-40: PUT reemplaza la lista (con id generado) y GET la devuelve en el mismo orden; los valores inválidos dan 400                                                    | ✔ Pasa    |
| CP-121 | conveniencia-retroactivo: PUT reemplaza la lista (con id generado) y GET la devuelve en el mismo orden; los valores inválidos dan 400                                                  | ✔ Pasa    |
| CP-122 | sin el dueño de la lista: GET responde [] y PUT 409 con el mensaje que dice qué falta                                                                                                  | ✔ Pasa    |
| CP-123 | roles en todas las listas: asesor dueño 200; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404                                         | ✔ Pasa    |
| CP-124 | ninguna entrada responde 500 en las listas: cuerpos que no son objeto, JSON roto y valores extremos                                                                                    | ✔ Pasa    |
| CP-125 | recuperación de semanas: GET vacío sin análisis; PUT lo crea (aplica obligatorio) y GET lo devuelve; la docs de semanas_imss_reconocidas sigue vigente                                 | ✔ Pasa    |
| CP-126 | retroactivo: PUT {} crea el análisis vacío, PUT parcial lo reemplaza, GET lo devuelve (números como número); sin diagnóstico 409; valores inválidos 400                                | ✔ Pasa    |
| CP-127 | escenarios: POST (orden 1 a 3), GET ordenado por orden, PATCH parcial; orden repetido 409; orden fuera de 1 a 3 y valores inválidos 400; otro cliente 404                              | ✔ Pasa    |
| CP-128 | periodos de inconsistencias: POST, GET en orden de captura, PATCH parcial, DELETE 204; otro cliente 404; inválidos 400                                                                 | ✔ Pasa    |
| CP-129 | plan de acción: POST (estatus por omisión pendiente), GET en orden de captura, PATCH parcial, DELETE 204; sin diagnóstico 409; otro cliente 404; inválidos 400                         | ✔ Pasa    |
| CP-130 | situación patrimonial: GET vacío sin registro; PUT todo opcional (reemplaza, números como número); sin diagnóstico 409; inválidos 400                                                  | ✔ Pasa    |
| CP-131 | hijos: una fila por hijo; GET [], POST agrega, PUT reemplaza la lista; sin situación patrimonial 409; inválidos 400                                                                    | ✔ Pasa    |
| CP-132 | roles en las rutas de este grupo: asesor dueño bien; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404                                 | ✔ Pasa    |
| CP-133 | ninguna entrada responde 500 en las rutas de este grupo: cuerpos que no son objeto, JSON roto, valores extremos y NUL                                                                  | ✔ Pasa    |
| CP-134 | avance: un diagnóstico vacío no mueve la etapa 1; con la primera sección completa pasa a En proceso asesor (25 %) y deja su fila en la bitácora; cada sección completa suma hasta 90 % | ✔ Pasa    |
| CP-135 | avance: si una sección deja de estar completa, el avance baja; borrar es tan válido como guardar                                                                                       | ✔ Pasa    |
| CP-136 | avance: no toca una etapa Finalizada ni un cliente sin etapas, y un guardado sin etapa 1 no falla                                                                                      | ✔ Pasa    |
| CP-137 | PDF incompleto: sin diagnóstico 409; con diagnóstico vacío 409 con la lista de campos faltantes (sección, campo y etiqueta) y sin generar el archivo                                   | ✔ Pasa    |
| CP-138 | PDF completo: 200 application/pdf (%PDF-) con el nombre de archivo; trae las 14 secciones, el aviso de alcance, las líneas de firma y los datos capturados                             | ✔ Pasa    |
| CP-139 | PDF: la fórmula de recuperación y los años para recuperar la inversión se imprimen (meses ÷ 12)                                                                                        | ✔ Pasa    |
| CP-140 | PDF roles: asesor dueño 200/409; supervisor y auxiliar (aun autorizado) 403; sin token 401; asesor ajeno y cliente inexistente 404; nunca 500                                          | ✔ Pasa    |
| CP-141 | escenarios: DELETE responde 204 y lo quita; otro cliente, inexistente 404, id inválido 400; roles; borrar libera el orden                                                              | ✔ Pasa    |
| CP-142 | avance: quitar el último escenario hace que la sección deje de estar completa y el avance baja                                                                                         | ✔ Pasa    |
| CP-143 | GET, POST y PATCH de /clientes/:id/auxiliares responden con el asesor dueño, también en ráfaga y en secuencia                                                                          | ✔ Pasa    |
| CP-144 | GET /auxiliares: asesor y supervisor reciben solo usuarios con rol auxiliar, ordenados por nombre y sin datos sensibles                                                                | ✔ Pasa    |
| CP-145 | GET /auxiliares: el auxiliar recibe 403 y sin token 401                                                                                                                                | ✔ Pasa    |
| CP-146 | un aviso de trámite y uno de cita traen cliente, asesor, título, descripción, compromiso, hora y datos de la etapa                                                                     | ✔ Pasa    |
| CP-147 | la etapa sin accion_a_realizar da descripcion null; los campos antiguos no cambian y no se expone nada más del asesor                                                                  | ✔ Pasa    |
| CP-148 | el filtro atendido sigue funcionando y un aviso atendido conserva atendido_por y fecha_atencion enriquecido                                                                            | ✔ Pasa    |
| CP-149 | el auxiliar recibe solo los de sus clientes autorizados y ve asesor_nombre; el supervisor recibe todos                                                                                 | ✔ Pasa    |
| CP-150 | GET /avisos/:id devuelve el aviso enriquecido; ajeno o inexistente 404; id inválido 400; sin token 401                                                                                 | ✔ Pasa    |
| CP-151 | PATCH atender: aviso ajeno o inexistente 404 y sin token 401                                                                                                                           | ✔ Pasa    |
| CP-152 | listar 10 avisos no hace más consultas que listar 2 (sin consultas por aviso)                                                                                                          | ✔ Pasa    |
| CP-153 | cliente activo vs pensionado, resumen y fecha de hoy en Cancún                                                                                                                         | ✔ Pasa    |
| CP-154 | etapa actual: en proceso, bloqueada, detenida, por iniciar y todo finalizado; 16 filas que suman los activos                                                                           | ✔ Pasa    |
| CP-155 | avance detenido: etapa Detenido o 15 días sin actividad (14 días no cuenta); más días primero                                                                                          | ✔ Pasa    |
| CP-156 | acciones del mes: tres estados, excluye Cancelado, No aplica, otros meses y pensionados; orden y límite con total completo                                                             | ✔ Pasa    |
| CP-157 | documentos: conteos solo de clientes activos, pendientes por fecha de carga con total, y límite                                                                                        | ✔ Pasa    |
| CP-158 | alcance por rol: el auxiliar solo ve sus clientes autorizados activos; el supervisor ve todo con asesores y carga                                                                      | ✔ Pasa    |
| CP-159 | un asesor sin clientes recibe todo en cero: 16 etapas, listas vacías y totales 0                                                                                                       | ✔ Pasa    |
| CP-160 | ?limite inválido (0, 51, "x", 1.5) responde 400 en español; 1 y 50 son válidos; sin token 401                                                                                          | ✔ Pasa    |
| CP-161 | sin N+1: el número de consultas no crece con el número de clientes                                                                                                                     | ✔ Pasa    |
| CP-162 | periodo trimestral: el trimestre de calendario que contiene la fecha, con el borde de fin de año                                                                                       | ✔ Pasa    |
| CP-163 | periodo inválido sigue dando 400 en español, en JSON y en PDF                                                                                                                          | ✔ Pasa    |
| CP-164 | las secciones existentes usan el rango del trimestre (finalizados, clientes nuevos, rechazo)                                                                                           | ✔ Pasa    |
| CP-165 | trazabilidad: cambios de etapas 0 a 4 dentro del periodo, recientes primero, con estatus anterior null en el primero                                                                   | ✔ Pasa    |
| CP-166 | trazabilidad con alcance por rol: el asesor solo lo suyo, el supervisor todo, el auxiliar 403                                                                                          | ✔ Pasa    |
| CP-167 | la lista de trazabilidad se limita a 20 pero el total es completo, y el orden es del más reciente al más antiguo                                                                       | ✔ Pasa    |
| CP-168 | sin N+1: el número de consultas del reporte no crece con el número de cambios                                                                                                          | ✔ Pasa    |
| CP-169 | PDF trimestral: título, nombre de archivo y la tabla de trazabilidad después de Clientes nuevos                                                                                        | ✔ Pasa    |
| CP-170 | avance_por_cliente (asesor): solo clientes activos propios, ordenados por nombre, con las 16 etapas en orden                                                                           | ✔ Pasa    |
| CP-171 | un cliente sin etapas devuelve las 16 con avance 0 y estatus_id null                                                                                                                   | ✔ Pasa    |
| CP-172 | tope de 200 clientes con total_avance_por_cliente completo                                                                                                                             | ✔ Pasa    |
| CP-173 | avance_por_cliente es null para el auxiliar y el supervisor                                                                                                                            | ✔ Pasa    |
| CP-174 | GET /correcciones: solo el asesor (auxiliar y supervisor 403, sin token 401) y solo sus clientes que requieren una fase                                                                | ✔ Pasa    |
| CP-175 | reglas de requiere: F2 con correcciones que no son de tipo NSS, F3 con una de tipo NSS, F4 con análisis aplica si o requiere_mas_evidencia                                             | ✔ Pasa    |
| CP-176 | documentos_cargados: F3 cuenta el tipo de certificación; F4 cuenta constancia de aclaración y solicitud de reintegro; F2 es null                                                       | ✔ Pasa    |
| CP-177 | cada cliente trae las 3 fases en orden con sus campos de etapa; sin la etapa: estatus null y avance 0; orden por actualizado_el                                                        | ✔ Pasa    |
| CP-179 | GET detalle: con datos devuelve nss_principal_elegido, criterio_seleccion y etapa_institucional_actual                                                                                 | ✔ Pasa    |
| CP-180 | GET detalle: sin detalle, corrección inexistente o de otro cliente responde 404; roles y alcance                                                                                       | ✔ Pasa    |
| CP-181 | GET secundarios: lista con id, nss y observaciones; vacía sin detalle o sin secundarios                                                                                                | ✔ Pasa    |
| CP-182 | GET secundarios: corrección de otro cliente o inexistente 404; asesor ajeno 404, auxiliar y supervisor 403, sin token 401                                                              | ✔ Pasa    |
| CP-183 | el catálogo de tipos de documento incluye los 3 tipos de Correcciones, en orden y con ids consecutivos a los existentes                                                                | ✔ Pasa    |
| CP-184 | los 3 tipos de documento de Correcciones se pueden subir como los demás                                                                                                                | ✔ Pasa    |
| CP-185 | resumen: clientes_con_correcciones y documentos_por_subir (fases F3 o F4 requeridas sin documentos); sin tramites_*                                                                    | ✔ Pasa    |
| CP-186 | máximo 500 filas, las más recientes primero; el resumen cuenta todos los clientes que cumplen                                                                                          | ✔ Pasa    |
| CP-187 | sin N+1: el número de consultas de GET /correcciones no crece con los clientes                                                                                                         | ✔ Pasa    |
| CP-188 | borra la corrección: 204 sin cuerpo y la fila desaparece; las demás correcciones del cliente se conservan                                                                              | ✔ Pasa    |
| CP-189 | 404 en español si la corrección no existe o es de otro cliente; 400 con un id inválido; la ajena no se borra                                                                           | ✔ Pasa    |
| CP-190 | alcance por rol: asesor ajeno 404, auxiliar y supervisor 403, sin token 401; nada se borra                                                                                             | ✔ Pasa    |
| CP-191 | una corrección de tipo NSS se borra con su detalle y sus NSS secundarios; otras unificaciones no se tocan                                                                              | ✔ Pasa    |
| CP-192 | GET /correcciones refleja el borrado: F2 deja de requerirse sin correcciones que no sean de tipo NSS; lo demás no cambia                                                               | ✔ Pasa    |
| CP-193 | una cita reagendada genera aviso con alerta a 2 días; las cumplidas y canceladas no                                                                                                    | ✔ Pasa    |
| CP-194 | mover una cita a un día cuya alerta ya existía y estaba atendida la deja pendiente; los avisos de otras fechas no se tocan                                                             | ✔ Pasa    |
| CP-195 | cambiar solo la hora de la cita reabre su aviso atendido; un PATCH sin cambio de fecha ni hora, o con otro campo, no lo reabre                                                         | ✔ Pasa    |
| CP-196 | mover fecha_compromiso de una etapa a un día cuya alerta ya existía y estaba atendida la deja pendiente; otras fechas intactas                                                         | ✔ Pasa    |
| CP-197 | un cambio rechazado (400) no reabre el aviso atendido; un evento inexistente da 404                                                                                                    | ✔ Pasa    |
