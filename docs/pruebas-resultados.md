# Resultados de pruebas

Generado el 2026-11-09 con `node scripts/reporte-pruebas.mjs` a partir de `jest --json` (apps/api). No se edita a mano.

## Resumen por suite

| Suite                                             | Pruebas | Pasan   | Fallan | Tiempo (s) |
| ------------------------------------------------- | ------- | ------- | ------ | ---------- |
| acceso-matriz.spec.ts                             | 8       | 8       | 0      | 51.87      |
| agenda/agenda.e2e.spec.ts                         | 3       | 3       | 0      | 26.68      |
| avisos/avisos.service.spec.ts                     | 7       | 7       | 0      | 28.42      |
| clientes/cliente-auxiliar.autorizacion.spec.ts    | 4       | 4       | 0      | 4.87       |
| clientes/clientes-acceso.spec.ts                  | 14      | 14      | 0      | 8.15       |
| clientes/clientes.controller.roles.spec.ts        | 8       | 8       | 0      | 8.52       |
| clientes/clientes.e2e.spec.ts                     | 10      | 10      | 0      | 26.98      |
| clientes/clientes.service.spec.ts                 | 1       | 1       | 0      | 9.20       |
| common/auth/cliente-access.guard.spec.ts          | 13      | 13      | 0      | 12.25      |
| common/auth/clientes-accesibles.spec.ts           | 4       | 4       | 0      | 0.57       |
| common/auth/dev-token.spec.ts                     | 11      | 11      | 0      | 8.98       |
| common/auth/jwt-auth.guard.spec.ts                | 11      | 11      | 0      | 7.21       |
| common/auth/normalizar-rol.spec.ts                | 10      | 10      | 0      | 0.56       |
| common/auth/permisos.spec.ts                      | 4       | 4       | 0      | 0.27       |
| common/auth/roles.guard.spec.ts                   | 9       | 9       | 0      | 4.40       |
| common/config/validar-entorno.spec.ts             | 8       | 8       | 0      | 0.39       |
| common/fechas.spec.ts                             | 10      | 10      | 0      | 3.01       |
| common/seguridad/password-hasher.spec.ts          | 3       | 3       | 0      | 4.15       |
| common/testing/bd-pruebas.spec.ts                 | 5       | 5       | 0      | 4.82       |
| documentos/documentos.e2e.spec.ts                 | 9       | 9       | 0      | 14.55      |
| documentos/storage/local-storage.adapter.spec.ts  | 4       | 4       | 0      | 0.61       |
| documentos/storage/spaces-storage.adapter.spec.ts | 5       | 5       | 0      | 1.17       |
| etapas/etapas.e2e.spec.ts                         | 6       | 6       | 0      | 26.87      |
| etapas/etapas.service.spec.ts                     | 5       | 5       | 0      | 25.53      |
| etapas/reglas-avance.spec.ts                      | 9       | 9       | 0      | 0.59       |
| health/health.controller.spec.ts                  | 1       | 1       | 0      | 6.75       |
| reporte-pruebas.spec.ts                           | 3       | 3       | 0      | 0.91       |
| reportes/pdf/f0-modelo.spec.ts                    | 12      | 12      | 0      | 0.58       |
| reportes/pdf/f0-pdf.e2e.spec.ts                   | 2       | 2       | 0      | 23.03      |
| reportes/pdf/f0-pdf.service.spec.ts               | 6       | 6       | 0      | 50.71      |
| reportes/pdf/reporte-pdf.service.spec.ts          | 4       | 4       | 0      | 34.62      |
| reportes/reportes-pdf.e2e.spec.ts                 | 3       | 3       | 0      | 43.21      |
| reportes/reportes.e2e.spec.ts                     | 2       | 2       | 0      | 9.66       |
| reportes/reportes.service.spec.ts                 | 10      | 10      | 0      | 11.16      |
| tramites/reglas-correcciones.spec.ts              | 9       | 9       | 0      | 3.34       |
| tramites/tramites.e2e.spec.ts                     | 11      | 11      | 0      | 29.09      |
| usuarios-roles/usuarios-roles.e2e.spec.ts         | 11      | 11      | 0      | 27.32      |
| usuarios-roles/usuarios-roles.service.spec.ts     | 12      | 12      | 0      | 5.53       |
| **Total**                                         | **267** | **267** | **0**  | **526.51** |

Las pruebas pendientes (`it.todo`, `skip` o suites con base real sin `TEST_DATABASE_URL`) cuentan en "Pruebas" pero no en "Pasan" ni "Fallan".

## Casos CP

