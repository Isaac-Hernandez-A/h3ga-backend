# Diccionario de datos H3GA (F0-F4)

> Convertido de `Diccionario de datos_F0-F4.docx`. Fuente única de verdad del esquema (ver CLAUDE.md).

## Diccionario de Datos Inicial

### Fuente: hoja "Clientes" del archivo FORMATO_CONTROL_OPERATIVO.xlsx · Stack destino: DigitalOcean (PostgreSQL gestionado, App Platform y DigitalOcean Spaces) con autenticación JWT en NestJS

### Tipos personalizados (ENUM)

estado_confirmacion = ('si', 'no', 'por_confirmar').

estado_civil = ('soltero', 'casado', 'divorciado', 'viudo', 'concubinato').

estatus_tramite = ('no_aplica', 'por_iniciar', 'en_proceso_cliente', 'en_proceso_asesor', 'en_proceso_instituto', 'finalizado', 'bloqueado', 'cancelado', 'detenido').

categoria_tramite = ('no_aplica', 'pendiente', 'en_proceso', 'completado', 'excepcion');

sexo_cliente = ('hombre', 'mujer');

objetivo_cliente = ('pensionarse_asap', 'mejorar_monto_pension', 'negativa_pension');

tipo_pension = ('cesantia', 'vejez', 'invalidez', 'viudez', 'otro').

evaluacion_modalidad = ('aplica', 'no_aplica', 'aplica_con_restricciones', 'requiere_regularizacion', 'temporal', 'evaluar', 'requiere_contabilidad')

estatus_inconsistencia = ('pendiente', 'en_tramite', 'recuperado', 'no_procedente')

validacion_estado = ('si', 'no', 'requiere_validar') -- usado también como 'requiere_validar' en Sección 7

conveniencia_pension = ('si', 'no', 'depende_escenario')

si_no_parcial = ('si', 'no', 'parcialmente')

aplicabilidad_recuperacion = ('si', 'no', 'requiere_mas_evidencia')

cumplimiento_criterio = ('cumple', 'no_cumple', 'requiere_validar')

evaluacion_retroactivo = ('conviene', 'no_conviene', 'conviene_parcialmente', 'requiere_calculo_validacion')

estatus_plan_accion = ('pendiente', 'en_proceso', 'hecho')

criterio_seleccion_nss = ('vinculo_curp', 'antiguedad', 'credito_infonavit', 'estatus_pension');

etapa_institucional_nss = ('ingreso_validacion', 'dictaminacion_imss', 'migracion_historial', 'notificacion_consar_infonavit');

tipo_aviso = ('cita', 'tramite');

estatus_evento_agenda = ('pendiente', 'cumplido', 'reagendado', 'cancelado');

estado_salud = ('bueno', 'regular', 'malo');

### Tabla: clientes

| Campo                       | Tipo de Dato                          | Descripción                                                                                                             |
| --------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| id                          | UUID(PK, default gen_random_uuid())   | Clave primaria UUID autogenerada en PostgreSQL (gen_random_uuid()).                                                     |
| nombre                      | TEXT                                  | Nombre(s) del cliente .                                                                                                 |
| apellido_paterno            | TEXT                                  | Apellido paterno del cliente.                                                                                           |
| apellido_materno            | TEXT                                  | Apellido materno del cliente.                                                                                           |
| referido_por                | TEXT                                  | Persona que canalizó al cliente hacia H3GA. Puede ser un cliente o cualquier persona externa.                           |
| telefono                    | TEXT                                  | Teléfono de contacto del cliente.                                                                                       |
| asesor_id                   | UUID(FK -> usuarios.id)               | Asesor de H3GA asignado al cliente (ej. Lic. Marco Hernández, Lic. Ana Hernández).                                      |
| fecha_ingreso               | DATE                                  | Fecha de registro del cliente.                                                                                          |
| correo_electronico          | TEXT                                  | Correo electrónico del cliente.                                                                                         |
| curp                        | VARCHAR(18) UNIQUE, NULLABLE          | Clave Única de Registro de Población.                                                                                   |
| rfc                         | VARCHAR(13), NULLABLE                 | Registro Federal de Contribuyentes.                                                                                     |
| fecha_nacimiento            | DATE                                  | Fecha de nacimiento del cliente.                                                                                        |
| estado_civil                | ENUM                                  | Casado(a), Soltero(a), Concubinato, Divorciado(a), Viudo(a).                                                            |
| dependientes_economicos     | INTEGER                               | Número de personas que dependen económicamente del cliente.                                                             |
| regimen_id                  | SMALLINT (FK -> regimen_principal.id) | IMSS, ISSSTE, Mixto (IMSS-ISSSTE), No determinado.                                                                      |
| nss                         | VARCHAR(11), NULLABLE                 | Número de Seguro Social.                                                                                                |
| ley_probable_id             | SMALLINT (FK -> ley_probable.id)      | Ley 73, Ley 97, Décimo Transitorio ISSSTE, Cuenta Individual ISSSTE, Mixto/revisar, No determinado.                     |
| semanas_imss_reconocidas    | INTEGER                               | Semanas cotizadas reconocidas por el IMSS.                                                                              |
| semanas_a_recuperar         | INTEGER, NULLABLE                     | Semanas que el cliente reclama como faltantes respecto a su Constancia de Semanas Cotizadas.                            |
| tiene_issste                | ENUM                                  | Indica si el cliente también cotiza/cotizó en ISSSTE. Sí, No, Por Confirmar.                                            |
| afore_id                    | SMALLINT (FK -> afore.id)             | Azteca, Profuturo, Citibanamex, Coppel, Inbursa, Invercap, PENSIONISSSTE, Principal, Sura, XXI Banorte.                 |
| observaciones_generales     | TEXT                                  | Notas libres sobre el cliente.                                                                                          |
| requiere_contadora          | ENUM                                  | Indica si el trámite del cliente requiere apoyo de contadora. Sí, No, Por confirmar.                                    |
| sexo                        | ENUM                                  | Hombre / Mujer.                                                                                                         |
| ocupacion                   | TEXT, NULLABLE                        | Ocupación del cliente.                                                                                                  |
| domicilio                   | TEXT                                  | Domicilio completo del cliente.                                                                                         |
| estado                      | TEXT                                  | Entidad federativa de residencia del cliente.                                                                           |
| subdelegacion_imss_probable | TEXT                                  | Subdelegación del IMSS que probablemente le corresponde al cliente según su domicilio.                                  |
| cambio_afore                | ENUM                                  | Indica si el cliente solicitó/solicitará cambio de AFORE. Sí, No, Por Confirmar.                                        |
| ine                         | VARCHAR(18), NULLABLE                 | Clave de elector (INE).                                                                                                 |
| objetivo_cliente            | ENUM                                  | Qué busca el cliente: pensionarse lo antes posible, mejorar el monto de su pensión, o resolver una negativa de pensión. |

### Tabla: documentos_clientes (Se relaciona con la tabla cliente)

| Campo                   | Tipo de Dato                         | Descripción                                                                                                                  |
| ----------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| id                      | UUID (PK, default gen_random_uuid()) | Clave primaria.                                                                                                              |
| cliente_id              | UUID (FK -> clientes.id)             | Cliente al que pertenece el documento.                                                                                       |
| tipo_documento_id       | SMALLINT (FK -> tipo_documento.id)   | Tipo de documento.Acta de nacimiento, CURP, INE, Comprobante de domicilio, RFC, Semanas cotizadas.                           |
| archivo_path            | TEXT                                 | Ruta o clave del objeto dentro del bucket privado de DigitalOcean Spaces (ej. clientes/{cliente_id}/constancia_semanas.pdf). |
| nombre_archivo_original | TEXT                                 | Nombre con el que el usuario subió el archivo.                                                                               |
| mime_type               | TEXT                                 | Tipo de archivo (application/pdf, image/jpeg, etc.).                                                                         |
| estatus                 | ENUM                                 | Estado de entrega/revisión del documento.Sí, No, Por confirmar.                                                              |
| numero_referencia       | TEXT, NULLABLE                       | Número de folio o referencia del documento, cuando aplica.                                                                   |
| fecha_carga             | TIMESTAMPTZ                          | Fecha y hora en que se subió el archivo.                                                                                     |
| subido_por              | UUID (FK -> usuarios.id)             | Quién subió el documento.                                                                                                    |
| observaciones           | TEXT, NULLABLE                       | Observaciones sobre la recepción o validación del documento (Sección 2 del F1).                                              |

