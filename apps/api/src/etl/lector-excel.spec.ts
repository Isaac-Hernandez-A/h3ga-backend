import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as ExcelJS from 'exceljs';
import {
  ArchivoInvalidoError,
  COLUMNAS_OBLIGATORIAS,
  esRenglonVacio,
  leerHojaClientes,
} from './lector-excel';

// Lector de la hoja Clientes del FORMATO_CONTROL_OPERATIVO (Actividad 5, Tarea 2). Los libros de prueba se
// arman en memoria con exceljs; el fixture ficticio vive en test/fixtures/etl/.
const FIXTURE = resolve(
  __dirname,
  '../../../../test/fixtures/etl/FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx',
);

// Los 93 encabezados del fixture, tal como están escritos (con sus espacios finales).
let ENCABEZADOS: string[];

async function encabezadosDelFixture(): Promise<string[]> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(FIXTURE);
  const fila = libro.getWorksheet('Clientes')!.getRow(5);
  const encabezados: string[] = [];
  for (let c = 1; c <= 93; c++) encabezados.push(String(fila.getCell(c).value));
  return encabezados;
}

interface OpcionesLibro {
  hoja?: string;
  encabezados?: string[];
  // Renglones de datos: encabezado exacto -> valor (una celda puede ser { formula, result }).
  datos?: Record<string, unknown>[];
  // Filas vacías con estilo (relleno) o con texto vacío después de los datos.
  vaciasConEstilo?: number;
  vaciasConTextoVacio?: number;
}

