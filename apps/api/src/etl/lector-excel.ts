import * as ExcelJS from 'exceljs';
import { RenglonCrudo } from './tipos';

// Lector de la hoja Clientes del FORMATO_CONTROL_OPERATIVO (Actividad 5, Tarea 2). Hoja `Clientes`,
// encabezados en la fila 5 y datos desde la fila 6. Las columnas se leen por NOMBRE de encabezado (con
// trim), nunca por posición. Los valores de las celdas se devuelven tal como están guardados, sin limpiar:
// el saneo es de las tareas siguientes.

const HOJA = 'Clientes';
const FILA_ENCABEZADOS = 5;
const PRIMERA_FILA_DATOS = 6;

// El archivo no se puede leer como la hoja Clientes del formato (no es un .xlsx, falta la hoja o columnas
// obligatorias, o no trae renglones de datos). Es un error del archivo, no de un renglón.
export class ArchivoInvalidoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ArchivoInvalidoError';
  }
}

const DATOS_DEL_CLIENTE = [
  'ID',
  'Nombre del cliente',
  'Referidor',
  'Teléfono',
  'Asesor',
  'Fecha ingreso',
  'CURP',
  'Fecha de nacimiento',
  'Edad',
  'Estado civil',
  'Dependientes económicos',
  'RFC',
  'Email',
  'Régimen seguridad social',
  'NSS',
  'Ley probable',
  'Semanas IMSS reconocidas',
  'Semanas a recuperar',
  '¿Tiene ISSSTE?',
  'AFORE',
  'Días desde alta',
  'Fecha compromiso total',
  'Observaciones generales',
  'Requiere contadora',
];

// Encabezado de estatus de cada etapa 0 a 15 (ya sin espacios finales).
const ESTATUS_POR_ETAPA = [
  '0. Expediente y diagnóstico inicial',
  '1. Diagnóstico especializado',
  '2. Corrección datos personales',
  '3. Unificación NSS',
  '4. Aclaración / recuperación semanas',
  '5. Modalidad 10',
  '6. Modalidad 40',
  '7. Modalidad 40 retroactivo',
  '8. IMSS-ISSSTE / Portabilidad',
  '9. Unificación AFORE / cuentas',
  '10. SAR 92',
  '11. Solicitud de pensión',
  '12. Negativa de pensión/recuperación recursos',
  '13. Juicio / Jurisdicción',
  '14. Cobranza final',
  '15. Finalización',
];

// Las 87 columnas obligatorias (A a CI): los datos del cliente y, por cada etapa, estatus, acción a
// realizar (la etapa 0 no tiene), fecha compromiso y avance. Las 6 de documentos (CJ a CO) no se migran
// y no son obligatorias.
export const COLUMNAS_OBLIGATORIAS: string[] = [
  ...DATOS_DEL_CLIENTE,
  ...ESTATUS_POR_ETAPA.flatMap((estatus, n) =>
    n === 0
      ? [estatus, 'Fecha compromiso', 'Avance0']
      : [estatus, `Acción a realizar${n}`, `Fecha compromiso${n}`, `Avance${n}`],
  ),
];

const normalizar = (texto: string) => texto.normalize('NFC');

type Crudo = string | number | boolean | Date | null;

// Convierte el valor de una celda de exceljs a string, number, boolean, Date o null: una fórmula devuelve
// su resultado guardado, el texto enriquecido y los hipervínculos su texto simple, y un error de Excel
// (#N/A, #DIV/0!...) se lee como vacío.
function valorDeCelda(valor: ExcelJS.CellValue): Crudo {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
    return valor;
  }
  if (valor instanceof Date) return valor;
  if (typeof valor === 'object') {
    if ('richText' in valor) return valor.richText.map((trozo) => trozo.text).join('');
    if ('formula' in valor || 'sharedFormula' in valor) {
      return valorDeCelda((valor as { result?: ExcelJS.CellValue }).result ?? null);
    }
    if ('hyperlink' in valor) return valor.text === undefined ? null : valorDeCelda(valor.text);
    if ('error' in valor) return null;
  }
  return null;
}

const estaVacio = (valor: Crudo) =>
  valor === null || (typeof valor === 'string' && valor.trim() === '');

export async function leerHojaClientes(
  buffer: Buffer,
): Promise<{ encabezados: string[]; renglones: RenglonCrudo[] }> {
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new ArchivoInvalidoError(
      'El archivo no es un libro de Excel (.xlsx) válido o está dañado.',
    );
  }
  const hoja = libro.worksheets.find((h) => h.name.trim().toLowerCase() === HOJA.toLowerCase());
  if (!hoja) throw new ArchivoInvalidoError(`El archivo no tiene la hoja ${HOJA}.`);

  // Encabezados con trim, por columna. Solo se recortan los encabezados.
  const filaEncabezados = hoja.getRow(FILA_ENCABEZADOS);
  const columnas = new Map<number, string>();
  const ultimaColumna = Math.max(hoja.columnCount, filaEncabezados.cellCount);
  for (let c = 1; c <= ultimaColumna; c++) {
    const encabezado = valorDeCelda(filaEncabezados.getCell(c).value);
    if (encabezado !== null && String(encabezado).trim() !== '') {
      columnas.set(c, String(encabezado).trim());
    }
  }
  const encabezados = [...columnas.values()];

  const presentes = new Set(encabezados.map(normalizar));
  const faltan = COLUMNAS_OBLIGATORIAS.filter((e) => !presentes.has(normalizar(e)));
  if (faltan.length > 0) {
    throw new ArchivoInvalidoError(
      `Faltan ${faltan.length} columnas obligatorias en la hoja ${HOJA}: ${faltan.join(', ')}.`,
    );
  }

  const renglones: RenglonCrudo[] = [];
  for (let numero = PRIMERA_FILA_DATOS; numero <= hoja.rowCount; numero++) {
    const fila = hoja.getRow(numero);
    const celdas: Record<string, unknown> = {};
    let conDatos = false;
    for (const [c, encabezado] of columnas) {
      const valor = valorDeCelda(fila.getCell(c).value);
      celdas[encabezado] = valor;
      if (!estaVacio(valor)) conDatos = true;
    }
    // Las filas con estilo pero sin datos (el formato trae 54 así) no son renglones.
    if (conDatos) renglones.push({ fila: numero, celdas });
  }
  if (renglones.length === 0) {
    throw new ArchivoInvalidoError(`La hoja ${HOJA} viene sin renglones de datos.`);
  }
  return { encabezados, renglones };
}

// Un resto de fórmulas: sin nombre, sin CURP y sin NSS. El formato trae renglones con estilo y fórmulas que
// dan un valor (Edad, Días desde alta) aunque no haya cliente; no son renglones de datos. Un 0 sí es un dato.
const vacioCelda = (valor: unknown) =>
  valor === null || valor === undefined || (typeof valor === 'string' && valor.trim() === '');

export function esRenglonVacio(celdas: Record<string, unknown>): boolean {
  return ['Nombre del cliente', 'CURP', 'NSS'].every((columna) => vacioCelda(celdas[columna]));
}