### Tabla: regimen_principal

| Campo  | Tipo de Dato                 | Descripción                             |
| ------ | ---------------------------- | --------------------------------------- |
| id     | SMALLINT (PK, autoincrement) | Identificador del régimen.              |
| nombre | TEXT                         | Nombre del régimen de seguridad social. |

Valores: IMSS, ISSSTE, Mixto IMSS-ISSSTE, Independiente, No determinado.

### Tabla: ley_probable

| Campo  | Tipo de Dato                 | Descripción                          |
| ------ | ---------------------------- | ------------------------------------ |
| id     | SMALLINT (PK, autoincrement) | Identificador de la ley/modalidad.   |
| nombre | TEXT                         | Nombre de la ley probable aplicable. |

Valores: Ley 73, Ley 97, Décimo Transitorio ISSSTE, Cuenta Individual ISSSTE, Mixto/revisar, No determinado.

### Tabla: afore

| Campo  | Tipo de Dato                 | Descripción                                           |
| ------ | ---------------------------- | ----------------------------------------------------- |
| id     | SMALLINT (PK, autoincrement) | Identificador de la AFORE.                            |
| nombre | TEXT                         | Nombre de la administradora de fondos para el retiro. |

Valores: Azteca, Profuturo, Citibanamex, Coppel, Inbursa, Invercap, PENSIONISSSTE, Principal, Sura, XXI Banorte.

### Tabla: etapas_proceso

| Campo       | Tipo de Dato                 | Descripción                                                             |
| ----------- | ---------------------------- | ----------------------------------------------------------------------- |
| id          | SMALLINT (PK, autoincrement) | Identificador de la etapa.                                              |
| numero_paso | SMALLINT, NOT NULL UNIQUE    | Número de la etapa según el orden real del proceso de negocio (0 a 15). |
| nombre      | TEXT                         | Nombre de la etapa del trámite.                                         |

Valores (0 a 15): Diagnóstico inicial, Diagnóstico especializado, Corrección de datos personales, Unificación de NSS, Aclaración/recuperación de semanas, Estrategia Modalidad 10, Estrategia Modalidad 40, Modalidad 40 retroactiva, IMSS-ISSSTE/doble pensión, Unificación AFORE/cuentas, SAR 92, Solicitud de pensión, Negativa de pensión/recuperación de recursos, Juicio/Jurisdicción, Cobranza Final, Finalización.

### Tabla: etapas_tramite

| Campo             | Tipo de Dato                         | Descripción                                                                                                                                                                                             |
| ----------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                | UUID (PK, default gen_random_uuid()) | Identificador único del registro                                                                                                                                                                        |
| cliente_id        | UUID(FK -> clientes.id)              | Cliente al que pertenece esta etapa.                                                                                                                                                                    |
| etapa_id          | smallint (FK -> etapas_proceso.id)   | Cuál de las 16 etapas es (0 a 15).                                                                                                                                                                      |
| estatus_id        | smallint (FK -> estatus_tramite.id)  | Estatus actual. Default: Por iniciar, o No aplica si no corresponde a la estrategia del cliente                                                                                                         |
| avance_porcentaje | smallint, NOT NULL, default 0        | % de avance de esta etapa.                                                                                                                                                                              |
| accion_a_realizar | TEXT, NULLABLE                       | Acción pendiente para avanzar esta etapa.                                                                                                                                                               |
| fecha_compromiso  | DATE, NULLABLE                       | Fecha comprometida para resolver la acción pendiente                                                                                                                                                    |
| fecha_completada  | DATE, NULLABLE                       | Se llena automáticamente cuando estatus_id pasa a Finalizado.                                                                                                                                           |
| reactivado_en     | TIMESTAMPTZ, NULLABLE                | Se llena cuando la etapa regresa de Bloqueado/Cancelado/Detenido a un estatus activo. Sirve para que el asesor identifique rápido "esto se reactivó" y revise expediente/documentos antes de continuar. |
| creado_el         | TIMESTAMPTZ                          | Auditoría                                                                                                                                                                                               |
| actualizado_el    | TIMESTAMPTZ                          | Auditoría                                                                                                                                                                                               |
| motivo_rechazo    | TEXT, NULLABLE                       | Solo aplica cuando estatus_id = Bloqueado. Distingue un bloqueo por error de documentación de otros tipos de bloqueo institucional.                                                                     |

Restricción de integridad: UNIQUE (cliente_id, etapa_id) — evita registrar dos veces la misma etapa para un mismo cliente.

Regla de negocio para avance_porcentaje en etapas_tramite (se aplica en la capa de aplicación al cambiar estatus_id):

No aplica: avance_porcentaje no se usa para el cálculo global, pero el checkbox se marca como resuelto.

Por iniciar: avance_porcentaje se fuerza a 10.

En proceso cliente / En proceso asesor / En proceso Instituto: el asesor edita avance_porcentaje libremente entre 20 y 90.

Finalizado: avance_porcentaje se fuerza a 100, se llena fecha_completada.

Bloqueado / Cancelado / Detenido: avance_porcentaje no se modifica — se queda "congelado" en el último valor antes de la transición. La UI lo muestra en un color distinto o la barra se deshabilita, pero el número se conserva.

Reactivación (de excepcion a cualquier estatus activo): se llena reactivado_en con la fecha/hora; avance_porcentaje sigue partiendo del valor congelado — el asesor lo puede ajustar desde ahí, no desde 0, una vez que revisó que documentos/expediente sigan vigentes.

### Tabla: etapas_tramite_historial

| Campo               | Tipo de Dato                                  | Descripción                                |
| ------------------- | --------------------------------------------- | ------------------------------------------ |
| id                  | UUID (PK, default gen_random_uuid())          | Clave primaria.                            |
| etapa_tramite_id    | UUID (FK -> etapas_tramite.id)                | Etapa afectada.                            |
| estatus_anterior_id | SMALLINT, NULLABLE (FK -> estatus_tramite.id) | NULL en el primer registro.                |
| estatus_nuevo_id    | SMALLINT (FK -> estatus_tramite.id)           | Nuevo estatus asignado.                    |
| motivo_rechazo      | TEXT, NULLABLE                                | Se llena cuando estatus_nuevo = Bloqueado. |
| cambiado_por        | UUID (FK -> usuarios.id)                      | Usuario que realizó el cambio.             |
| fecha_cambio        | TIMESTAMPTZ, DEFAULT now()                    | Fecha y hora del cambio de estatus.        |

Se llena con un trigger o desde NestJS cada vez que cambia estatus_id. La tasa de rechazo se calcula contando filas de este historial con motivo_rechazo no nulo. etapas_tramite.motivo_rechazo puede quedarse como "último motivo".

### Tabla: tipo_documento

| Campo  | Tipo de Dato                | Descripción                          |
| ------ | --------------------------- | ------------------------------------ |
| id     | SMALLINT(PK, autoincrement) | Identificador del tipo de documento. |
| nombre | TEXT, NOT NULL, UNIQUE      | Nombre descriptivo del documento.    |

Valores del catálogo (Actualizados):

Acta de Nacimiento

CURP

INE

Comprobante de Domicilio

RFC

Constancia de Semanas Cotizadas (IMSS)

Reporte de semanas cotizadas

Estado de Cuenta AFORE (Nuevo por F1)

Historial Laboral / Reporte Detallado IMSS (Nuevo por F1)

Comprobantes de pagos Modalidad 10 (Nuevo por F1 Actualizado)

Comprobantes de pagos Modalidad 40 / 40 retroactivo (Nuevo por F1 Actualizado)

Resoluciones, Negativas o Trámites Previos (Nuevo por F1)

Recibos de Nómina / Constancias Laborales (Nuevo por F1)

Semanas ISSSTE / Constancia de Portabilidad (Nuevo por F1)

Certificación de regularización y/o corrección de datos personales del asegurado (IMSS) (Nuevo por Correcciones F3, id 15)

Constancia de Aclaración de Semanas Cotizadas (IMSS) (Nuevo por Correcciones F4, id 16)

