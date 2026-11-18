# Tiempos de respuesta (Actividad 6)

Medición: 2026-11-18T02:22:48.382Z. 30 iteraciones de los flujos y las consultas clave de la colección de Postman, con Newman, contra la API local y la base de pruebas.

> **No son tiempos de la nube.** Se midieron en un equipo local, sin red ni balanceador, con una sola persona usando la API a la vez. Sirven para contrastar el RNF-01 en el entorno de pruebas, no para prometer tiempos en producción.

## Entorno

- CPU: 12th Gen Intel(R) Core(TM) i5-1235U (12 hilos lógicos)
- RAM: 7.7 GB
- Sistema: Windows_NT 10.0.26300 (x64)
- Node.js: v22.13.0
- PostgreSQL: PostgreSQL 16.15 (Debian 16.15-1.pgdg13+2) on x86_64-pc-linux-gnu (contenedor local de Docker)
- Datos antes de medir: 109 clientes, 706 etapas, 1000 eventos de agenda y 2 avisos (pnpm pruebas:datos carga 44 clientes del Excel ficticio por el ETL y 1,000 eventos del Asesor 1; el resto de los clientes quedó en h3ga_test por otras suites del backend, que no se borran).
- Datos después de medir: 139 clientes, 1186 etapas, 1030 eventos y 1074 avisos (los flujos crean un cliente, un evento y avisos por iteración).

## Cómo se calcula

Cada petición se ejecutó 30 veces (una por iteración, incluida la primera, que no se descarta aunque tenga el arranque en frío). Percentiles por rango más cercano: p50 y p95 son el valor en la posición ceil(p x n) de la muestra ordenada. "Máx" es el mayor tiempo observado.

- **Requerimiento (RNF-01):** agenda y avisos, menos de 5 s. Se evalúa contra el **máximo**.
- **Referencia:** 1 s para el resto, evaluada contra p95. No es un requerimiento; no se usó para aprobar o reprobar nada.

## RNF-01: agenda y avisos

| Petición                                                          | Método y ruta      | Códigos |   n | p50 (ms) | p95 (ms) | Máx (ms) | Umbral               |
| ----------------------------------------------------------------- | ------------------ | ------- | --: | -------: | -------: | -------: | -------------------- |
| GET /agenda del Asesor 1 con 1,000 eventos sembrados              | GET /api/v1/agenda | 200     |  30 |       22 |       36 |       50 | RNF-01 < 5000 ms: sí |
| GET /avisos del Asesor 1 con 1,000 eventos sembrados              | GET /api/v1/avisos | 200     |  30 |       41 |       65 |       92 | RNF-01 < 5000 ms: sí |
| GET /avisos: la cita a dos días genera su aviso                   | GET /api/v1/avisos | 200     |  30 |       46 |       79 |       95 | RNF-01 < 5000 ms: sí |
| GET /avisos: el compromiso de la etapa genera su aviso de trámite | GET /api/v1/avisos | 200     |  30 |       46 |       64 |       64 | RNF-01 < 5000 ms: sí |
| GET /agenda (Supervisor)                                          | GET /api/v1/agenda | 200     |  30 |       23 |       46 |       46 | RNF-01 < 5000 ms: sí |
| GET /avisos (Supervisor)                                          | GET /api/v1/avisos | 200     |  30 |       42 |       63 |       63 | RNF-01 < 5000 ms: sí |

## Las 10 peticiones con mayor p95

| Petición                                       | Método y ruta                                    | Códigos |   n | p50 (ms) | p95 (ms) | Máx (ms) | Umbral                        |
| ---------------------------------------------- | ------------------------------------------------ | ------- | --: | -------: | -------: | -------: | ----------------------------- |
| GET F1 en PDF completo: 200                    | GET /api/v1/clientes/:id/diagnostico/pdf         | 200     |  30 |      276 |      312 |      362 | referencia 1000 ms: sí (ref.) |
| GET F0 en PDF (Asesor 1)                       | GET /api/v1/clientes/:id/diagnostico-inicial/pdf | 200     |  30 |      248 |      289 |      395 | referencia 1000 ms: sí (ref.) |
| GET /reportes/pdf?periodo=mensual (Supervisor) | GET /api/v1/reportes/pdf                         | 200     |  30 |      234 |      283 |      288 | referencia 1000 ms: sí (ref.) |
| GET F0 en PDF (Auxiliar autorizado)            | GET /api/v1/clientes/:id/diagnostico-inicial/pdf | 200     |  30 |      236 |      277 |      282 | referencia 1000 ms: sí (ref.) |
| POST /etl/importaciones?simulacro=true         | POST /api/v1/etl/importaciones                   | 200     |  30 |       73 |      102 |      160 | referencia 1000 ms: sí (ref.) |
| POST /auth/login (Supervisor)                  | POST /api/v1/auth/login                          | 200     |  30 |       85 |       97 |      130 | referencia 1000 ms: sí (ref.) |
| POST /auth/login (Asesor 1)                    | POST /api/v1/auth/login                          | 200     |  30 |       84 |       97 |       98 | referencia 1000 ms: sí (ref.) |
| POST /auth/login con contraseña incorrecta     | POST /api/v1/auth/login                          | 401     |  30 |       84 |       95 |       95 | referencia 1000 ms: sí (ref.) |
| POST /auth/login (Asesor 2)                    | POST /api/v1/auth/login                          | 200     |  30 |       86 |       94 |      126 | referencia 1000 ms: sí (ref.) |
| POST /auth/login (Auxiliar)                    | POST /api/v1/auth/login                          | 200     |  30 |       84 |       91 |      100 | referencia 1000 ms: sí (ref.) |

## Todas las peticiones

El detalle completo está en `tiempos.csv` (104 peticiones).
