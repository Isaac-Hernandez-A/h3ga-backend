import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { leerHojaClientes } from '../etl/lector-excel';
import { recortarLibro } from './recortar-libro';

// pruebas:datos --clientes N carga solo los primeros N renglones del Excel ficticio (para una base de staging
// pequeña). Datos ficticios.
const FIXTURE = readFileSync(
  resolve(__dirname, '../../../../test/fixtures/etl/FORMATO_CONTROL_OPERATIVO_FICTICIO.xlsx'),
);

describe('recortarLibro', () => {
  it('CP-370 deja solo los primeros N renglones de la hoja Clientes', async () => {
    const original = await leerHojaClientes(FIXTURE);
    for (const n of [3, 5]) {
      const recortado = await leerHojaClientes(await recortarLibro(FIXTURE, n));
      expect(recortado.renglones).toHaveLength(n);
      expect(recortado.renglones.map((r) => r.fila)).toEqual(
        original.renglones.slice(0, n).map((r) => r.fila),
      );
      expect(recortado.encabezados).toEqual(original.encabezados);
    }
  });

  it('CP-371 con N mayor o igual a los renglones del libro lo deja completo', async () => {
    const original = await leerHojaClientes(FIXTURE);
    const completo = await leerHojaClientes(await recortarLibro(FIXTURE, 1000));
    expect(completo.renglones).toHaveLength(original.renglones.length);
  });

  it.each([0, -1, 2.5, Number.NaN])(
    'CP-372 rechaza N=%p (debe ser un entero positivo)',
    async (n) => {
      await expect(recortarLibro(FIXTURE, n)).rejects.toThrow(/entero positivo/);
    },
  );

  it('CP-373 un archivo que no es un libro de Excel falla sin citar su contenido', async () => {
    const error = await recortarLibro(Buffer.from('contenido-secreto'), 3).catch((e: Error) => e);
    expect((error as Error).message).not.toContain('contenido-secreto');
  });
});