Solicitud de Reintegro de Recursos (AFORE) (Nuevo por Correcciones F4, id 17)

### Tabla: roles

| Campo       | Tipo de Dato                  | Descripción                                                                  |
| ----------- | ----------------------------- | ---------------------------------------------------------------------------- |
| id          | SMALLINT, (PK, autoincrement) | Identificador del rol.                                                       |
| nombre      | TEXT                          | Nombre del rol: Asesor, Auxiliar Administrativo, Supervisor Operativo(Admin) |
| descripcion | TEXT, NULLABLE                | Alcance y permisos del rol dentro de la plataforma.                          |

### Tabla: tipos_asesor

| Campo       | Tipo de Dato                  | Descripción                               |
| ----------- | ----------------------------- | ----------------------------------------- |
| id          | SMALLINT (PK, autoincrement)  | Identificador del tipo de asesor.         |
| nombre      | VARCHAR(50), NOT NULL, UNIQUE | Nombre del tipo de asesor.                |
| descripcion | TEXT, NULLABLE                | Descripción opcional del tipo de asesor.  |
| activo      | BOOLEAN, DEFAULT true         | Indica si el tipo de asesor está vigente. |

### Tabla: usuarios

| Campo              | Tipo de Dato                               | Descripción                                                                                                                                                                |
| ------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                 | UUID (PK, default gen_random_uuid())       | Identificador único del usuario gestionado en PostgreSQL; se incluye en el payload del token JWT emitido por NestJS para autenticación y control de acceso por rol (RBAC). |
| rol_id             | SMALLINT, NOT NULL, (FK -> roles.id)       | Nombre del rol: Asesor, Auxiliar Administrativo (Auxiliar), Supervisor Operativo (Admin).                                                                                  |
| tipo_asesor_id     | SMALLINT, NULLABLE (FK -> tipos_asesor.id) | Tipo de asesor. Solo aplica cuando el rol es Asesor; para Auxiliar y Supervisor queda en NULL.                                                                             |
| nombre             | TEXT                                       | Nombre(s) del usuario.                                                                                                                                                     |
| apellido_paterno   | TEXT                                       | Apellido paterno.                                                                                                                                                          |
| apellido_materno   | TEXT                                       | Apellido materno.                                                                                                                                                          |
| correo_electronico | TEXT, NOT NULL, UNIQUE                     | Correo electrónico de acceso utilizado para la autenticación JWT en NestJS.                                                                                                |
| contrasena_hash    | VARCHAR(255)                               | Contraseña del usuario.                                                                                                                                                    |
| activo             | BOOLEAN, DEFAULT true                      | Permite desactivar el acceso sin borrar el historial.                                                                                                                      |
| fecha_creacion     | TIMESTAMPTZ                                | Fecha en que se creó el usuario.                                                                                                                                           |

### Tabla: estatus_tramite

| Campo                   | Tipo de Dato             | Descripción                                                                                            |
| ----------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------ |
| id                      | SMALLINT (PK)            | Identificador del estatus.                                                                             |
| nombre                  | TEXT                     | Nombre del estatus                                                                                     |
| descripcion             | TEXT                     | Descripción operativa (definida por H3GA).                                                             |
| categoria               | ENUM (categoria_tramite) | No aplica / Pendiente / En proceso / Completado / Excepcion                                            |
| avance_porcentaje_fijo  | SMALLINT, NULLABLE       | Valor automático para pendiente y completado. NULL para en_proceso (editable) y excepcion (congelado). |
| avance_editable         | BOOLEAN                  | true solo para categoría en_proceso — es cuando el asesor puede mover el %                             |
| avance_min / avance_max | SMALLINT, NULLABLE       | Rango permitido cuando avance_editable = true. Actualmente 20–90.                                      |

Datos:

| id  | nombre               | categoria  | avance_porcentaje_fijo | editable | rango |
| --- | -------------------- | ---------- | ---------------------- | -------- | ----- |
| 1   | No aplica            | no_aplica  | —                      | no       | —     |
| 2   | Por iniciar          | pendiente  | 10                     | no       | —     |
| 3   | En proceso cliente   | en_proceso | —                      | sí       | 20–90 |
| 4   | En proceso asesor    | en_proceso | —                      | sí       | 20–90 |
| 5   | En proceso Instituto | en_proceso | —                      | sí       | 20–90 |
| 6   | Finalizado           | completado | 100                    | no       | —     |
| 7   | Bloqueado            | excepcion  | — (congelado)          | no       | —     |
| 8   | Cancelado            | excepcion  | — (congelado)          | no       | —     |
| 9   | Detenido             | excepcion  | — (congelado)          | no       | —     |

## Etapa 0 — Diagnóstico Inicial

Fuente: formulario Diagnóstico_Inicial_VF2.docx. Es el expediente que se llena cuando un cliente entra a H3GA; el software debe poder capturarlo y, según el usuario, también generar una versión en PDF para imprimir y entregar al cliente (nota de diseño para el frontend — no afecta el esquema).

### Tabla: historial_laboral

| Campo             | Tipo de Dato                         | Descripción                                                                        |
| ----------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| id                | UUID (PK, default gen_random_uuid()) | Clave primaria.                                                                    |
| cliente_id        | UUID (FK -> clientes.id), UNIQUE     | Cliente al que pertenece.                                                          |
| semanas_issste    | INTEGER                              | Semanas cotizadas reconocidas por el ISSSTE.                                       |
| salario_promedio  | NUMERIC(10,2)                        | Salario base promedio del cliente.                                                 |
| ultimo_patron     | TEXT                                 | Nombre del último patrón/empleador del cliente.                                    |
| vigencia_derechos | ENUM                                 | Si el cliente tiene vigentes sus derechos ante el instituto.Sí, No, Por confirmar. |
| activo            | BOOLEAN, DEFAULT true                | Permite desactivar el acceso sin borrar el historial.                              |

### Tabla: tipo_correccion

| Campo  | Tipo de Dato                 | Descripción                                                                                                                                                                                                    |
| ------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id     | SMALLINT (PK, autoincrement) | Identificador del tipo de corrección.                                                                                                                                                                          |
| nombre | TEXT                         | Nombre del trámite de corrección en el catálogo F2 (CURP, RFC, Acta de Nacimiento, Nombre/Apellidos, Fecha/Lugar de Nacimiento, Sexo, Unificación NSS, AFORE, Actualización IMSS/SINDO, Domicilio, INE, Otro). |

Valores del catálogo F2 (opciones completas): 1. Corrección de CURP · 2. Corrección de RFC · 3. Corrección de Acta de Nacimiento · 4. Corrección de Nombre y/o Apellidos · 5. Corrección de Fecha o Lugar de Nacimiento · 6. Corrección de Sexo / Género · 7. Unificación de NSS (Duplicidad / Multiplicidad) · 8. Corrección de Datos en AFORE · 9. Regularización / Actualización de Datos ante IMSS (SINDO) · 10. Corrección de Domicilio · 11. Corrección de Clave de Elector (INE) · 12. Otro.

### Tabla: correcciones_cliente (Nota de regla de negocio: al concluir la corrección, el valor validado en dato_correcto actualiza automáticamente el expediente principal del cliente en la tabla clientes).

| Campo              | Tipo de Dato                         | Descripción                                                                                                                                                                                                               |
| ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                 | UUID (PK, default gen_random_uuid()) | Clave primaria.                                                                                                                                                                                                           |
| cliente_id         | UUID (FK -> clientes.id)             | Cliente al que pertenece la corrección.                                                                                                                                                                                   |
| tipo_correccion_id | SMALLINT (FK → tipo_correccion.id)   | Qué tipo de corrección es.                                                                                                                                                                                                |
| observaciones      | TEXT, NULLABLE                       | Notas sobre esta corrección específica.                                                                                                                                                                                   |
| tiempo_promedio    | TEXT, NULLABLE                       | Tiempo promedio estimado para resolver esta corrección.                                                                                                                                                                   |
| dato_actual        | TEXT, NULLABLE                       | Valor reportado actualmente por el IMSS ("Dice"), ej. CURP, RFC, nombre, fecha de nacimiento, NSS o AFORE con inconsistencia.                                                                                             |
| dato_correcto      | TEXT, NULLABLE                       | Valor validado según documentos probatorios ("Debe decir"). Al concluir la corrección (estatus Finalizado), este dato_correcto actualiza automáticamente el campo correspondiente en el expediente principal del cliente. |

