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

## Pendiente

- Subir y descargar un documento (Spaces) en la app desplegada: no se probó, escribiría en el almacenamiento.
- El inicio de sesión con el Supervisor real de la nube (`SEED_SUPERVISOR_*`) sigue en 401; no afecta a la prueba con los ficticios.
