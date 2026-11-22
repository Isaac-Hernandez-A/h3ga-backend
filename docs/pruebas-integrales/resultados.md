# Resultados de las pruebas integrales (Actividad 6)

Fecha: 2026-11-17. Objetivo específico 9. Entorno local y datos ficticios, base `h3ga_test`. Equipo: Intel Core i5-1235U, 7.7 GB de RAM, Windows 11, Node.js 22.13, PostgreSQL 16 en Docker.

## Las cuatro corridas

| Suite                               | Pruebas                        | Pasan          | Fallan | Omitidas | Tiempo                                                   |
| ----------------------------------- | ------------------------------ | -------------- | ------ | -------- | -------------------------------------------------------- |
| Backend (Jest, `pnpm test:reporte`) | 738 en 75 suites               | 737            | 0      | 1        | 177.6 s de reloj (702 s sumando el tiempo de cada suite) |
| Frontend unitarias (Vitest)         | 455 en 30 archivos             | 455            | 0      | 0        | 69.9 s                                                   |
| Playwright (Chrome)                 | 8 (CF-15 a CF-22)              | 8              | 0      | 0        | 88 s (1.4 min), corrida final                            |
| Newman (colección de Postman)       | 464 peticiones, 544 aserciones | 544 aserciones | 0      | 0        | 42.2 s                                                   |

Notas de lectura:

- La corrida de Jest es la que ejecuta `pnpm test:reporte` (corre `jest --json` sobre todo el backend y regenera `docs/pruebas-resultados.md`). Se tomó como la corrida de Jest para no repetir los 3 minutos. Se ejecutó al mismo tiempo que Vitest en la misma computadora, por eso el tiempo sumado por suite (702 s) es mayor que el de la corrida anterior (404 s): las suites compitieron por CPU.
- La única prueba omitida de Jest es el generador de evidencia de la ETL (CP-347), que solo corre con `ETL_EVIDENCIA=1`.
- Los números de Vitest y Playwright salen del repositorio `h3ga-frontend` (con sus cambios sin versionar tal como estaban). Los casos de Playwright (CF-15 a CF-22) dependen de la API real: se corrieron contra la API arrancada con la base de pruebas y el Supervisor de `pnpm pruebas:datos`.
- Playwright, historial de corridas: la primera corrida dio 1 fallo (CF-15) y 7 sin correr por el modo serial; CF-16 a CF-22 corridos aparte pasaron 7 de 7 (64 s). Tras corregir el localizador de CF-15 (ver Defectos), CF-15 solo pasó (40 s) y la corrida completa dio 8 de 8 en 88 s. No se cambió el producto.
- Total de casos ejecutados, sin mezclar unidades: 738 de backend, 455 unitarias de frontend, 8 de navegador y 464 peticiones de Newman (544 aserciones). Las cifras de Newman son de la corrida del 2026-11-22 (matriz de 360 filas, con `GET /health/db`); las de Jest, Vitest y Playwright son las de la Actividad 6, y la corrida actual de Jest (80 suites, 782 pruebas) está en `docs/pruebas-resultados.md`.

## Newman en detalle

- 464 peticiones en 11 carpetas: 00 Salud (1), 01 Acceso (8), 02 Matriz de acceso (360), 03 Clientes y etapas (20), 04 Documentos (8), 05 F0 (4), 06 F1 por pasos (27), 07 Agenda y avisos (10), 08 Reportes (8), 09 ETL (9), 10 Consultas clave (9).
- 544 aserciones, 0 falladas. La corrida se repitió varias veces sobre datos recargados con `pnpm pruebas:datos` (y 3 iteraciones seguidas dentro de una misma corrida) con el mismo resultado.
- Matriz de acceso: 360 filas (120 rutas por 3 roles; la ruta nueva `GET /health/db` es pública y dio 200 en los tres roles). Regla: esperado 403 debe dar 403; "supera los guards" o ruta pública, un código distinto de 401 y 403. Códigos obtenidos: 158 de 403, 111 de 404, 73 de 200, 15 de 400 y 3 de 501. El detalle por fila está en `postman/matriz-resultados.csv`.
- Reportes: `postman/newman-reporte.json` (resumen por petición, sin cuerpos ni cabeceras) y `postman/newman-reporte.html`. Ninguno guarda contraseñas ni tokens: el ejecutor los elimina antes de escribir.
- Tiempos: `tiempos.md` y `tiempos.csv` (104 peticiones, 30 iteraciones). RNF-01: agenda y avisos con máximo de 87 ms contra el umbral de 5 s. No son tiempos de la nube.

## Defectos encontrados

1. **CF-15 tuvo un localizador ambiguo (Playwright, frontend). Corregido en la prueba, no en el producto.** En `tests/e2e/flujos.spec.ts`, `page.getByText('Estatus actualizado')` coincidía con 2 elementos: el aviso visible y la región de lectura de pantalla oculta del componente de avisos, y Playwright lo rechazaba por modo estricto. El cambio de estatus sí se hacía. La aserción de fondo no cambió (sigue verificando que el aviso aparece y es visible, mismo tiempo de espera); solo se volvió no ambigua con `getByText('Estatus actualizado', { exact: true })`. Con eso CF-15 pasa completo, incluido el historial de la etapa en pantalla, y no apareció otro fallo en ese flujo.
2. **Rutas todavía en 501.** `GET /catalogos/etapas` y `POST /clientes/:clienteId/etapas` siguen sin implementar (documentado en `docs/endpoints.md`). La matriz de acceso las registra como 501 en la columna "código obtenido". No es una regresión.

No se encontraron defectos del backend. Las fallas que aparecieron mientras se armaba la colección fueron errores de las propias pruebas y se corrigieron en ellas, sin tocar el producto ni bajar aserciones:

- Los 1,000 eventos sembrados usaban la fecha de la base (UTC) y no la de Cancún: un tercio quedaba a tres días y no generaba aviso. Se corrigió el script de datos.
- El sandbox de Postman no tiene `Intl`: la fecha a dos días se calcula con el desfase fijo de Cancún (UTC-5).
- En iteraciones repetidas, el "cliente ajeno" elegido era uno creado por la iteración anterior y ya autorizado al Auxiliar. Ahora se elige uno del ETL.
- La limpieza de datos no borraba las tablas hijas del F1; ahora sigue las llaves foráneas.

## Limitaciones

- Entorno local: sin red, sin nube, sin HTTPS (RNF-03) ni despliegue (RNF-12), que quedan para la Actividad 7.
- Datos ficticios: 44 clientes del Excel ficticio cargados por la ETL y 1,000 eventos de agenda; la base de pruebas conserva además clientes de otras suites de Jest.
- Solo Chrome en las pruebas de navegador (RNF-08).
- Sin pruebas de carga ni de estrés: una sola persona usando la API a la vez. Los tiempos son de un equipo local.
- La sesión de aceptación con usuarios (UAT, sección 7 de la especificación) no forma parte de estas corridas automatizadas.
- Las pruebas de navegador (Vitest y Playwright) viven en el repositorio del frontend; sus resultados aquí son la corrida de este día, no se versionan en este repositorio.