### Tabla: unificacion_nss_detalle

| Campo                      | Tipo de Dato                                                                                     | Descripción                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| id                         | UUID (PK, default gen_random_uuid())                                                             | Clave primaria.                                           |
| correccion_id              | UUID (FK -> correcciones_cliente.id), UNIQUE                                                     | Corrección a la que pertenece el detalle de unificación.  |
| nss_principal_elegido      | VARCHAR(11)                                                                                      | Número de Seguro Social seleccionado como principal.      |
| criterio_seleccion         | ENUM (vinculo_curp, antiguedad, credito_infonavit, estatus_pension)                              | Criterio o justificación para elegir dicho NSS principal. |
| etapa_institucional_actual | ENUM(ingreso_validacion, dictaminacion_imss, migracion_historial, notificacion_consar_infonavit) | Estado o avance actual del trámite ante el instituto.     |

### Tabla: unificacion_nss_secundarios

| Campo          | Tipo de Dato                            | Descripción                                                  |
| -------------- | --------------------------------------- | ------------------------------------------------------------ |
| id             | UUID (PK, default gen_random_uuid())    | Clave primaria.                                              |
| unificacion_id | UUID (FK -> unificacion_nss_detalle.id) | Detalle de unificación al que pertenece este NSS secundario. |
| nss            | VARCHAR(11)                             | NSS secundario detectado que se absorberá al principal.      |
| observaciones  | TEXT, NULLABLE                          | Observaciones o notas sobre este NSS secundario.             |

## Etapa 1 — Diagnóstico Especializado

### Actualización 2026-11-13: tipos de documento del módulo Correcciones (migración 202611131000)

`tipo_documento` suma tres tipos al final del catálogo (ids 15, 16 y 17, en este orden): «Certificación de regularización y/o corrección de datos personales del asegurado (IMSS)» (documento de la F3 Unificación de NSS), «Constancia de Aclaración de Semanas Cotizadas (IMSS)» y «Solicitud de Reintegro de Recursos (AFORE)» (documentos de la F4 Recuperación de semanas). Se suben con `POST /clientes/:id/documentos` como los demás. La migración no inserta un nombre que ya exista.

### Actualización 2026-11-11: guardado por pasos del F1 (migración 202611111000)

El asistente del F1 guarda sección por sección, así que el diagnóstico es un borrador hasta descargar el PDF. Cambios
(solo se relaja NOT NULL; no se elimina ninguna columna ni dato):

- `diagnostico_especializado`: pasan a NULLABLE `cotizo_antes_julio_1997`, `tipo_pension_probable`, `edad_objetivo_pension`,
  `tiene_conservacion_derechos`, `dentro_de_conservacion`, `conviene_pensionar_ahora`, `semanas_efectivas_pension`,
  `trabaja_cuenta_propia`, `conclusion_modalidad_10`, `dado_de_baja_regimen_obligatorio`, `conclusion_modalidad_40` y
  `justificacion_estrategia`. Se conservan NOT NULL `id`, `cliente_id`, `asesor_id` y `fecha_analisis`, y las columnas que ya
  tienen valor por omisión. Que el formato esté completo se valida al descargar el PDF (409 con la lista de faltantes).
- `situacion_patrimonial`: todas las columnas, salvo `id` y `diagnostico_f1_id`, pasan a NULLABLE.
- `escenario_pension`: `semanas_proyectadas`, `salario_promedio_proyectado`, `pension_mensual_estimada` e `incremento_mensual`
  pasan a NULLABLE; nueva columna `meses_modalidad_10`; índice único `(diagnostico_f1_id, orden)` y CHECK `orden` de 1 a 3.
- `analisis_modalidad40_retroactivo`: `dentro_de_plazo_reingreso` y `conclusion_retroactivo` pasan a NULLABLE.
- `situacion_patrimonial_hijos`: una fila por hijo; `numero_hijos` queda sin uso (el número de hijos es el número de filas).
- Nuevas: `tipo_documento_diagnostico` y `diagnostico_documentos` (abajo).

### Tabla: diagnostico_especializado

Fuente: Formato F1. Diagnóstico Especializado.docx (Etapa 1 del proceso de H3GA). Almacena el dictamen técnico, conservación de derechos y estrategias evaluadas por el asesor.

| Campo                              | Tipo de Dato                         | Descripción                                                                                                                  |
| ---------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| id                                 | UUID (PK, default gen_random_uuid()) | Clave primaria.                                                                                                              |
| cliente_id                         | UUID (FK -> clientes.id), UNIQUE     | Cliente al que pertenece el diagnóstico especializado.                                                                       |
| fecha_analisis                     | DATE, DEFAULT CURRENT_DATE           | Fecha en que se realizó el análisis técnico.                                                                                 |
| asesor_id                          | UUID (FK -> usuarios.id)             | Asesor que emitió el diagnóstico.                                                                                            |
| fecha_primera_cotizacion           | DATE, NULLABLE                       | Fecha de primer alta en el IMSS (clave para confirmar Ley 73 vs 97).                                                         |
| cotizo_antes_julio_1997            | BOOLEAN                              | Indica si cotizó antes del 1° de julio de 1997.                                                                              |
| tipo_pension_probable              | ENUM (tipo_pension)                  | Cesantía, Vejez, Invalidez, Viudez, Otro.                                                                                    |
| edad_objetivo_pension              | SMALLINT                             | Edad en la que el cliente planea pensionarse (ej. 60, 62, 65).                                                               |
| comentarios_cliente                | TEXT, NULLABLE                       | Comentarios del cliente sobre su objetivo.                                                                                   |
| observaciones_regimen              | TEXT, NULLABLE                       | Observaciones libres sobre el régimen determinado.                                                                           |
| fecha_ultima_baja                  | DATE, NULLABLE                       | Fecha de baja más reciente en el régimen obligatorio del IMSS.                                                               |
| ultimo_salario_cotizado            | NUMERIC(10,2), NULLABLE              | Último Salario Base de Cotización (SBC) registrado.                                                                          |
| fecha_vencimiento_conservacion     | DATE, NULLABLE                       | Fecha límite estimada de la conservación de derechos ante el IMSS.                                                           |
| tiene_conservacion_derechos        | ENUM (validacion_estado)             | Sí / No / Requiere validar.                                                                                                  |
| tiempo_estimado_conservacion_meses | INTEGER, NULLABLE                    | Duración estimada de la conservación de derechos, en meses.                                                                  |
| dentro_de_conservacion             | ENUM (validacion_estado)             | Reutiliza el mismo ENUM que tiene_conservacion_derechos (Sí/No/Requiere validar tienen los mismos 3 valores en la práctica). |
| requiere_reactivacion              | BOOLEAN, DEFAULT false               | Indica si el cliente perdió vigencia y debe volver a cotizar antes de pensionarse.                                           |
| conviene_pensionar_ahora           | ENUM (conveniencia_pension)          | Sí / No / Depende del escenario.                                                                                             |
| comentarios_conservacion           | TEXT, NULLABLE                       | Comentarios específicos de la sección de conservación de derechos (distintos de observaciones_regimen).                      |
| semanas_reconocidas_al_baja        | INTEGER, NULLABLE                    | Semanas reconocidas por el IMSS al momento de la baja más reciente.                                                          |
| semanas_descontadas                | INTEGER, DEFAULT 0                   | Semanas descontadas por retiros parciales (desempleo/matrimonio).                                                            |
| semanas_reintegradas               | INTEGER, DEFAULT 0                   | Semanas recuperadas o pagadas de vuelta a la AFORE.                                                                          |
| semanas_efectivas_pension          | INTEGER                              | Semanas netas útiles con las que se calculará la pensión.                                                                    |
| semanas_requeridas_pension         | INTEGER, NULLABLE                    | Semanas que exige la ley para tener derecho a pensión, contra la cual se compara semanas_efectivas_pension.                  |
| trabaja_cuenta_propia              | ENUM (si_no_parcial)                 | Sí / No / Parcialmente.                                                                                                      |
| actividad_economica                | TEXT, NULLABLE                       | Actividad económica del cliente si trabaja por cuenta propia.                                                                |
| ingreso_mensual_aproximado         | NUMERIC(10,2), NULLABLE              | Ingreso mensual aproximado reportado por el cliente.                                                                         |
| conclusion_modalidad_10            | ENUM (evaluacion_modalidad)          | Dictamen sobre la viabilidad de registrarlo como trabajador independiente.                                                   |
| comentarios_modalidad_10           | TEXT, NULLABLE                       | Comentarios de cierre de la sección de Modalidad 10.                                                                         |
| dado_de_baja_regimen_obligatorio   | ENUM (validacion_estado)             | Sí / No / Requiere validar.                                                                                                  |
| conclusion_modalidad_40            | ENUM (evaluacion_modalidad)          | Dictamen sobre la viabilidad de inscribirlo en Modalidad 40.                                                                 |
| salario_propuesto_m40              | NUMERIC(10,2), NULLABLE              | Salario diario propuesto para cotizar en Modalidad 40.                                                                       |
| meses_propuestos_m40               | SMALLINT, NULLABLE                   | Número de meses proyectados a pagar en Modalidad 40.                                                                         |
| evalua_retroactivo_m40             | BOOLEAN, DEFAULT false               | Indica si la estrategia contempla pago retroactivo en una sola exhibición.                                                   |
| comentarios_modalidad_40           | TEXT, NULLABLE                       | Comentarios de cierre de la sección de Modalidad 40.                                                                         |
| justificacion_estrategia           | TEXT                                 | Argumentación técnica y legal de por qué conviene dicha estrategia.                                                          |
| siguiente_paso_sugerido            | TEXT, NULLABLE                       | Siguiente paso sugerido por el asesor (distinto de justificacion_estrategia, que ya tienes).                                 |
| conclusion_financiera              | TEXT, NULLABLE                       | Conclusión del análisis financiero y retorno de inversión (Sección 11 del F1).                                               |
| firma_cliente_path                 | TEXT, NULLABLE                       | Ruta de la imagen de firma del cliente en DigitalOcean Spaces (si se firma digitalmente en pantalla).                        |
| firma_asesor_path                  | TEXT, NULLABLE                       | Ruta de la imagen de firma del asesor en DigitalOcean Spaces (si se firma digitalmente en pantalla).                         |
| fecha_firma                        | TIMESTAMPTZ, NULLABLE                | Fecha y hora de firma del diagnóstico (si se firma en pantalla).                                                             |
| creado_en                          | TIMESTAMPTZ, DEFAULT now()           | Fecha de registro en sistema.                                                                                                |
| actualizado_en                     | TIMESTAMPTZ, DEFAULT now()           | Fecha de última modificación del diagnóstico.                                                                                |

