// Generado desde los tipos ENUM de la base (docs/diccionario.md). No editar a mano.

export enum AplicabilidadRecuperacion {
  SI = 'si',
  NO = 'no',
  REQUIERE_MAS_EVIDENCIA = 'requiere_mas_evidencia',
}

export enum CategoriaTramite {
  NO_APLICA = 'no_aplica',
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  COMPLETADO = 'completado',
  EXCEPCION = 'excepcion',
}

export enum ConvenienciaPension {
  SI = 'si',
  NO = 'no',
  DEPENDE_ESCENARIO = 'depende_escenario',
}

export enum CriterioSeleccionNss {
  VINCULO_CURP = 'vinculo_curp',
  ANTIGUEDAD = 'antiguedad',
  CREDITO_INFONAVIT = 'credito_infonavit',
  ESTATUS_PENSION = 'estatus_pension',
}

export enum CumplimientoCriterio {
  CUMPLE = 'cumple',
  NO_CUMPLE = 'no_cumple',
  REQUIERE_VALIDAR = 'requiere_validar',
}

export enum EstadoCivil {
  SOLTERO = 'soltero',
  CASADO = 'casado',
  DIVORCIADO = 'divorciado',
  VIUDO = 'viudo',
  CONCUBINATO = 'concubinato',
}

export enum EstadoConfirmacion {
  SI = 'si',
  NO = 'no',
  POR_CONFIRMAR = 'por_confirmar',
}

export enum EstadoSalud {
  BUENO = 'bueno',
  REGULAR = 'regular',
  MALO = 'malo',
}

export enum EstatusEventoAgenda {
  PENDIENTE = 'pendiente',
  CUMPLIDO = 'cumplido',
  REAGENDADO = 'reagendado',
  CANCELADO = 'cancelado',
}

export enum EstatusInconsistencia {
  PENDIENTE = 'pendiente',
  EN_TRAMITE = 'en_tramite',
  RECUPERADO = 'recuperado',
  NO_PROCEDENTE = 'no_procedente',
}

export enum EstatusPlanAccion {
  PENDIENTE = 'pendiente',
  EN_PROCESO = 'en_proceso',
  HECHO = 'hecho',
}

export enum EtapaInstitucionalNss {
  INGRESO_VALIDACION = 'ingreso_validacion',
  DICTAMINACION_IMSS = 'dictaminacion_imss',
  MIGRACION_HISTORIAL = 'migracion_historial',
  NOTIFICACION_CONSAR_INFONAVIT = 'notificacion_consar_infonavit',
}

export enum EvaluacionModalidad {
  APLICA = 'aplica',
  NO_APLICA = 'no_aplica',
  APLICA_CON_RESTRICCIONES = 'aplica_con_restricciones',
  REQUIERE_REGULARIZACION = 'requiere_regularizacion',
  TEMPORAL = 'temporal',
  EVALUAR = 'evaluar',
  REQUIERE_CONTABILIDAD = 'requiere_contabilidad',
}

export enum EvaluacionRetroactivo {
  CONVIENE = 'conviene',
  NO_CONVIENE = 'no_conviene',
  CONVIENE_PARCIALMENTE = 'conviene_parcialmente',
  REQUIERE_CALCULO_VALIDACION = 'requiere_calculo_validacion',
}

export enum ObjetivoCliente {
  PENSIONARSE_ASAP = 'pensionarse_asap',
  MEJORAR_MONTO_PENSION = 'mejorar_monto_pension',
  NEGATIVA_PENSION = 'negativa_pension',
}

export enum SexoCliente {
  HOMBRE = 'hombre',
  MUJER = 'mujer',
}

export enum SiNoParcial {
  SI = 'si',
  NO = 'no',
  PARCIALMENTE = 'parcialmente',
}

export enum TipoAviso {
  CITA = 'cita',
  TRAMITE = 'tramite',
}

export enum TipoPension {
  CESANTIA = 'cesantia',
  VEJEZ = 'vejez',
  INVALIDEZ = 'invalidez',
  VIUDEZ = 'viudez',
  OTRO = 'otro',
}

export enum ValidacionEstado {
  SI = 'si',
  NO = 'no',
  REQUIERE_VALIDAR = 'requiere_validar',
}
