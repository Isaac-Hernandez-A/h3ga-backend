import * as ExcelJS from 'exceljs';

// Encabezados en la fila 5 y datos desde la 6 (igual que etl/lector-excel.ts).
const ULTIMA_FILA_ENCABEZADOS = 5;
const HOJA = 'clientes';

// Deja en la hoja Clientes solo los primeros `maximo` renglones de datos. Sirve para cargar pocos clientes
// ficticios en una base de staging (pruebas:datos --clientes N). Los mensajes no citan el contenido.
export async function recortarLibro(buffer: Buffer, maximo: number): Promise<Buffer> {
  if (!Number.isInteger(maximo) || maximo < 1) {
    throw new Error('El número de clientes debe ser un entero positivo.');
  }
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new Error('El archivo no es un libro de Excel (.xlsx) válido.');
  }
  const hoja = libro.worksheets.find((h) => h.name.trim().toLowerCase() === HOJA);
  if (!hoja) throw new Error('El archivo no tiene la hoja Clientes.');
  // Se vacían las celdas de los renglones sobrantes (el lector ignora las filas sin datos).
  for (let numero = ULTIMA_FILA_ENCABEZADOS + maximo + 1; numero <= hoja.rowCount; numero++) {
    hoja.getRow(numero).eachCell({ includeEmpty: false }, (celda) => {
      celda.value = null;
    });
  }
  return Buffer.from(await libro.xlsx.writeBuffer());
}