### Tabla: estrategia_recomendada_tipo (catálogo)

| Campo  | Tipo de Dato                 | Descripción                     |
| ------ | ---------------------------- | ------------------------------- |
| id     | SMALLINT (PK, autoincrement) | Identificador de la estrategia. |
| nombre | TEXT, NOT NULL, UNIQUE       | Texto de la estrategia.         |

Valores del catálogo: Pensionarse sin cambios - Solicitar recuperación/aclaración de semanas - Corregir datos personales o NSS - Inscribirse a Modalidad 10 - Inscribirse a Modalidad 40 - Inscribirse a Modalidad 40 con pago retroactivo - Reingresar o regularizar Modalidad 40 - Esperar y seguir cotizando con patrón - Estrategia mixta - No se recomienda realizar aportación adicional - Otro.

### Tabla: diagnostico_estrategias_recomendadas (puente, multi-select)

| Campo          | Tipo de Dato                                   | Descripción                                |
| -------------- | ---------------------------------------------- | ------------------------------------------ |
| diagnostico_id | UUID (FK → diagnostico_especializado.id)       | Diagnóstico al que pertenece la selección. |
| estrategia_id  | SMALLINT (FK → estrategia_recomendada_tipo.id) | Estrategia marcada.                        |
| detalle_otro   | TEXT, NULLABLE                                 | Solo si estrategia_id = "Otro"             |

PK compuesta: (diagnostico_id, estrategia_id).

### Tabla: objetivo_diagnostico (catálogo)

| Campo  | Tipo de Dato                 | Descripción                 |
| ------ | ---------------------------- | --------------------------- |
| id     | SMALLINT (PK, autoincrement) | Identificador del objetivo. |
| nombre | TEXT, NOT NULL, UNIQUE       | Texto del objetivo.         |

Valores del catálogo: Pensionarse lo antes posible · Maximizar pensión mensual · Negativa de pensión · Recuperar semanas no reconocidas · Reactivar conservación de derechos · Mejorar salario promedio · Evaluar Modalidad 40 · Evaluar Modalidad 10 / trabajador independiente · Evaluar pago retroactivo de Modalidad 40 · Regularizar historial IMSS · Determinar si conviene seguir trabajando · Otro

### Tabla: diagnostico_objetivos (tabla intermedia, selección múltiple)

| Campo          | Tipo de Dato                             | Descripción                                             |
| -------------- | ---------------------------------------- | ------------------------------------------------------- |
| diagnostico_id | UUID (FK → diagnostico_especializado.id) | Diagnóstico al que pertenece la selección.              |
| objetivo_id    | SMALLINT (FK → objetivo_diagnostico.id)  | Objetivo marcado.                                       |
| detalle_otro   | TEXT, NULLABLE                           | Texto libre, solo se llena cuando objetivo_id = "Otro". |

PK compuesta: (diagnostico_id, objetivo_id).

Nota: esto es independiente de clientes.objetivo_cliente (el ENUM de 3 valores que ya existe desde el Diagnóstico Inicial). Son objetivos de alcance distinto — uno es la intención general del cliente al entrar, el otro es el detalle multi-select que se levanta en el diagnóstico especializado. Se dejan ambos.

### Tabla: tipo_inconsistencia_detectada (catálogo)

| Campo  | Tipo de Dato                 | Descripción                 |
| ------ | ---------------------------- | --------------------------- |
| id     | SMALLINT (PK, autoincrement) | Identificador.              |
| nombre | TEXT, NOT NULL, UNIQUE       | Texto de la inconsistencia. |

Valores del catálogo: Hay periodos laborados no reconocidos, Hay duplicidad de NSS, Hay homonimia o datos personales incorrectos, Hay semanas descontadas sin explicación clara, Hay periodos con salario menor al real, Hay patrón desaparecido o sin registros completos, Hay posible portabilidad ISSSTE-IMSS, No se detectan inconsistencias relevantes, Otro.

### Tabla: diagnostico_inconsistencias_generales (puente)

| Campo          | Tipo de Dato                                     | Descripción               |
| -------------- | ------------------------------------------------ | ------------------------- |
| diagnostico_id | UUID (FK → diagnostico_especializado.id)         | Diagnóstico.              |
| tipo_id        | SMALLINT (FK → tipo_inconsistencia_detectada.id) | Tipo marcado.             |
| detalle_otro   | TEXT, NULLABLE                                   | Solo si tipo_id = "Otro". |

PK compuesta: (diagnostico_id, tipo_id).

### Tabla: analisis_recuperacion_semanas (1:1 con el diagnóstico)

| Campo          | Tipo de Dato                                     | Descripción                       |
| -------------- | ------------------------------------------------ | --------------------------------- |
| id             | UUID (PK, default gen_random_uuid())             | Clave primaria.                   |
| diagnostico_id | UUID (FK → diagnostico_especializado.id), UNIQUE | Diagnóstico al que pertenece.     |
| aplica         | ENUM (aplicabilidad_recuperacion)                | Sí / No / Requiere más evidencia. |
| observaciones  | TEXT, NULLABLE                                   | Observaciones de la sección.      |

aplicabilidad_recuperacion = ('si', 'no', 'requiere_mas_evidencia')

### Tabla: tipo_gestion_recuperacion (catálogo)

| Campo  | Tipo de Dato                 | Descripción                 |
| ------ | ---------------------------- | --------------------------- |
| id     | SMALLINT (PK, autoincrement) | Identificador.              |
| nombre | TEXT, NOT NULL, UNIQUE       | Nombre del tipo de gestión. |

