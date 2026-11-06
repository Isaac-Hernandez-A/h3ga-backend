import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// scripts/reporte-pruebas.mjs: convierte la salida de `jest --json` en docs/pruebas-resultados.md.
// Se prueba como proceso aparte (así se usa) con un JSON de ejemplo, sin volver a correr Jest.
const SCRIPT = resolve(__dirname, '..', '..', '..', 'scripts', 'reporte-pruebas.mjs');

const ejemplo = {
  numTotalTests: 7,
  numPassedTests: 4,
  numFailedTests: 1,
  testResults: [
    {
      name: '/repo/apps/api/src/etapas/reglas-avance.spec.ts',
      startTime: 1_000,
      endTime: 1_500,
      assertionResults: [
        { title: 'CP-22 calcularAvance: Por iniciar 10', status: 'passed', duration: 3 },
        { title: 'los límites 20 y 90 son válidos', status: 'passed', duration: 1 },
      ],
    },
    {
      name: '/repo/apps/api/src/clientes/clientes.e2e.spec.ts',
      startTime: 2_000,
      endTime: 4_250,
      assertionResults: [
        { title: 'CP-15b crear deja las 16 etapas', status: 'passed', duration: 40 },
        { title: 'CP-9 usa un número corto', status: 'failed', duration: 5 },
        { title: 'CP-15 crear fija asesor_id = sub', status: 'passed', duration: 10 },
        { title: 'prueba sin identificador', status: 'pending', duration: null },
      ],
    },
    {
      name: '/repo/apps/api/src/avisos/avisos.service.spec.ts',
      startTime: 5_000,
      endTime: 5_100,
      assertionResults: [{ title: 'CP-42 el asesor ve los suyos', status: 'todo', duration: null }],
    },
  ],
};

describe('scripts/reporte-pruebas.mjs', () => {
  let dir: string;
  let md: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'h3ga-reporte-'));
    await writeFile(join(dir, 'entrada.json'), JSON.stringify(ejemplo));
    const r = spawnSync(
      process.execPath,
      [
        SCRIPT,
        '--entrada',
        join(dir, 'entrada.json'),
        '--salida',
        join(dir, 'salida.md'),
        '--fecha',
        '2026-11-06',
      ],
      { encoding: 'utf8' },
    );
    expect(r.status).toBe(0);
    md = await readFile(join(dir, 'salida.md'), 'utf8');
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('CP-55 el reporte lista cada prueba cuyo título empieza con CP- y su resultado', () => {
    const casos = md.split('## Casos CP')[1];
    expect(casos).toBeDefined();
    const filas = casos.split('\n').filter((l) => /^\| CP-/.test(l));
    // Orden numérico (CP-9 antes que CP-15) y una fila por prueba CP-.
    expect(filas.map((f) => f.split('|')[1].trim())).toEqual([
      'CP-9',
      'CP-15',
      'CP-15b',
      'CP-22',
      'CP-42',
    ]);
    const resultado = (id: string) => filas.find((f) => f.startsWith(`| ${id} |`))!;
    expect(resultado('CP-22')).toMatch(/Pasa/);
    expect(resultado('CP-9')).toMatch(/Falla/);
    expect(resultado('CP-42')).toMatch(/Pendiente/);
    expect(resultado('CP-22')).toContain('calcularAvance: Por iniciar 10');
    // Las pruebas sin identificador CP- no aparecen en esta tabla.
    expect(casos).not.toContain('los límites 20 y 90');
  });

  it('el resumen por suite cuenta pruebas, pasan, fallan y tiempo', () => {
    const resumen = md.split('## Resumen por suite')[1].split('## Casos CP')[0];
    const fila = (sufijo: string) => resumen.split('\n').find((l) => l.includes(sufijo))!;
    expect(fila('etapas/reglas-avance.spec.ts')).toMatch(/\| 2 \| 2 \| 0 \| 0\.50 \|/);
    expect(fila('clientes/clientes.e2e.spec.ts')).toMatch(/\| 4 \| 2 \| 1 \| 2\.25 \|/);
    expect(fila('avisos/avisos.service.spec.ts')).toMatch(/\| 1 \| 0 \| 0 \| 0\.10 \|/);
    expect(resumen).toMatch(/\*\*Total\*\* \| \*\*7\*\* \| \*\*4\*\* \| \*\*1\*\*/);
    expect(md).toContain('2026-11-06');
  });

  it('con un JSON ilegible termina con error y no escribe el reporte', async () => {
    await writeFile(join(dir, 'malo.json'), '{ no es json');
    const r = spawnSync(
      process.execPath,
      [SCRIPT, '--entrada', join(dir, 'malo.json'), '--salida', join(dir, 'malo.md')],
      { encoding: 'utf8' },
    );
    expect(r.status).not.toBe(0);
    await expect(readFile(join(dir, 'malo.md'), 'utf8')).rejects.toThrow();
  });
});
