# Actividad 6. Pruebas integrales: especificación y plan exprés

Fecha: 2026-11-17. Objetivo específico 9 de la Memoria. Requerimientos no funcionales que se contrastan: RNF-01 (agenda y avisos en menos de 5 s), RNF-02 (control de acceso en el backend), RNF-04 (operaciones atómicas), RNF-07 (usabilidad) y RNF-08 (Chrome). RNF-03 (HTTPS) y RNF-12 (despliegue) quedan para la Actividad 7.

## 1. Intención

Validar de punta a punta que el sistema (backend, frontend y la carga ETL) funciona de forma consistente, que el acceso por rol se respeta y que los tiempos de respuesta cumplen el RNF-01, con colecciones automatizadas en Postman y una sesión de aceptación con usuarios (UAT). Todo se hace en el entorno local de pruebas con datos ficticios; la Memoria debe decirlo.

## 2. Metas, no metas y antimetas

**Metas**

- Una colección de Postman versionada, ejecutable con Newman, que cubra flujos completos por rol y la matriz de acceso.
- Medir tiempos de respuesta (p50, p95 y máximo) de los endpoints clave con una base realista y compararlos con el RNF-01.
- Una tabla de escenarios integrales ligada a las pruebas automatizadas que los cubren y a su resultado.
- Una sesión de UAT con al menos una persona real, con guion, cédula de usabilidad (SUS) y resultados.

**No metas**

- Pruebas de carga o de estrés, seguridad ofensiva, ni pruebas en la nube (eso es la Actividad 7).
- Medir con muchos usuarios simultáneos.
- Cambiar código del producto para que las pruebas pasen. Si una prueba descubre un defecto, se reporta y solo se corrige si Isaac lo decide.

**Antimetas**

- Escribir una cifra de tiempo o un resultado de UAT que no se midió.
- Subir el umbral de una prueba para que pase.
- Presentar una sesión con una sola persona como validación representativa.

## 3. Enfoque

|                                                             | Descripción                                                                  | Resultado                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **A. Colección Postman con Newman sobre la API real local** | Flujos por rol más la matriz de acceso, con aserciones de estado y de tiempo | **Recomendado**: es lo que la Memoria prometió y se puede repetir |
| B. Solo consolidar lo que ya existe                         | Reunir las 717 pruebas del backend y las del frontend                        | No cumple lo prometido sobre Postman                              |
| C. Pruebas de carga con k6 o similar                        | Muchos usuarios simultáneos                                                  | Fuera de alcance por tiempo                                       |

## 4. Datos de prueba

Base `h3ga_test` con el catálogo y los usuarios de prueba (Supervisor, dos Asesores y un Auxiliar), los **44 clientes cargados por el ETL con el Excel ficticio** (así la carga ETL forma parte del escenario integral) y 1,000 eventos de agenda sembrados para el RNF-01, como en CP-43. Las contraseñas y tokens no se versionan.

## 5. Escenarios integrales (E1 a E10)

| ID  | Escenario                                                                                        | Cobertura prevista                                                  |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| E1  | Acceso y sesión por rol: login, token vencido o inválido, menú por rol                           | Newman (carpeta Acceso) y Playwright CF-15 a CF-22                  |
| E2  | Matriz de acceso: 119 rutas por rol, 403 y 404 donde corresponde                                 | Prueba existente `acceso-matriz` y Newman                           |
| E3  | Alta de cliente con 16 etapas y reasignación (Asesor y Supervisor)                               | Newman y Playwright CF-19                                           |
| E4  | Cambio de estatus con bitácora y avance atómicos (Bloqueado exige motivo, En proceso de 20 a 90) | Newman y pruebas del backend CP existentes                          |
| E5  | Documentos: subir, revisar y descargar; Auxiliar solo en clientes autorizados                    | Newman y Playwright CF-13                                           |
| E6  | F0: descarga del PDF (empieza con %PDF-)                                                         | Newman y Playwright CF-16                                           |
| E7  | F1 por pasos: avance de la etapa 1, PDF 409 con faltantes y 200 completo                         | Newman (cierra el hueco de la Actividad 4, que no tenía E2E del F1) |
| E8  | Agenda y avisos: compromiso a dos días genera aviso y se atiende                                 | Newman y Playwright CF-17 y CF-21                                   |
| E9  | Reportes: semanal, mensual y trimestral con su PDF                                               | Newman y Playwright CF-20                                           |
| E10 | Importación ETL por API: 200, 400, 403, simulacro y segunda corrida                              | Newman y pruebas CP-283 a CP-291                                    |

## 6. Tiempos de respuesta

Se ejecuta cada GET clave y cada paso de los flujos en 30 iteraciones. Se reporta p50, p95 y máximo por endpoint. Umbrales: **RNF-01, agenda y avisos menos de 5 s** (requerimiento); para los demás se reporta lo medido y se marca como referencia (1 s) sin que cuente como requerimiento. Se documenta el equipo, PostgreSQL local y el tamaño de los datos. Los tiempos no son los de la nube.

## 7. UAT

Sesión de 30 minutos con una persona real, con el sistema corriendo en la computadora de Isaac con los 44 clientes ficticios. Tareas por rol, cédula SUS de 10 preguntas, tiempo y observaciones por tarea. Si participa más de una persona, se reporta cada una. Si no hay sesión, la Memoria declara el UAT preparado y pendiente.

## 8. Evidencia (carpeta `docs/pruebas-integrales/`)

1. `escenarios.md` (E1 a E10 con prueba que los cubre y resultado)
2. `postman/coleccion.json`, `postman/entorno.json` (sin secretos) y el reporte de Newman (`newman-reporte.json` y `.html`)
3. `tiempos.csv` y `tiempos.md`
4. `resultados.md` con las cuatro corridas (backend, frontend unitarias, Playwright, Newman), cifras y tiempos
5. UAT: guion y cédula llenos (fuera del repositorio si traen nombres)
6. Captura del reporte HTML de Newman

## 9. Limitaciones a declarar

Entorno local y datos ficticios; tiempos de equipo local, sin red ni nube; una sola persona en el UAT (si es el caso); pruebas en Chrome; sin pruebas de carga; HTTPS y despliegue pendientes de la Actividad 7.