Valores del catálogo: Aclaración de semanas cotizadas ante IMSS · Recuperación de semanas cotizadas ante PNT · Corrección de datos personales · Unificación de NSS · Revisión de semanas descontadas · Búsqueda de evidencia patronal · Portabilidad ISSSTE-IMSS · Otro

### Tabla: recuperacion_gestiones (puente)

| Campo           | Tipo de Dato                                 | Descripción                       |
| --------------- | -------------------------------------------- | --------------------------------- |
| analisis_id     | UUID (FK → analisis_recuperacion_semanas.id) | Análisis de recuperación.         |
| tipo_gestion_id | SMALLINT (FK → tipo_gestion_recuperacion.id) | Tipo de gestión marcado.          |
| detalle_otro    | TEXT, NULLABLE                               | Solo si tipo_gestion_id = "Otro". |

PK compuesta: (analisis_id, tipo_gestion_id).

### Tabla: tipo_evidencia_recuperacion (catálogo)

| Campo  | Tipo de Dato                 | Descripción                   |
| ------ | ---------------------------- | ----------------------------- |
| id     | SMALLINT (PK, autoincrement) | Identificador.                |
| nombre | TEXT, NOT NULL, UNIQUE       | Nombre del tipo de evidencia. |

Valores del catálogo: Recibos de nómina · Constancias laborales · Hojas rosas / avisos afiliatorios · Estados de cuenta AFORE / SAR · Contratos laborales · Credenciales o documentos del patrón · Declaraciones fiscales o comprobantes de pago · Otro

### Tabla: recuperacion_evidencias (puente)

| Campo             | Tipo de Dato                                   | Descripción                         |
| ----------------- | ---------------------------------------------- | ----------------------------------- |
| analisis_id       | UUID (FK → analisis_recuperacion_semanas.id)   | Análisis de recuperación.           |
| tipo_evidencia_id | SMALLINT (FK → tipo_evidencia_recuperacion.id) | Tipo de evidencia marcado.          |
| detalle_otro      | TEXT, NULLABLE                                 | Solo si tipo_evidencia_id = "Otro". |

PK compuesta: (analisis_id, tipo_evidencia_id).

### Tabla: objetivo_modalidad_10 (catálogo)

| Campo  | Tipo de Dato           | Descripción                            |
| ------ | ---------------------- | -------------------------------------- |
| id     | SMALLINT (PK)          | Identificador único del objetivo.      |
| nombre | TEXT, NOT NULL, UNIQUE | Nombre del objetivo para Modalidad 10. |

Valores del catálogo: Tener cobertura médica y prestaciones · Seguir generando semanas · Reactivar derechos · Mejorar continuidad de cotización · Evaluar transición posterior a Modalidad 40 · Otro

### Tabla: diagnostico_objetivos_m10 (puente)

| Campo          | Tipo de Dato                             | Descripción                   |
| -------------- | ---------------------------------------- | ----------------------------- |
| diagnostico_id | UUID (FK → diagnostico_especializado.id) | Diagnóstico al que pertenece. |
| objetivo_id    | SMALLINT (FK → objetivo_modalidad_10.id) | Objetivo marcado.             |
| detalle_otro   | TEXT, NULLABLE                           | Solo si objetivo_id = "Otro". |

PK compuesta: (diagnostico_id, objetivo_id).

### Tabla: modalidad10_criterios (evaluación de aplicabilidad, Sí/No por criterio fijo)

| Campo          | Tipo de Dato                              | Descripción                       |
| -------------- | ----------------------------------------- | --------------------------------- |
| id             | UUID (PK)                                 | Clave primaria.                   |
| diagnostico_id | UUID (FK -> diagnostico_especializado.id) | Diagnóstico.                      |
| criterio       | TEXT                                      | Texto del criterio.               |
| cumple         | BOOLEAN, NULLABLE                         | Sí (true) / No (false).           |
| observaciones  | TEXT, NULLABLE                            | Observación puntual del criterio. |

Criterios fijos: Tiene actividad independiente real - Tiene CURP, NSS y correo - Puede comprobar ingreso/actividad - Necesita servicios médicos IMSS - Busca generar semanas adicionales - Conviene frente a alta con patrón - Conviene frente a Modalidad 40

### Tabla: objetivo_modalidad_40 (catálogo)

| Campo  | Tipo de Dato                 | Descripción                            |
| ------ | ---------------------------- | -------------------------------------- |
| id     | SMALLINT (PK, autoincrement) | Identificador único del objetivo.      |
| nombre | TEXT, NOT NULL, UNIQUE       | Nombre del objetivo para Modalidad 40. |

Valores: Aumentar salario promedio - Completar semanas faltantes - Mejorar pensión Ley 73 - Mantener cotización para pensión - Reingresar tras baja por mora · Otro

### Tabla: diagnostico_objetivos_m40 (puente)

| Campo          | Tipo de Dato                              | Descripción                   |
| -------------- | ----------------------------------------- | ----------------------------- |
| diagnostico_id | UUID (FK -> diagnostico_especializado.id) | Diagnóstico al que pertenece. |
| objetivo_id    | SMALLINT (FK → objetivo_modalidad_40.id)  | Objetivo marcado.             |
| detalle_otro   | TEXT, NULLABLE                            | Solo si objetivo_id = "Otro". |

PK compuesta: (diagnostico_id, objetivo_id).

### Tabla: modalidad40_criterios (evaluación de requisitos, 3 estados)

| Campo          | Tipo de Dato                              | Descripción                                      |
| -------------- | ----------------------------------------- | ------------------------------------------------ |
| id             | UUID (PK)                                 | Clave primaria.                                  |
| diagnostico_id | UUID (FK -> diagnostico_especializado.id) | Diagnóstico.                                     |
| criterio       | TEXT                                      | Texto del criterio (lista fija de 7, ver abajo). |
| cumplimiento   | ENUM (cumplimiento_criterio)              | Cumple / No cumple / Requiere validar.           |
| observaciones  | TEXT, NULLABLE                            | Observación puntual.                             |

cumplimiento_criterio = ('cumple', 'no_cumple', 'requiere_validar')

Criterios fijos: Cuenta con baja del régimen obligatorio - Tiene al menos 52 semanas en los últimos 5 años previos a baja - No han pasado más de 5 años desde la baja - Salario elegido no es menor al último salario registrado - Salario elegido no excede el tope permitido - Entiende que Modalidad 40 no otorga servicio médico - Puede cubrir pagos mensuales adelantados.

evalua_retroactivo_m40 (que ya tienes) queda como bandera rápida de sí/no se evaluó. Todo el detalle vive aquí:

### Tabla: analisis_modalidad40_retroactivo (1:1 con el diagnóstico)

| Campo                              | Tipo de Dato                                      | Descripción                                                                     |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| id                                 | UUID (PK, default gen_random_uuid())              | Clave primaria.                                                                 |
| diagnostico_id                     | UUID (FK -> diagnostico_especializado.id), UNIQUE | Diagnóstico al que pertenece.                                                   |
| fecha_propuesta_inicio_m40         | DATE, NULLABLE                                    | Fecha propuesta de inicio de Modalidad 40 retroactiva.                          |
| fecha_solicitud                    | DATE, NULLABLE                                    | Fecha en que se solicitaría el trámite.                                         |
| meses_retroactivos_estimados       | SMALLINT, NULLABLE                                | Meses que se pagarían de forma retroactiva.                                     |
| salario_diario_propuesto           | NUMERIC(10,2), NULLABLE                           | Salario diario propuesto para el cálculo retroactivo.                           |
| cuotas_estimadas                   | NUMERIC(12,2), NULLABLE                           | Cuotas estimadas a pagar.                                                       |
| recargos_actualizaciones_estimadas | NUMERIC(12,2), NULLABLE                           | Recargos y actualizaciones estimadas.                                           |
| total_estimado_pagar               | NUMERIC(12,2), NULLABLE                           | Total estimado (cuotas + recargos).                                             |
| baja_por_mora_previa               | BOOLEAN, NULLABLE                                 | ¿Existe baja por mora previa?                                                   |
| dentro_de_plazo_reingreso          | ENUM (validacion_estado)                          | ¿Está dentro de plazo para reingreso, si aplica?                                |
| conclusion_retroactivo             | ENUM (evaluacion_retroactivo)                     | Conviene / No conviene / Conviene parcialmente / Requiere cálculo y validación. |
| comentarios                        | TEXT, NULLABLE                                    | Comentarios de cierre.                                                          |

