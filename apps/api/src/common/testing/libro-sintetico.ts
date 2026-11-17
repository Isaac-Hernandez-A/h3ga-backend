import * as ExcelJS from 'exceljs';
import { COLUMNAS_OBLIGATORIAS } from '../../etl/lector-excel';

// Libros de Excel SINTÉTICOS para las pruebas de la ETL (Actividad 5, Tarea 14): datos ficticios armados en
// memoria con la forma del formato (títulos en las filas 1 a 4, encabezados en la 5, datos desde la 6). Nunca
// se usa el Excel real en pruebas ni en el repositorio.
const utc = (a: number, m: number, d: number) => new Date(Date.UTC(a, m - 1, d));

export const CURPS_VALIDAS = ['HOUW700909MNLTWL04', 'MIAR610609HDFRNF68', 'QAQD760716MOCPJXE8'];
export const NSS_VALIDOS = ['99033042845', '99346352136', '99446026195'];

const estatusDe = (n: number) => COLUMNAS_OBLIGATORIAS.find((c) => c.startsWith(`${n}. `))!;

// Un renglón limpio con las 87 columnas obligatorias (etapa 0 Finalizado, etapa 1 En proceso asesor, el resto
// No aplica y la 15 Por iniciar). `cambios` pisa celdas por encabezado exacto.
export function celdasLimpias(
  n: number,
  cambios: Record<string, unknown> = {},
): Record<string, unknown> {
  const celdas: Record<string, unknown> = {
    ID: n,
    'Nombre del cliente': `Cliente Sintetico${n} Prueba`,
    Referidor: 'Instagram',
    Teléfono: '9876628360',
    Asesor: 'Lic. Marco Hernández',
    'Fecha ingreso': utc(2025, 1, 17),
    CURP: CURPS_VALIDAS[(n - 1) % CURPS_VALIDAS.length],
    'Fecha de nacimiento': utc(1970, 9, 9),
    Edad: 56,
    'Estado civil': 'Casado (a)',
    'Dependientes económicos': 2,
    RFC: 'HOUW700909AB1',
    Email: `cliente${n}@ejemplo.test`,
    'Régimen seguridad social': 'IMSS',
    NSS: NSS_VALIDOS[(n - 1) % NSS_VALIDOS.length],
    'Ley probable': 'Ley 73',
    'Semanas IMSS reconocidas': 1094,
    'Semanas a recuperar': 200,
    '¿Tiene ISSSTE?': 'No',
    AFORE: 'Sura',
    'Días desde alta': 668,
    'Fecha compromiso total': 46000,
    'Observaciones generales': null,
    'Requiere contadora': 'No',
  };
  for (let e = 0; e < 16; e++) {
    const sufijo = e === 0 ? '' : String(e);
    celdas[estatusDe(e)] =
      e === 0
        ? 'Finalizado'
        : e === 1
          ? 'En proceso asesor'
          : e === 15
            ? 'Por iniciar'
            : 'No aplica';
    celdas[`Fecha compromiso${sufijo}`] = e === 0 ? utc(2025, 2, 1) : null;
    celdas[`Avance${e}`] = e === 0 ? 1 : e === 1 ? 0.4 : e === 15 ? 0.1 : 0;
    if (e > 0) celdas[`Acción a realizar${e}`] = null;
  }
  return { ...celdas, ...cambios };
}

// Un renglón de "resto de fórmulas": sin nombre, CURP ni NSS, solo las fórmulas con su valor guardado.
export function restoDeFormulas(n: number): Record<string, unknown> {
  return { ID: n, Edad: 0, 'Días desde alta': n, 'Fecha compromiso total': 46000 };
}

export async function libroSintetico(
  renglones: Record<string, unknown>[],
  extraEncabezados: string[] = [],
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Clientes');
  hoja.getCell('A1').value = 'Tablero de seguimiento de clientes (sintético)';
  const encabezados = [...COLUMNAS_OBLIGATORIAS, ...extraEncabezados];
  encabezados.forEach((e, i) => (hoja.getRow(5).getCell(i + 1).value = e));
  renglones.forEach((renglon, k) => {
    encabezados.forEach((e, i) => {
      const valor = renglon[e];
      if (valor !== undefined && valor !== null) {
        hoja.getRow(6 + k).getCell(i + 1).value = valor as never;
      }
    });
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}
