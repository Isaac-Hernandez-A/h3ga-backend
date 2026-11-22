import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cargarEquivalencias } from './equivalencias';

// ETL_EQUIVALENCIAS puede ser la ruta de un JSON o el contenido del JSON (para plataformas sin disco
// persistente, como App Platform). Datos ficticios.
const CONTENIDO = JSON.stringify({ 'Lic. Ficticia Uno': 'uno@ejemplo.test' });

describe('cargarEquivalencias', () => {
  let carpeta: string;

  beforeAll(() => {
    carpeta = mkdtempSync(join(tmpdir(), 'equivalencias-'));
    writeFileSync(join(carpeta, 'valido.json'), CONTENIDO);
    writeFileSync(join(carpeta, 'roto.json'), '{ no es json');
  });

  afterAll(() => rmSync(carpeta, { recursive: true, force: true }));

  it('CP-348 acepta el contenido JSON directamente en la variable', async () => {
    await expect(cargarEquivalencias(CONTENIDO)).resolves.toEqual({
      'Lic. Ficticia Uno': 'uno@ejemplo.test',
    });
  });

  it('CP-348 acepta el contenido con espacios y saltos de línea alrededor', async () => {
    await expect(cargarEquivalencias(`\n  ${CONTENIDO}  \n`)).resolves.toEqual({
      'Lic. Ficticia Uno': 'uno@ejemplo.test',
    });
  });

  it('CP-349 sigue aceptando la ruta de un archivo JSON', async () => {
    await expect(cargarEquivalencias(join(carpeta, 'valido.json'))).resolves.toEqual({
      'Lic. Ficticia Uno': 'uno@ejemplo.test',
    });
  });

  it.each([
    ['contenido que no es JSON', '{ no es json'],
    ['contenido que es una lista', '[1, 2]'],
    ['contenido con valores que no son texto', '{"A": 1}'],
    ['una ruta que no existe', join('no-existe', 'nada.json')],
    ['un archivo con JSON roto', 'ARCHIVO_ROTO'],
    ['un valor vacío', '   '],
  ])('CP-350 rechaza %s con un error genérico que no cita el contenido', async (_n, entrada) => {
    const valor = entrada === 'ARCHIVO_ROTO' ? join(carpeta, 'roto.json') : entrada;
    const error = await cargarEquivalencias(valor).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain('no es json');
    expect((error as Error).message).not.toContain('nada.json');
  });
});