evaluacion_retroactivo = ('conviene', 'no_conviene', 'conviene_parcialmente', 'requiere_calculo_validacion')

### Tabla: retroactivo_evaluacion_conveniencia

| Campo          | Tipo de Dato                                    | Descripción                             |
| -------------- | ----------------------------------------------- | --------------------------------------- |
| id             | UUID (PK)                                       | Clave primaria.                         |
| retroactivo_id | UUID (FK → analisis_modalidad40_retroactivo.id) | Análisis al que pertenece.              |
| pregunta       | TEXT                                            | Texto de la pregunta (lista fija de 6). |
| respuesta      | BOOLEAN, NULLABLE                               | Sí (true) / No (false).                 |

Preguntas fijas: ¿El retroactivo mejora salario promedio? - ¿El retroactivo agrega semanas útiles? - ¿Evita pérdida de conservación de derechos? - ¿Reduce tiempo para pensionarse? - ¿El costo se recupera con incremento de pensión? - ¿Hay riesgo de rechazo o ajuste por IMSS?

### Tabla: escenario_pension

Fuente: Sección 11 y 12 del F1 ("Escenarios y retorno de inversión"). Registra los datos capturados de los escenarios de pensión para comparación documental en el expediente del cliente.

| Campo                        | Tipo de Dato                              | Descripción                                                                                                                       |
| ---------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| id                           | UUID (PK, default gen_random_uuid())      | Identificador único del escenario.                                                                                                |
| diagnostico_f1_id            | UUID (FK -> diagnostico_especializado.id) | Diagnóstico al que corresponden estos cálculos.                                                                                   |
| nombre_escenario             | TEXT                                      | Nombre del escenario (ej. "Base sin estrategia", "Mod. 40 - 2 años", "Mod. 40 topada", "Retroactivo").                            |
| orden                        | SMALLINT                                  | Orden del escenario (0 = Escenario Base, 1, 2, 3...) para identificar la referencia contra la cual se calcula incremento_mensual. |
| semanas_proyectadas          | INTEGER                                   | Semanas acumuladas al llegar a la fecha de pensión.                                                                               |
| salario_promedio_proyectado  | NUMERIC(10,2)                             | Salario promedio de las últimas 250 semanas cotizadas.                                                                            |
| inversion_total_estimada     | NUMERIC(12,2), DEFAULT 0                  | Costo total de pagos a realizar (cuotas M40, recargos o semanas).                                                                 |
| pension_mensual_estimada     | NUMERIC(12,2)                             | Monto mensual estimado de la pensión a recibir.                                                                                   |
| incremento_mensual           | NUMERIC(12,2)                             | Diferencia positiva frente a la pensión base sin estrategia.                                                                      |
| meses_recuperacion_inversion | NUMERIC(6,1), NULLABLE                    | Meses estimados para recuperar lo invertido (Inversión ÷ Incremento).                                                             |
| beneficio_a_5_anios          | NUMERIC(12,2), NULLABLE                   | Total acumulado a cobrar en los primeros 5 años de pensión.                                                                       |
| beneficio_a_10_anios         | NUMERIC(12,2), NULLABLE                   | Total acumulado a cobrar a los 10 años de pensión.                                                                                |
| beneficio_a_15_anios         | NUMERIC(12,2), NULLABLE                   | Total acumulado a cobrar a los 15 años de pensión.                                                                                |
| salario_modalidad_40         | NUMERIC(10,2), NULLABLE                   | Salario propuesto en Modalidad 40 para este escenario específico.                                                                 |
| meses_modalidad_10           | SMALLINT, NULLABLE                        | Meses de cotización como persona trabajadora independiente (Modalidad 10) para este escenario.                                    |
| meses_modalidad_40           | SMALLINT, NULLABLE                        | Meses de cotización en Modalidad 40 para este escenario.                                                                          |
| costo_mensual_estimado       | NUMERIC(12,2), NULLABLE                   | Costo mensual (distinto de inversion_total_estimada, que es el total).                                                            |

### Tabla: periodos_inconsistencias

Fuente: Sección 5 del F1 ("Detalle de periodos a revisar"). Registra los patrones o lapsos donde el IMSS no le reconoció semanas al cliente y requieren aclaración o juicio.

| Campo                | Tipo de Dato                                       | Descripción                                                                             |
| -------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| id                   | UUID (PK, default gen_random_uuid())               | Identificador único de la inconsistencia.                                               |
| cliente_id           | UUID (FK -> clientes.id)                           | Cliente que tiene la discrepancia patronal.                                             |
| nombre_patron        | TEXT                                               | Nombre de la empresa o empleador no reconocido.                                         |
| periodo_reclamado    | TEXT                                               | Rango de fechas laboradas (ej. "1988 - 1993" o "Ene 1995 - Mar 1997").                  |
| semanas_esperadas    | INTEGER                                            | Semanas que el cliente asegura haber trabajado.                                         |
| semanas_reconocidas  | INTEGER, DEFAULT 0                                 | Semanas que el IMSS actualmente le reconoce de ese patrón.                              |
| evidencia_disponible | TEXT                                               | Documentos físicos que tiene el cliente (ej. "Hojas rosas, contratos, recibos nómina"). |
| accion_sugerida      | TEXT                                               | Vía de solución (ej. "Aclaración ante IMSS", "Búsqueda PNT", "Juicio laboral").         |
| estatus              | ENUM (estatus_inconsistencia), DEFAULT 'pendiente' | Estado de la revisión (pendiente, en_tramite, recuperado, no_procedente).               |

### Tabla: plan_accion

| Campo          | Tipo de Dato                             | Descripción                      |
| -------------- | ---------------------------------------- | -------------------------------- |
| id             | UUID (PK, default gen_random_uuid())     | Clave primaria.                  |
| diagnostico_id | UUID (FK → diagnostico_especializado.id) | Diagnóstico al que pertenece.    |
| accion         | TEXT                                     | Acción a realizar.               |
| fecha_objetivo | DATE, NULLABLE                           | Fecha objetivo para completarla. |
| estatus        | ENUM (estatus_plan_accion)               | Pendiente / En proceso / Hecho.  |
| observaciones  | TEXT, NULLABLE                           | Observaciones.                   |

estatus_plan_accion = ('pendiente', 'en_proceso', 'hecho')

### Tabla: objetivo_especifico_inicial (catálogo)

| Campo  | Tipo de Dato                 | Descripción                    |
| ------ | ---------------------------- | ------------------------------ |
| id     | SMALLINT (PK, autoincrement) | Identificador.                 |
| nombre | TEXT, NOT NULL, UNIQUE       | Texto del objetivo específico. |

Valores del catálogo (del F0, numeración original del formulario):

2. Corrección de datos personales · 3. Unificación de NSS · 4. Aclaración/Recuperación de Semanas · 5. Modalidad 10 · 6. Modalidad 40 · 7. Modalidad 40 retroactiva · 8. IMSS-ISSSTE/Portabilidad · 9. Unificación AFORE/cuentas · 10. SAR92/Recursos · 11. Solicitud de pensión · 12. Negativa de pensión/recuperación de recursos · 13. Juicio y jurisdicción.

### Tabla: cliente_objetivos_especificos (puente, multi-select)

| Campo       | Tipo de Dato                                   | Descripción                            |
| ----------- | ---------------------------------------------- | -------------------------------------- |
| cliente_id  | UUID (FK → clientes.id)                        | Cliente al que pertenece la selección. |
| objetivo_id | SMALLINT (FK → objetivo_especifico_inicial.id) | Objetivo marcado.                      |

PK compuesta: (cliente_id, objetivo_id).

Nota: esto es independiente de objetivo_diagnostico (el catálogo de 12 valores ya existente, ligado a diagnostico_especializado/F1) — son dos secciones de objetivo distintas, en dos formularios distintos, con redacción distinta. Se dejan ambas, igual que ya se hizo con clientes.objetivo_cliente vs. objetivo_diagnostico.

### Tabla: avisos

