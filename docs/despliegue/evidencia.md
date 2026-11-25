# Evidencia de la prueba en la nube (paso 4 de la guía)

App: `https://h3ga-backend-2bbfj.ondigitalocean.app` · Prefijo de la API: `/api/v1` · Corridas del 2026-11-25 (hora UTC).
Sin secretos: no se registran contraseñas, tokens, nombres de clientes ni la URL de la base. Solo lecturas y el inicio de sesión;
no se escribió nada en la base de la nube.

## Corrida con usuarios ficticios (`pruebas:datos`, perfil Supervisor)

| #   | Prueba                            | Petición                                            | HTTP | Fecha (UTC)         | Resultado                                                                    |
| --- | --------------------------------- | --------------------------------------------------- | ---- | ------------------- | ---------------------------------------------------------------------------- |
| 1   | Salud con base                    | `GET /api/v1/health/db`                             | 200  | 2026-11-25 13:33:17 | `{"status":"ok","base_de_datos":"ok"}`: conecta a la base con TLS verificado |
| 2   | Inicio de sesión del Supervisor   | `POST /api/v1/auth/login`                           | 200  | 2026-11-25 13:33:17 | Devuelve `access_token`, `expires_in` y `usuario`                            |
| 3   | Listar clientes                   | `GET /api/v1/clientes`                              | 200  | 2026-11-25 13:33:17 | 5 clientes ficticios                                                         |
| 4   | Agenda                            | `GET /api/v1/agenda`                                | 200  | 2026-11-25 13:33:17 | 1,000 eventos                                                                |
| 5   | Avisos                            | `GET /api/v1/avisos`                                | 200  | 2026-11-25 13:33:18 | 1,002 avisos                                                                 |
| 6   | PDF del F0 de un cliente ficticio | `GET /api/v1/clientes/{id}/diagnostico-inicial/pdf` | 200  | 2026-11-25 13:33:19 | `application/pdf`, 134,124 bytes, empieza con `%PDF-` (fuentes correctas)    |
| 7   | Swagger oculto                    | `GET /api/docs`                                     | 404  | 2026-11-25 13:33:20 | Correcto: en producción no se publica                                        |
| 8   | Swagger JSON oculto               | `GET /api/docs-json`                                | 404  | 2026-11-25 13:33:20 | Correcto                                                                     |

## Corrida previa (2026-11-25 13:28 UTC)

El login con el Supervisor de `SEED_SUPERVISOR_*` del equipo local respondió **401** (`POST /api/v1/auth/login`, 13:28:34). Ese
usuario no es el de la base de la nube; las filas 3 a 6 no se ejecutaron en esa corrida. Las filas 1, 7 y 8 dieron 200, 404 y 404.

## Spaces: subir, descargar y comparar (2026-11-25, UTC)

Documento ficticio: PDF de 129 bytes sin datos reales, SHA-256 `fc3ec705797cb9b8f74fcf7da1340dfc540dceae81999f91b58fe306addff68a`.
Cliente ficticio de `pruebas:datos` (uno de los 3 del Asesor 1) y tipo de documento 7 (Reporte de semanas cotizadas), que no
reemplaza documentos anteriores. Escribe solo en el bucket y en la base de la nube de prueba.

| #   | Paso                   | Petición                                                 | HTTP | Fecha (UTC)         | Resultado                                                                            |
| --- | ---------------------- | -------------------------------------------------------- | ---- | ------------------- | ------------------------------------------------------------------------------------ |
| 9   | Login del Supervisor   | `POST /api/v1/auth/login`                                | 200  | 2026-11-25 14:48:05 | Token recibido                                                                       |
| 10  | Login del Asesor 1     | `POST /api/v1/auth/login`                                | 200  | 2026-11-25 14:48:05 | Token recibido                                                                       |
| 11  | Subir como Supervisor  | `POST /api/v1/clientes/{id}/documentos`                  | 403  | 2026-11-25 14:48:06 | Esperado: solo asesor y auxiliar pueden subir (`docs/endpoints.md`)                  |
| 12  | Subir como Asesor 1    | `POST /api/v1/clientes/{id}/documentos`                  | 201  | 2026-11-25 14:48:06 | Estatus `por_confirmar`, `application/pdf`, clave `clientes/<uuid>/7-<marca>.pdf`    |
| 13  | Consultar el documento | `GET /api/v1/clientes/{id}/documentos/{docId}`           | 200  | 2026-11-25 14:48:06 | Registro encontrado                                                                  |
| 14  | Descargar              | `GET /api/v1/clientes/{id}/documentos/{docId}/descargar` | 200  | 2026-11-25 14:48:07 | 129 bytes, SHA-256 idéntico al original, `application/pdf`                           |
| 15  | Eliminar               | `DELETE /api/v1/clientes/{id}/documentos/{docId}`        | 404  | 2026-11-25 14:48:07 | **El endpoint no existe** (la API tiene listar, obtener, descargar, subir y revisar) |

### ¿Es Spaces y no el disco local?

Por comportamiento de la API, solo hay evidencia indirecta, no concluyente:

- Con `STORAGE_DRIVER=spaces` la API no arranca si falta alguna variable de Spaces, y arrancó (health 200).
- La subida (201) y la descarga idéntica pasaron por el adaptador configurado; con credenciales o bucket inválidos la escritura habría fallado.
- `.do/app.yaml` declara `STORAGE_DRIVER=spaces`; el valor real del panel no se leyó.

Para confirmarlo del todo hay que ver el objeto en el bucket (panel de Spaces o `s3cmd ls`, clave `clientes/<uuid>/7-<marca>.pdf`)
o reiniciar la app y volver a descargar el documento (el disco de App Platform es efímero; Spaces no).

## Pendiente

- **Documento de prueba sin borrar:** no hay endpoint de eliminación; queda en el bucket y en `documentos_cliente` hasta destruir el entorno de prueba (paso 6 de la guía, que vacía el bucket).
- El inicio de sesión con el Supervisor real de la nube (`SEED_SUPERVISOR_*`) sigue en 401; no afecta a la prueba con los ficticios.
