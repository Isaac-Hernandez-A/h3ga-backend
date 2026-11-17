// Tipos compartidos de la ETL de clientes (Actividad 5). DatosCliente (Tarea 1) es la forma de un cliente
// ya saneado y validado, lista para cargarse; los tipos de renglón y de reporte (Tarea 2) son los que
// comparten las tareas siguientes. Mapa columna a campo: docs/etl-mapa-columnas.md.

// Resultado de sanear un campo: el valor limpio (null si no hay), los ajustes que se le hicieron, las
// advertencias (se carga con el campo vacío o corregido) y el rechazo (el renglón no se carga).
export interface Saneado<T> {
  valor: T | null;
  ajustes: string[];
  advertencias: string[];
  rechazo: string | null;
}

// Un renglón de datos tal como sale de la hoja: la fila de Excel y sus celdas por encabezado (con trim).
export interface RenglonCrudo {
  fila: number;
  celdas: Record<string, unknown>;
}

export type Clase = 'cargado' | 'rechazado';

export interface RenglonValidado {
  fila: number;
  idExcel: number | null;
  datos: DatosCliente | null;
  ajustes: string[];
  advertencias: string[];
  rechazos: string[];
}

// Reporte de una importación (sección 10 de la especificación). CURP y NSS siempre enmascarados.
export interface ReporteEtl {
  cabecera: {
    archivo: string;
    huellaSha256: string;
    modo: 'api' | 'comando';
    ejecutor: string;
    simulacro: boolean;
    inicio: string;
    fin: string;
  };
  totales: {
    leidos: number;
    cargados: number;
    rechazados: number;
    duplicadosEnArchivo: number;
    yaExistian: number;
    conAdvertencias: number;
    conAjustes: number;
    lotes: number;
    lotesDegradados: number;
    pendientesDeCaptura: number;
    objetivoAsumido: number;
  };
  conciliacion: { ok: boolean; detalle: string };
  // Cuántos renglones cargados llevan cada código de ajuste o advertencia (incluye los rutinarios).
  resumenPorCodigo: Record<string, number>;
  renglones: {
    fila: number;
    idExcel: number | null;
    clase: Clase;
    // Enmascarados (últimos 4 caracteres); null si el renglón no trae el dato.
    curp: string | null;
    nss: string | null;
    ajustes: string[];
    advertencias: string[];
    rechazos: string[];
  }[];
  nombresDivididos: string[];
  columnasNoMigradas: { columna: string; motivo: string }[];
}

// Los 9 estatus de una etapa (tabla estatus_tramite).
export const ESTATUS_ETAPA = [
  'No aplica',
  'Por iniciar',
  'En proceso cliente',
  'En proceso asesor',
  'En proceso Instituto',
  'Finalizado',
  'Bloqueado',
  'Cancelado',
  'Detenido',
] as const;
export type EstatusEtapa = (typeof ESTATUS_ETAPA)[number];

// Cada cliente tiene las 16 etapas del proceso, numero_paso de 0 a 15.
export const TOTAL_ETAPAS = 16;

export type EstadoCivilDb = 'soltero' | 'casado' | 'divorciado' | 'viudo' | 'concubinato';
export type EstadoConfirmacionDb = 'si' | 'no' | 'por_confirmar';
export type ObjetivoClienteDb = 'pensionarse_asap' | 'mejorar_monto_pension' | 'negativa_pension';
export type SexoClienteDb = 'hombre' | 'mujer';

// Una etapa del cliente tal como se escribe en etapas_tramite (directo, sin historial; sección 15 de la
// especificación). Las fechas son UTC a medianoche.
export interface DatosEtapa {
  numeroPaso: number; // 0 a 15
  estatus: EstatusEtapa;
  // Entero de 0 a 100. null en No aplica (se escribe 0).
  avance: number | null;
  // La etapa 0 no tiene columna de acción en el Excel: siempre null.
  accion: string | null;
  fechaCompromiso: Date | null;
  // Solo en Bloqueado: "Importado desde Excel, sin motivo registrado".
  motivoRechazo: string | null;
}

// Un cliente listo para cargar. Los catálogos viajan por nombre (el cargador los convierte a id) y el
// asesor ya viene resuelto a su usuarios.id. No incluye Edad, Días desde alta ni Fecha compromiso total
// (fórmulas del Excel que se recalculan).
export interface DatosCliente {
  // Del nombre único del Excel (ajuste nombre_dividido).
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string; // vacío si el nombre trae solo dos palabras
  // Texto vacío si el Excel no trae dato o es inválido (la columna es NOT NULL).
  referidoPor: string;
  telefono: string;
  correoElectronico: string;
  observacionesGenerales: string;
  asesorId: string; // usuarios.id (uuid)
  fechaIngreso: Date;
  fechaNacimiento: Date;
  curp: string;
  rfc: string | null;
  nss: string | null;
  // Tomado del carácter 11 de la CURP (H = hombre, M = mujer).
  sexo: SexoClienteDb;
  estadoCivil: EstadoCivilDb;
  dependientesEconomicos: number;
  regimen: string; // nombre en regimen_principal; 'No determinado' si es desconocido
  leyProbable: string; // nombre en ley_probable; 'No determinado' si es desconocida
  afore: string; // nombre en afore
  semanasImssReconocidas: number;
  semanasARecuperar: number | null;
  tieneIssste: EstadoConfirmacionDb;
  requiereContadora: EstadoConfirmacionDb;
  // Sin origen en el Excel (sección 15): 'Pendiente de captura' en los tres textos y 'por_confirmar'.
  domicilio: string;
  estado: string;
  subdelegacionImssProbable: string;
  cambioAfore: EstadoConfirmacionDb;
  // Sin origen en el Excel: 'pensionarse_asap' con la advertencia objetivo_asumido.
  objetivoCliente: ObjetivoClienteDb;
  // Siempre 16 elementos, en orden de numeroPaso (0 a 15).
  etapas: DatosEtapa[];
}