| Campo            | Tipo de Dato                             | Descripción                                             |
| ---------------- | ---------------------------------------- | ------------------------------------------------------- |
| id               | UUID (PK, default gen_random_uuid())     | Clave primaria.                                         |
| tipo             | ENUM (cita, tramite)                     | De qué se origina la alerta.                            |
| etapa_tramite_id | UUID, NULLABLE (FK -> etapas_tramite.id) | Se llena si el aviso viene de una fase (F0-F4).         |
| evento_id        | UUID, NULLABLE (FK -> eventos_agenda.id) | Se llena si el aviso viene de una cita.                 |
| fecha_alerta     | TIMESTAMPTZ                              | fecha_compromiso − 2 días (regla confirmada por Joyce). |
| atendido         | BOOLEAN, DEFAULT false                   |                                                         |
| atendido_por     | UUID, NULLABLE (FK -> usuarios.id)       | Usuario que atendio el aviso                            |
| fecha_atencion   | TIMESTAMPTZ, NULLABLE                    | Dia que se le dio atencion                              |

Restricción: CHECK ((etapa_tramite_id IS NOT NULL) <> (evento_id IS NOT NULL)) — exactamente uno de los dos debe estar lleno, nunca ambos ni ninguno.

### Tabla: eventos_agenda

| Campo      | Tipo de Dato                                      | Descripción     |
| ---------- | ------------------------------------------------- | --------------- |
| id         | UUID (PK, default gen_random_uuid())              | Clave primaria. |
| asesor_id  | UUID (FK -> usuarios.id)                          |                 |
| cliente_id | UUID (FK -> clientes.id)                          |                 |
| fecha      | DATE                                              |                 |
| hora       | TIME                                              |                 |
| motivo     | TEXT                                              | Texto libre.    |
| estatus    | ENUM (pendiente, cumplido, reagendado, cancelado) |                 |

### Tabla: informacion_issste (extensión 1:1 de historial_laboral, solo para clientes con régimen ISSSTE)

| Campo                | Tipo de Dato                             | Descripción                                                                                    |
| -------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| id                   | UUID PK                                  | Identificador                                                                                  |
| historial_laboral_id | UUID FK UNIQUE (-> historial_laboral.id) | Solo existe cuando el régimen del cliente (clientes.regimen_id) es ISSSTE o Mixto IMSS-ISSSTE. |
| nss_issste           | VARCHAR(20)                              | Identificador ISSSTE — no existe en historial_laboral.                                         |
| regimen_pensionario  | TEXT                                     | Décimo transitorio / cuentas individuales — tampoco existe en historial_laboral..              |
| anios_laborados      | NUMERIC(5,2) NULL                        | Complementa a las semanas, útil porque en ISSSTE a veces se reporta en años.                   |
| activo               | BOOLEAN                                  | Indica si el registro está vigente                                                             |

### Tabla: situacion_patrimonial (extensión 1:1 de diagnostico_especializado)

# Captura los datos que alimentan las ayudas del simulador (esposa/hijos/padres) y el análisis financiero/ROI:

| Campo                           | Tipo de Dato                                      | Descripción                              |
| ------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| id                              | UUID (PK, default gen_random_uuid())              | Clave primaria.                          |
| diagnostico_f1_id               | UUID (FK -> diagnostico_especializado.id), UNIQUE | Diagnóstico F1 asociado.                 |
| saldo_cuenta_individual         | NUMERIC(12,2)                                     | Saldo de la cuenta individual.           |
| aportaciones_voluntarias        | NUMERIC(12,2)                                     | Monto de aportaciones voluntarias.       |
| ahorros_inversiones_adicionales | NUMERIC(12,2)                                     | Ahorros e inversiones adicionales.       |
| bienes_patrimoniales            | TEXT                                              | Descripción de bienes patrimoniales.     |
| creditos_deudas_vigentes        | TEXT                                              | Detalle de créditos y deudas vigentes.   |
| ingreso_mensual                 | NUMERIC(12,2)                                     | Ingreso mensual principal.               |
| otras_fuentes_ingreso           | TEXT                                              | Otras fuentes de ingreso.                |
| ingreso_conyuge                 | NUMERIC(12,2)                                     | Ingreso mensual del cónyuge.             |
| seguros                         | TEXT                                              | Seguros contratados.                     |
| estado_salud                    | ENUM (bueno, regular, malo)                       | Estado general de salud.                 |
| padecimientos                   | TEXT                                              | Detalle de padecimientos o enfermedades. |
| estado_civil                    | ENUM (estado_civil)                               | Estado civil del cliente.                |
| edad_conyuge                    | SMALLINT, NULLABLE                                | Edad del cónyuge.                        |
| actividad_economica_conyuge     | TEXT, NULLABLE                                    | Actividad económica del cónyuge.         |

### Tabla: situacion_patrimonial_hijos

| Campo                    | Tipo de Dato                         | Descripción                                                                   |
| ------------------------ | ------------------------------------ | ----------------------------------------------------------------------------- |
| id                       | UUID (PK, default gen_random_uuid()) | Clave primaria.                                                               |
| situacion_patrimonial_id | UUID (FK → situacion_patrimonial.id) | Registro patrimonial al que pertenece.                                        |
| numero_hijos             | SMALLINT, DEFAULT 0                  | Sin uso: cada fila es un hijo y el número de hijos se calcula contando filas. |
| tiene_discapacidad       | BOOLEAN, DEFAULT false               | Indica si el hijo tiene discapacidad.                                         |
| edad                     | SMALLINT                             | Edad del hijo.                                                                |

### Tabla: tipo_documento_diagnostico

Fuente: Sección 2 del F1 ("Documentos requeridos para el análisis"). Catálogo de los 9 documentos del formato oficial.

| Campo  | Tipo de Dato                                    | Descripción           |
| ------ | ----------------------------------------------- | --------------------- |
| id     | SMALLINT (PK, GENERATED BY DEFAULT AS IDENTITY) | Clave primaria.       |
| nombre | TEXT, UNIQUE                                    | Nombre del documento. |

Semilla: Constancia de semanas cotizadas IMSS - Reporte de semanas cotizadas - Historial laboral IMSS - Estado de cuenta AFORE -
Comprobantes de pagos Modalidad 10 - Resoluciones, negativas o trámites previos - Recibos de nómina / pruebas laborales -
Semanas ISSSTE o portabilidad - Comprobantes de pagos Modalidad 40 / 40 retroactivo.

### Tabla: diagnostico_documentos

Fuente: Sección 2 del F1. Registra si cada documento requerido fue recibido y sus observaciones.

| Campo             | Tipo de Dato                                   | Descripción                                 |
| ----------------- | ---------------------------------------------- | ------------------------------------------- |
| diagnostico_id    | UUID (FK -> diagnostico_especializado.id)      | Diagnóstico al que pertenece.               |
| tipo_documento_id | SMALLINT (FK -> tipo_documento_diagnostico.id) | Documento requerido.                        |
| recibido          | BOOLEAN, NULLABLE                              | Sí (true) / No (false); null sin responder. |
| observaciones     | TEXT, NULLABLE                                 | Observaciones sobre el documento.           |

Restricción: PRIMARY KEY (diagnostico_id, tipo_documento_id)

### Tabla: cliente_auxiliares

| Campo              | Tipo de Dato                         | Descripción                           |
| ------------------ | ------------------------------------ | ------------------------------------- |
| id                 | UUID (PK, default gen_random_uuid()) | Clave primaria.                       |
| cliente_id         | UUID (FK → clientes.id)              | Cliente al que se asigna el auxiliar. |
| auxiliar_id        | UUID (FK → usuarios.id)              | Auxiliar asignado.                    |
| autorizado_por     | UUID, NULLABLE (FK → usuarios.id)    | Usuario que autoriza la asignación.   |
| fecha_autorizacion | TIMESTAMPTZ, NULLABLE                | Fecha y hora de autorización.         |
| activo             | BOOLEAN, DEFAULT true                | Indica si la relación está activa.    |

Restricción: UNIQUE (cliente_id, auxiliar_id)

## Delimitación de Alcance del Modelo de Datos

Se retiraron de este diccionario de datos las tablas correspondientes al alcance de la extensión del sistema desarrollada por Luis: credenciales_correo_cliente, informacion_fiscal, divisiones, grupos_principales (incluyendo la llave foránea grupo_principal_id en clientes), modalidades_aplicacion y estatus_modalidad.