// Libro con la forma del formato: títulos en las filas 1 a 4, encabezados en la 5 y datos desde la 6.
async function libro(opciones: OpcionesLibro = {}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet(opciones.hoja ?? 'Clientes');
  hoja.getCell('A1').value = 'Tablero de seguimiento de clientes UNIDAD PREMIUM';
  const encabezados = opciones.encabezados ?? ENCABEZADOS;
  encabezados.forEach((e, i) => (hoja.getRow(5).getCell(i + 1).value = e));
  let fila = 6;
  for (const dato of opciones.datos ?? []) {
    encabezados.forEach((e, i) => {
      if (dato[e] !== undefined) hoja.getRow(fila).getCell(i + 1).value = dato[e] as never;
    });
    fila++;
  }
  for (let k = 0; k < (opciones.vaciasConEstilo ?? 0); k++, fila++) {
    encabezados.forEach((_, i) => {
      hoja.getRow(fila).getCell(i + 1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEEEEE' },
      };
    });
  }
  for (let k = 0; k < (opciones.vaciasConTextoVacio ?? 0); k++, fila++) {
    encabezados.forEach((_, i) => (hoja.getRow(fila).getCell(i + 1).value = ''));
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const cliente = (n: number): Record<string, unknown> => ({
  ID: n,
  'Nombre del cliente': `Cliente Ficticio ${n}`,
  CURP: 'HDUW700909MNLTWL04',
  'Dependientes económicos': 2,
  'Fecha ingreso': new Date(Date.UTC(2025, 0, 17)),
});

beforeAll(async () => {
  ENCABEZADOS = await encabezadosDelFixture();
});

describe('leerHojaClientes', () => {
  it('CP-198 lee_54_renglones_del_fixture: el primero es la fila 6; fechas como Date y números como number', async () => {
    const { encabezados, renglones } = await leerHojaClientes(readFileSync(FIXTURE));
    expect(renglones).toHaveLength(54);
    expect(renglones[0].fila).toBe(6);
    expect(renglones[53].fila).toBe(59);
    expect(renglones.map((r) => r.fila)).toEqual(Array.from({ length: 54 }, (_, i) => 6 + i));
    expect(String(renglones[0].celdas['Nombre del cliente']).length).toBeGreaterThan(0);
    expect(encabezados).toContain('Nombre del cliente');
    expect(renglones[0].celdas['Fecha ingreso']).toBeInstanceOf(Date);
    expect(typeof renglones[0].celdas['Dependientes económicos']).toBe('number');
    expect(typeof renglones[0].celdas['ID']).toBe('number');
    // Las 87 columnas obligatorias son exactamente las columnas A a CI del fixture (sin las 6 de documentos).
    expect(COLUMNAS_OBLIGATORIAS).toHaveLength(87);
    expect(COLUMNAS_OBLIGATORIAS).toEqual(ENCABEZADOS.slice(0, 87).map((e) => e.trim()));
    expect(encabezados).toHaveLength(93);
  });

  it("CP-199 reconoce_encabezados_con_espacio_final: '1. ACTA ' se lee como '1. ACTA'", async () => {
    // El fixture trae '1. ACTA ' y '10. SAR 92 ' con espacio al final.
    expect(ENCABEZADOS).toContain('1. ACTA ');
    expect(ENCABEZADOS).toContain('10. SAR 92 ');
    const { encabezados, renglones } = await leerHojaClientes(readFileSync(FIXTURE));
    expect(encabezados).toContain('1. ACTA');
    expect(encabezados).toContain('10. SAR 92');
    expect(encabezados).not.toContain('1. ACTA ');
    expect(Object.keys(renglones[0].celdas)).toContain('1. ACTA');
    expect(Object.keys(renglones[0].celdas)).not.toContain('1. ACTA ');
    expect(renglones[0].celdas['1. ACTA']).toBe('Sí');
  });

  it('CP-199 solo se recortan los encabezados: los valores de las celdas se devuelven sin limpiar', async () => {
    const buffer = await libro({
      datos: [
        {
          ...cliente(1),
          'Nombre del cliente': '  RUBÉN   jiménez  ',
          CURP: ' hduw700909mnltwl04 ',
        },
      ],
    });
    const { renglones } = await leerHojaClientes(buffer);
    expect(renglones[0].celdas['Nombre del cliente']).toBe('  RUBÉN   jiménez  ');
    expect(renglones[0].celdas['CURP']).toBe(' hduw700909mnltwl04 ');
  });

  it('CP-200 ignora_renglones_vacios_con_estilo: 3 datos y 5 filas vacías dan 3 renglones', async () => {
    const buffer = await libro({
      datos: [cliente(1), cliente(2), cliente(3)],
      vaciasConEstilo: 3,
      vaciasConTextoVacio: 2,
    });
    const { renglones } = await leerHojaClientes(buffer);
    expect(renglones).toHaveLength(3);
    expect(renglones.map((r) => r.fila)).toEqual([6, 7, 8]);
    expect(renglones.map((r) => r.celdas['ID'])).toEqual([1, 2, 3]);
  });

  it('CP-201 valores_cacheados_y_texto_enriquecido: fórmulas devuelven su resultado guardado; richText e hipervínculos, su texto simple', async () => {
    // Fixture real: fila 6, Edad = 56 y Días desde alta = 668 (valores guardados de las fórmulas).
    const fixture = await leerHojaClientes(readFileSync(FIXTURE));
    expect(fixture.renglones[0].celdas['Edad']).toBe(56);
    expect(fixture.renglones[0].celdas['Días desde alta']).toBe(668);
    expect(typeof fixture.renglones[0].celdas['Fecha compromiso total']).toBe('number');

    const buffer = await libro({
      datos: [
        {
          ...cliente(1),
          Edad: { formula: 'IFERROR(DATEDIF(H6,TODAY(),"Y"),"")', result: 55 },
          'Días desde alta': { formula: 'IFERROR(TODAY()-F6,"")', result: '' },
          'Fecha compromiso total': { formula: 'NA()', result: { error: '#N/A' } },
          // Texto enriquecido: se une en un solo texto.
          Referidor: {
            richText: [{ text: 'Recomendación ' }, { text: 'de cliente', font: { bold: true } }],
          },
          // Hipervínculo: su texto visible.
          Email: { text: 'ana@ejemplo.test', hyperlink: 'mailto:ana@ejemplo.test' },
          // Booleano y celda vacía.
          'Requiere contadora': true,
        },
      ],
    });
    const { renglones } = await leerHojaClientes(buffer);
    const celdas = renglones[0].celdas;
    expect(celdas['Edad']).toBe(55);
    // Una fórmula cuyo resultado guardado es texto vacío sale vacía (exceljs no guarda el '' al escribir).
    expect([null, '']).toContain(celdas['Días desde alta']);
    expect(celdas['Fecha compromiso total']).toBeNull();
    expect(celdas['Referidor']).toBe('Recomendación de cliente');
    expect(celdas['Email']).toBe('ana@ejemplo.test');
    expect(celdas['Requiere contadora']).toBe(true);
    expect(celdas['RFC']).toBeNull();
    // Ningún valor sale como objeto: solo string, number, boolean, Date o null.
    for (const valor of Object.values(celdas)) {
      expect(
        valor === null ||
          ['string', 'number', 'boolean'].includes(typeof valor) ||
          valor instanceof Date,
      ).toBe(true);
    }
    for (const renglon of fixture.renglones) {
      for (const valor of Object.values(renglon.celdas)) {
        expect(
          valor === null ||
            ['string', 'number', 'boolean'].includes(typeof valor) ||
            valor instanceof Date,
        ).toBe(true);
      }
    }
  });

  it('CP-202 hoja_sin_datos: solo encabezados lanza ArchivoInvalidoError con "sin renglones de datos"', async () => {
    const buffer = await libro({ datos: [] });
    const resultado = leerHojaClientes(buffer);
    await expect(resultado).rejects.toBeInstanceOf(ArchivoInvalidoError);
    await expect(leerHojaClientes(buffer)).rejects.toThrow(/sin renglones de datos/);
  });

  it('CP-203 falta_hoja_clientes: lanza con "hoja Clientes"', async () => {
    const buffer = await libro({ hoja: 'Otra', datos: [cliente(1)] });
    await expect(leerHojaClientes(buffer)).rejects.toBeInstanceOf(ArchivoInvalidoError);
    await expect(leerHojaClientes(buffer)).rejects.toThrow(/hoja Clientes/);
  });

  it('CP-204 falta_columna_obligatoria: sin la columna CURP lanza con el nombre de la columna', async () => {
    const sinCurp = ENCABEZADOS.filter((e) => e !== 'CURP');
    const buffer = await libro({ encabezados: sinCurp, datos: [cliente(1)] });
    await expect(leerHojaClientes(buffer)).rejects.toBeInstanceOf(ArchivoInvalidoError);
    await expect(leerHojaClientes(buffer)).rejects.toThrow(/CURP/);

    // Lista TODAS las columnas que faltan, no solo la primera.
    const sinVarias = ENCABEZADOS.filter(
      (e) => !['CURP', 'Nombre del cliente', 'Avance7', '10. SAR 92 '].includes(e),
    );
    const variasFaltan = await libro({ encabezados: sinVarias, datos: [cliente(1)] });
    const error = await leerHojaClientes(variasFaltan).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ArchivoInvalidoError);
    for (const columna of ['CURP', 'Nombre del cliente', 'Avance7', '10. SAR 92']) {
      expect((error as Error).message).toContain(columna);
    }
    expect((error as Error).message).toContain('4 columnas');
  });
  it('CP-340 esRenglonVacio: sin nombre, sin CURP y sin NSS es un resto de fórmulas; con cualquiera de los tres, no', () => {
    const resto = {
      'Nombre del cliente': null,
      CURP: '',
      NSS: '   ',
      Edad: 0,
      'Días desde alta': 12,
    };
    expect(esRenglonVacio(resto)).toBe(true);
    expect(esRenglonVacio({})).toBe(true);
    expect(esRenglonVacio({ ...resto, 'Nombre del cliente': 'Ana' })).toBe(false);
    expect(esRenglonVacio({ ...resto, CURP: 'HOUW700909MNLTWL04' })).toBe(false);
    expect(esRenglonVacio({ ...resto, NSS: 99033042845 })).toBe(false);
    expect(esRenglonVacio({ ...resto, NSS: 0 })).toBe(false); // un 0 es un dato, no un vacío
  });
});