| ID     | Descripción                                                                                                                     | Resultado |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | --------- |
| CP-01  | sin token responde 401 en todas las rutas salvo /health                                                                         | ✔ Pasa    |
| CP-02  | token vencido o con firma inválida responde 401                                                                                 | ✔ Pasa    |
| CP-03  | rol no permitido responde 403 en cada ruta                                                                                      | ✔ Pasa    |
| CP-04  | rol permitido supera los guards en cada ruta                                                                                    | ✔ Pasa    |
| CP-05  | asesor B sobre un cliente de asesor A recibe 404 en toda ruta :clienteId                                                        | ✔ Pasa    |
| CP-06  | auxiliar: autorización activa pasa; sin registro o con activo=false recibe 404                                                  | ✔ Pasa    |
| CP-07  | supervisor accede a cualquier cliente existente; inexistente da el mismo 404 que sin acceso                                     | ✔ Pasa    |
| CP-08  | supervisor crea usuario: 201, sin contrasena_hash en la respuesta y hash bcrypt en BD                                           | ✔ Pasa    |
| CP-08  | cifra la contraseña, guarda solo el hash y no devuelve contraseña ni hash                                                       | ✔ Pasa    |
| CP-09  | correo repetido responde 409                                                                                                    | ✔ Pasa    |
| CP-09  | un correo repetido responde 409                                                                                                 | ✔ Pasa    |
| CP-10  | asesor y auxiliar no pueden crear ni editar usuarios (403)                                                                      | ✔ Pasa    |
| CP-11  | PATCH activo=false desactiva sin borrar; el listado filtra por activo                                                           | ✔ Pasa    |
| CP-11  | PATCH activo=false desactiva sin borrar al usuario                                                                              | ✔ Pasa    |
| CP-11  | el listado filtra por activo                                                                                                    | ✔ Pasa    |
| CP-12  | tipo_asesor_id inexistente responde 400; nulo es válido                                                                         | ✔ Pasa    |
| CP-12  | un tipo_asesor_id inexistente responde 400; nulo y omitido son válidos                                                          | ✔ Pasa    |
| CP-13  | los tres roles pueden leer el catálogo de roles                                                                                 | ✔ Pasa    |
| CP-13  | listarRoles devuelve los roles y listarTiposAsesor el catálogo (de solo lectura)                                                | ✔ Pasa    |
| CP-14  | listar: asesor ve solo los suyos, auxiliar solo los autorizados activos, supervisor todos                                       | ✔ Pasa    |
| CP-15  | crear fija asesor_id = sub e ignora el asesor_id enviado                                                                        | ✔ Pasa    |
| CP-15b | crear deja las 16 etapas del cliente, una por paso, en Por iniciar con avance 10                                                | ✔ Pasa    |
| CP-15c | si falla la creación de las etapas, no queda el cliente (rollback)                                                              | ✔ Pasa    |
| CP-16  | CURP con formato inválido responde 400; CURP repetida responde 409                                                              | ✔ Pasa    |
| CP-17  | un asesor que no es dueño no puede editar el cliente (404)                                                                      | ✔ Pasa    |
| CP-18  | reasignar: supervisor 200; asesor 403; destino inexistente o que no es asesor responde 400                                      | ✔ Pasa    |
| CP-19  | autorizar guarda autorizado_por = sub; repetir el par reactiva la fila sin duplicar; el usuario debe ser auxiliar               | ✔ Pasa    |
| CP-20  | desactivar la autorización quita el acceso en la siguiente petición (404)                                                       | ✔ Pasa    |
| CP-21  | PUT historial-laboral es idempotente: dos PUT iguales dejan un solo registro                                                    | ✔ Pasa    |
| CP-22  | Por iniciar 10; Finalizado 100; En proceso 55 queda 55; En proceso 15 o 95 lanza error; Bloqueado conserva 40                   | ✔ Pasa    |
| CP-23  | Bloqueado sin motivo_rechazo responde 400; con motivo, el historial lo guarda                                                   | ✔ Pasa    |
| CP-24  | cada cambio inserta una fila de historial con estatus anterior y nuevo, usuario y fecha                                         | ✔ Pasa    |
| CP-25  | si falla el insert del historial, la etapa conserva estatus y avance (rollback)                                                 | ✔ Pasa    |
| CP-26  | no existe ruta ni método que modifique o elimine el historial                                                                   | ✔ Pasa    |
| CP-27  | avanceGlobal excluye las etapas No aplica                                                                                       | ✔ Pasa    |
| CP-28  | asesor ajeno recibe 404; auxiliar recibe 403 al escribir etapas                                                                 | ✔ Pasa    |
| CP-29  | corrección CURP con dato_actual y dato_correcto: 201; sin dato_correcto responde 400                                            | ✔ Pasa    |
| CP-30  | al finalizar la etapa 2 se copian CURP, RFC, nacimiento, sexo y nombre; Acta, AFORE, IMSS y Otro no sobrescriben                | ✔ Pasa    |
| CP-31  | dato_correcto con CURP mal formada responde 400 y el cliente queda intacto                                                      | ✔ Pasa    |
| CP-32  | nss_principal de 11 dígitos, criterio válido y etapa institucional válida; fuera de rango responde 400                          | ✔ Pasa    |
| CP-33  | un secundario igual al principal responde 400; uno repetido responde 409                                                        | ✔ Pasa    |
| CP-34  | registrar el dictamen actualiza semanas_imss_reconocidas y no toca semanas_a_recuperar                                          | ✔ Pasa    |
| CP-35  | un asesor no registra correcciones de clientes ajenos (404); el auxiliar recibe 403                                             | ✔ Pasa    |
| CP-36  | el asesor agenda para su cliente; para uno ajeno 404; estatus fuera de pendiente, cumplido, reagendado o cancelado responde 400 | ✔ Pasa    |
| CP-37  | el asesor ve la suya, el auxiliar la de clientes autorizados, el supervisor toda; filtra por fecha                              | ✔ Pasa    |
| CP-38  | se generan avisos para etapas y eventos a 2 días o menos; no para Finalizado, Cancelado ni No aplica                            | ✔ Pasa    |
| CP-39  | dos consultas seguidas y dos en paralelo no duplican avisos                                                                     | ✔ Pasa    |
| CP-40  | borde de zona: a las 23:30 de Cancún del día D-3 no hay aviso; a las 00:00 del día D-2 sí                                       | ✔ Pasa    |
| CP-41  | atender guarda atendido_por = sub y fecha_atencion; atender de nuevo conserva la primera fecha                                  | ✔ Pasa    |
| CP-42  | avisos: el asesor ve los de sus clientes, el auxiliar los de autorizados, el supervisor todos                                   | ✔ Pasa    |
| CP-43  | con 1,000 eventos sembrados, agenda y avisos responden en menos de 5 s (RNF-01)                                                 | ✔ Pasa    |
| CP-44  | subir un archivo nuevo del mismo tipo reemplaza al anterior: queda una fila vigente y el archivo viejo se borra                 | ✔ Pasa    |
| CP-45  | tipo distinto de PDF, JPG o PNG, o más de 10 MB, responde 400                                                                   | ✔ Pasa    |
| CP-46  | asesor y auxiliar (autorizado) suben; el supervisor no sube (403) pero sí revisa                                                | ✔ Pasa    |
| CP-47  | revisar actualiza estatus y observaciones del documento                                                                         | ✔ Pasa    |
| CP-48  | descargar el documento de un cliente ajeno responde 404                                                                         | ✔ Pasa    |
| CP-49  | guarda, lee y borra con la clave esperada en el bucket configurado                                                              | ✔ Pasa    |
| CP-49  | nunca expone credenciales: ni en el objeto ni en los errores                                                                    | ✔ Pasa    |
| CP-50  | la ruta responde 200, Content-Type application/pdf y el cuerpo empieza con %PDF-                                                | ✔ Pasa    |
| CP-51  | el texto del PDF contiene el nombre y la CURP del cliente de prueba                                                             | ✔ Pasa    |
| CP-52  | un cliente sin datos opcionales genera el PDF sin error                                                                         | ✔ Pasa    |
| CP-53  | asesor ajeno recibe 404; asesor dueño, auxiliar autorizado y supervisor reciben 200                                             | ✔ Pasa    |
| CP-54  | mide e imprime el tiempo de generación (sin umbral)                                                                             | ✔ Pasa    |
| CP-55  | el reporte lista cada prueba cuyo título empieza con CP- y su resultado                                                         | ✔ Pasa    |
| CP-56  | semana de lunes a domingo y mes calendario en Cancún; domingo 23:30 pertenece a esa semana, lunes 00:00 a la siguiente          | ✔ Pasa    |
| CP-57  | el asesor y el supervisor reciben el reporte (200); el auxiliar recibe 403; sin token, 401                                      | ✔ Pasa    |
| CP-57  | el asesor recibe solo métricas de sus clientes; el supervisor las de todos; el auxiliar recibe 403                              | ✔ Pasa    |
| CP-58  | la matriz etapa por estatus cuenta correctamente con datos sembrados y solo incluye las etapas 0 a 4                            | ✔ Pasa    |
| CP-59  | finalizados del periodo incluye los límites del rango y excluye lo de fuera                                                     | ✔ Pasa    |
| CP-60  | vencidos y por vencer respecto a un reloj fijo; excluye Finalizado, Cancelado y No aplica                                       | ✔ Pasa    |
| CP-60b | la lista de vencimientos es corta (10) pero los conteos son completos                                                           | ✔ Pasa    |
| CP-61  | tasa de rechazo = bloqueos con motivo / etapas con cambios; 0 cuando no hay cambios (sin dividir entre cero)                    | ✔ Pasa    |
| CP-61b | los motivos se ordenan por frecuencia y se limitan a los 5 más frecuentes                                                       | ✔ Pasa    |
| CP-62  | el desglose por asesor solo aparece para el supervisor                                                                          | ✔ Pasa    |
| CP-63  | clientes nuevos y distribución por régimen respetan el periodo y el alcance                                                     | ✔ Pasa    |
| CP-64  | la ruta responde 200, Content-Type application/pdf y el cuerpo empieza con %PDF-                                                | ✔ Pasa    |
| CP-65  | el texto del PDF contiene el periodo, los totales y la tasa de rechazo del reporte                                              | ✔ Pasa    |
| CP-66  | un periodo sin datos genera el PDF sin error, con ceros                                                                         | ✔ Pasa    |
| CP-67  | el auxiliar recibe 403 y el asesor solo obtiene un PDF con sus clientes                                                         | ✔ Pasa    |
| CP-68  | ninguna combinación ruta-rol responde 500 (el handler no falla)                                                                 | ✔ Pasa    |
