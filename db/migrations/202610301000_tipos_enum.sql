-- Tipos personalizados (ENUM) de docs/diccionario.md.
-- Convención de todas las migraciones: una columna es NOT NULL salvo que el diccionario diga NULLABLE.
--
-- Nota: el diccionario lista también el ENUM estatus_tramite, pero ya existe la TABLA estatus_tramite
-- y en PostgreSQL tabla y tipo comparten espacio de nombres. Ninguna columna usa ese ENUM
-- (etapas_tramite.estatus_id es FK a la tabla), por eso no se crea.

CREATE TYPE estado_confirmacion AS ENUM ('si', 'no', 'por_confirmar');
CREATE TYPE estado_civil AS ENUM ('soltero', 'casado', 'divorciado', 'viudo', 'concubinato');
CREATE TYPE categoria_tramite AS ENUM ('no_aplica', 'pendiente', 'en_proceso', 'completado', 'excepcion');
CREATE TYPE sexo_cliente AS ENUM ('hombre', 'mujer');
CREATE TYPE objetivo_cliente AS ENUM ('pensionarse_asap', 'mejorar_monto_pension', 'negativa_pension');
CREATE TYPE tipo_pension AS ENUM ('cesantia', 'vejez', 'invalidez', 'viudez', 'otro');
CREATE TYPE evaluacion_modalidad AS ENUM (
  'aplica', 'no_aplica', 'aplica_con_restricciones', 'requiere_regularizacion',
  'temporal', 'evaluar', 'requiere_contabilidad'
);
CREATE TYPE estatus_inconsistencia AS ENUM ('pendiente', 'en_tramite', 'recuperado', 'no_procedente');
CREATE TYPE validacion_estado AS ENUM ('si', 'no', 'requiere_validar');
CREATE TYPE conveniencia_pension AS ENUM ('si', 'no', 'depende_escenario');
CREATE TYPE si_no_parcial AS ENUM ('si', 'no', 'parcialmente');
CREATE TYPE aplicabilidad_recuperacion AS ENUM ('si', 'no', 'requiere_mas_evidencia');
CREATE TYPE cumplimiento_criterio AS ENUM ('cumple', 'no_cumple', 'requiere_validar');
CREATE TYPE evaluacion_retroactivo AS ENUM (
  'conviene', 'no_conviene', 'conviene_parcialmente', 'requiere_calculo_validacion'
);
CREATE TYPE estatus_plan_accion AS ENUM ('pendiente', 'en_proceso', 'hecho');
CREATE TYPE criterio_seleccion_nss AS ENUM ('vinculo_curp', 'antiguedad', 'credito_infonavit', 'estatus_pension');
CREATE TYPE etapa_institucional_nss AS ENUM (
  'ingreso_validacion', 'dictaminacion_imss', 'migracion_historial', 'notificacion_consar_infonavit'
);
CREATE TYPE tipo_aviso AS ENUM ('cita', 'tramite');
CREATE TYPE estatus_evento_agenda AS ENUM ('pendiente', 'cumplido', 'reagendado', 'cancelado');
CREATE TYPE estado_salud AS ENUM ('bueno', 'regular', 'malo');
