# Defectos sembrados contra resultado de la importación

Corrida con el Excel ficticio `FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx` (huella SHA-256 `973a8f14ee97db7ae999d3426031c6e75ea9ce942540e3f6fd841a055168824a`). Datos ficticios; CURP y NSS aparecen enmascarados.

- Renglones leídos: 54. Cargados: 44. Rechazados: 10 (2 por duplicado en el archivo).
- Defectos sembrados: 36. Reflejados según su clase propuesta: 36 de 36.
- La columna "Valor limpio" del catálogo de defectos es el valor del renglón antes de sembrar el defecto, no el resultado esperado de la ETL: por ejemplo, un nombre sin acentos se carga tal cual, porque la ETL no inventa acentos.

| ID | Fila | Columna | Defecto | Valor sembrado | Clase propuesta | Resultado obtenido | ¿Coincide? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | 8 | B | Nombre en MAYÚSCULAS | RUBÉN JIMÉNEZ EUÁN | saneable | Cargado con ajustes: Nombre del cliente: nombre_propio; Teléfono: telefono_normalizado | Sí |
| 3 | 8 | D | Teléfono con paréntesis y guion | (987) 662-8360 | saneable | Cargado con ajustes: Nombre del cliente: nombre_propio; Teléfono: telefono_normalizado | Sí |
| 7 | 12 | B | Nombre en minúsculas, con espacios dobles y de más |   esteban  torres aguilar  | saneable | Cargado con ajustes: Nombre del cliente: espacios; Nombre del cliente: nombre_propio; Fecha ingreso: fecha_de_texto | Sí |
| 7 | 12 | F | Fecha de ingreso como texto dd/mm/aaaa | 20/03/2025 | saneable | Cargado con ajustes: Nombre del cliente: espacios; Nombre del cliente: nombre_propio; Fecha ingreso: fecha_de_texto | Sí |
| 10 | 15 | G | CURP en minúsculas | ••••••••••••••nf68 | saneable | Cargado con ajustes: Email: correo_normalizado; CURP: curp_normalizada | Sí |
| 10 | 15 | M | Correo en mayúsculas y con espacios |  MANUEL.DIAZ.90@EJEMPLO.TEST  | saneable | Cargado con ajustes: Email: correo_normalizado; CURP: curp_normalizada | Sí |
| 13 | 18 | B | Nombre sin acentos | Monica Jimenez Gutierrez | saneable | Cargado con ajustes: Régimen seguridad social: catalogo_normalizado | Sí |
| 13 | 18 | N | Régimen en minúsculas | imss | saneable | Cargado con ajustes: Régimen seguridad social: catalogo_normalizado | Sí |
| 16 | 21 | G | CURP con espacios internos | ••••••••••••••JXE8 | saneable | Cargado con ajustes: CURP: curp_normalizada; NSS: nss_normalizado | Sí |
| 16 | 21 | O | NSS con guiones | •••••••2845 | saneable | Cargado con ajustes: CURP: curp_normalizada; NSS: nss_normalizado | Sí |
| 19 | 24 | D | Teléfono con lada +52 y espacios | +52 998 607 9113 | saneable | Cargado con ajustes: Teléfono: telefono_normalizado; NSS: nss_normalizado | Sí |
| 19 | 24 | O | NSS con espacios | •••••••2136 | saneable | Cargado con ajustes: Teléfono: telefono_normalizado; NSS: nss_normalizado | Sí |
| 22 | 27 | D | Teléfono guardado como número | 9841994569 | saneable | Cargado con ajustes: Fecha ingreso: fecha_de_texto | Sí |
| 22 | 27 | F | Fecha de ingreso como texto aaaa-mm-dd | 2025-08-16 | saneable | Cargado con ajustes: Fecha ingreso: fecha_de_texto | Sí |
| 25 | 30 | H | Fecha de nacimiento como texto dd/mm/aaaa | 03/05/1968 | saneable | Cargado con ajustes: Fecha de nacimiento: fecha_de_texto; AFORE: catalogo_normalizado | Sí |
| 25 | 30 | T | AFORE en minúsculas | xxi banorte | saneable | Cargado con ajustes: Fecha de nacimiento: fecha_de_texto; AFORE: catalogo_normalizado | Sí |
| 28 | 33 | E | Asesor sin 'Lic.' y sin acento | Marco Hernandez | saneable | Cargado; la normalización es silenciosa y no deja ajuste anotado | Sí |
| 28 | 33 | O | NSS guardado como número | •••••••6195 | saneable | Cargado; la normalización es silenciosa y no deja ajuste anotado | Sí |
| 31 | 36 | D | Teléfono con espacios | 998 829 0920 | saneable | Cargado con ajustes: Teléfono: telefono_normalizado; Fecha ingreso: fecha_de_texto | Sí |
| 31 | 36 | F | Fecha de ingreso como texto dd-mmm-aaaa | 19-nov-2025 | saneable | Cargado con ajustes: Teléfono: telefono_normalizado; Fecha ingreso: fecha_de_texto | Sí |
| 33 | 38 | B | Mismo nombre y fecha de nacimiento que el ID 9, con otro CURP | Sergio Ruiz Vázquez | posible duplicado | Cargado con advertencia: posible_duplicado: mismo nombre y fecha de nacimiento que la fila 14, con otro CURP. | Sí |
| 33 | 38 | H | Mismo nombre y fecha de nacimiento que el ID 9, con otro CURP | 1975-03-20 | posible duplicado | Cargado con advertencia: posible_duplicado: mismo nombre y fecha de nacimiento que la fila 14, con otro CURP. | Sí |
| 34 | 39 | R | Semanas a recuperar con texto en vez de número | N/D | advertencia | Cargado con advertencias: Semanas a recuperar: semanas_no_numericas: las semanas no son un número y se cargan en 0. | Sí |
| 38 | 43 | AB/AE | Estatus En proceso con avance 10 (fuera de 20 a 90) | En proceso asesor / 10 | advertencia | Cargado con advertencias: Etapa 1: avance_fuera_de_rango: En proceso va de 20 a 90; se lleva al valor más cercano. | Sí |
| 40 | 45 | P | Ley probable fuera del catálogo | Ley 71 | advertencia | Cargado con advertencias: Ley probable: ley_desconocido: el ley probable no está en el catálogo; se carga "No determinado". | Sí |
| 42 | 47 | BP/BS | Avance 55 fuera del catálogo (0 a 100 de 10 en 10) | En proceso cliente / 55 | advertencia | Cargado con advertencias: Etapa 11: avance_no_multiplo_de_10: el avance no es múltiplo de 10 y se carga tal cual. | Sí |
| 44 | 49 | G | CURP de 17 caracteres | •••••••••••••JVFT | rechazo | Rechazado: CURP: La CURP no tiene el formato oficial de 18 caracteres. | Sí |
| 45 | 50 | G | CURP con mes 13 | ••••••••••••••ZC31 | rechazo | Rechazado: CURP: La CURP trae una fecha de nacimiento que no existe. | Sí |
| 46 | 51 | H | Fecha de nacimiento inexistente | 31/02/1968 | rechazo | Rechazado: Fecha de nacimiento: La fecha de nacimiento no tiene un formato de fecha válido (dd/mm/aaaa, aaaa-mm-dd o dd-mmm-aaaa). | Sí |
| 47 | 52 | O | NSS de 9 dígitos | •••••1726 | rechazo | Rechazado: NSS: El NSS no tiene exactamente 11 dígitos. | Sí |
| 48 | 53 | B | Nombre vacío | (vacío) | rechazo | Rechazado: Nombre del cliente: El nombre del cliente viene vacío. | Sí |
| 49 | 54 | E | Asesor que no existe en el catálogo | Lic. Pedro Gómez | rechazo | Rechazado: Asesor: Asesor sin equivalencia: Lic. Pedro Gómez. | Sí |
| 50 | 55 | AB/AE | Estatus que no existe en el catálogo | En trámite / 30 | rechazo | Rechazado: Etapa 1: El estatus de la etapa no está en el catálogo. | Sí |
| 52 | 57 | Q | Semanas IMSS reconocidas negativas | -35 | rechazo | Rechazado: Semanas IMSS reconocidas: Las semanas deben ser un número entero de 0 en adelante. | Sí |
| 53 | 58 | G | CURP igual al del ID 12 | ••••••••••••••VQG9 | duplicado | Rechazado: CURP duplicado en el archivo: ya aparece en la fila 17. | Sí |
| 54 | 59 | O | NSS igual al del ID 20 | •••••••9650 | duplicado | Rechazado: NSS duplicado en el archivo: ya aparece en la fila 25. | Sí |
