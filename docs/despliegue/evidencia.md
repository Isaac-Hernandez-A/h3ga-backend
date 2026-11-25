# Evidencia de la prueba en la nube (paso 4 de la guía)

App: `https://h3ga-backend-2bbfj.ondigitalocean.app` · Prefijo de la API: `/api/v1` · Corrida del 2026-11-25 (hora UTC).
Sin secretos: no se registran contraseñas, tokens ni la URL de la base.

| #   | Prueba                            | Petición                                            | HTTP         | Fecha (UTC)         | Resultado                                                                           |
| --- | --------------------------------- | --------------------------------------------------- | ------------ | ------------------- | ----------------------------------------------------------------------------------- |
| 1   | Salud con base                    | `GET /api/v1/health/db`                             | 200          | 2026-11-25 13:28:33 | `{"status":"ok","base_de_datos":"ok"}`: la API conecta a la base con TLS verificado |
| 2   | Inicio de sesión del Supervisor   | `POST /api/v1/auth/login`                           | **401**      | 2026-11-25 13:28:34 | Rechazado: correo o contraseña incorrectos. **No hay token**                        |
| 3   | Listar clientes                   | `GET /api/v1/clientes`                              | no ejecutada |                     | Requiere token (bloqueada por la fila 2)                                            |
| 4   | Agenda                            | `GET /api/v1/agenda`                                | no ejecutada |                     | Requiere token (bloqueada por la fila 2)                                            |
| 5   | Avisos                            | `GET /api/v1/avisos`                                | no ejecutada |                     | Requiere token (bloqueada por la fila 2)                                            |
| 6   | PDF del F0 de un cliente ficticio | `GET /api/v1/clientes/{id}/diagnostico-inicial/pdf` | no ejecutada |                     | Requiere token (bloqueada por la fila 2)                                            |
| 7   | Swagger oculto                    | `GET /api/docs`                                     | 404          | 2026-11-25 13:28:34 | Correcto: en producción no se publica                                               |
| 8   | Swagger JSON oculto               | `GET /api/docs-json`                                | 404          | 2026-11-25 13:28:34 | Correcto                                                                            |

## Pendiente

Filas 2 a 6. El login responde 401 con el correo y la contraseña de `SEED_SUPERVISOR_*` del equipo local. Causas posibles, sin
confirmar: el Supervisor no se sembró en la base de la nube (paso 4.3 de la guía) o se sembró con otra contraseña.
Repetir las filas 2 a 6 cuando el Supervisor de la nube esté confirmado.
