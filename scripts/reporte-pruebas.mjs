// Genera docs/pruebas-resultados.md a partir de la salida de `jest --json`.
//
// Uso:
//   node scripts/reporte-pruebas.mjs                       corre las pruebas de apps/api y escribe el reporte
//   node scripts/reporte-pruebas.mjs --entrada r.json      usa un JSON de Jest ya generado (no corre Jest)
//   opciones: --salida docs/pruebas-resultados.md   --fecha AAAA-MM-DD
//
// El reporte tiene dos tablas: resumen por suite (suite, pruebas, pasan, fallan, tiempo) y los casos CP-xx
// (identificador, descripción, resultado). Las pruebas con base real necesitan TEST_DATABASE_URL en .env.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = join(RAIZ, 'apps', 'api');

function opciones(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--') || argv[i + 1] === undefined) {
      throw new Error(
        `Uso: node scripts/reporte-pruebas.mjs [--entrada r.json] [--salida ruta.md] [--fecha AAAA-MM-DD]`,
      );
    }
    o[argv[i].slice(2)] = argv[i + 1];
  }
  return o;
}

function fechaCancun() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Cancun',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function nombreDeSuite(ruta) {
  const normal = ruta.replaceAll('\\', '/');
  const marca = 'apps/api/src/';
  const i = normal.lastIndexOf(marca);
  return i >= 0 ? normal.slice(i + marca.length) : normal.split('/').pop();
}

const resultadoDe = (estado) =>
  estado === 'passed' ? '✔ Pasa' : estado === 'failed' ? '✘ Falla' : '○ Pendiente';

// Orden natural de los identificadores: CP-9, CP-15, CP-15b, CP-22...
function clave(id) {
  const [, numero, sufijo] = /^CP-(\d+)([a-z]*)/.exec(id);
  return [Number(numero), sufijo];
}

const celda = (texto) => texto.replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();

export function generarReporte(resultados, fecha) {
  const suites = resultados.testResults ?? [];
  const filasSuite = suites
    .map((s) => {
      const pruebas = s.assertionResults ?? [];
      const pasan = pruebas.filter((p) => p.status === 'passed').length;
      const fallan = pruebas.filter((p) => p.status === 'failed').length;
      const segundos = Math.max(0, (s.endTime ?? 0) - (s.startTime ?? 0)) / 1000;
      return { suite: nombreDeSuite(s.name), total: pruebas.length, pasan, fallan, segundos };
    })
    .sort((a, b) => a.suite.localeCompare(b.suite));
  const suma = (campo) => filasSuite.reduce((acc, f) => acc + f[campo], 0);

  const casos = suites
    .flatMap((s) => s.assertionResults ?? [])
    .filter((p) => /^CP-\d+/.test(p.title))
    .map((p) => {
      const [, id, descripcion] = /^(CP-\d+[a-z]*)\s*(.*)$/s.exec(p.title);
      return { id, descripcion, estado: p.status };
    })
    .sort((a, b) => {
      const [na, sa] = clave(a.id);
      const [nb, sb] = clave(b.id);
      return na - nb || sa.localeCompare(sb);
    });

  const lineas = [
    '# Resultados de pruebas',
    '',
    `Generado el ${fecha} con \`node scripts/reporte-pruebas.mjs\` a partir de \`jest --json\` (apps/api). No se edita a mano.`,
    '',
    '## Resumen por suite',
    '',
    '| Suite | Pruebas | Pasan | Fallan | Tiempo (s) |',
    '| ----- | ------- | ----- | ------ | ---------- |',
    ...filasSuite.map(
      (f) => `| ${f.suite} | ${f.total} | ${f.pasan} | ${f.fallan} | ${f.segundos.toFixed(2)} |`,
    ),
    `| **Total** | **${suma('total')}** | **${suma('pasan')}** | **${suma('fallan')}** | **${suma('segundos').toFixed(2)}** |`,
    '',
    `Las pruebas pendientes (\`it.todo\`, \`skip\` o suites con base real sin \`TEST_DATABASE_URL\`) cuentan en "Pruebas" pero no en "Pasan" ni "Fallan".`,
    '',
    '## Casos CP',
    '',
    '| ID | Descripción | Resultado |',
    '| -- | ----------- | --------- |',
    ...casos.map((c) => `| ${c.id} | ${celda(c.descripcion)} | ${resultadoDe(c.estado)} |`),
    '',
  ];
  return lineas.join('\n');
}

function correrJest() {
  const dir = mkdtempSync(join(tmpdir(), 'h3ga-jest-'));
  const salida = join(dir, 'jest.json');
  try {
    // Jest sale con código 1 si hay pruebas que fallan; aun así queda el JSON, y el reporte las muestra.
    const r = spawnSync(
      process.execPath,
      [join(API, 'node_modules', 'jest', 'bin', 'jest.js'), '--json', `--outputFile=${salida}`],
      { cwd: API, stdio: ['ignore', 'ignore', 'inherit'] },
    );
    return { resultados: JSON.parse(readFileSync(salida, 'utf8')), codigo: r.status ?? 1 };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function principal() {
  const o = opciones(process.argv.slice(2));
  let resultados;
  let codigo = 0;
  if (o.entrada) {
    resultados = JSON.parse(readFileSync(resolve(o.entrada), 'utf8'));
  } else {
    ({ resultados, codigo } = correrJest());
  }
  const destino = resolve(o.salida ?? join(RAIZ, 'docs', 'pruebas-resultados.md'));
  writeFileSync(destino, generarReporte(resultados, o.fecha ?? fechaCancun()));
  console.log(`Reporte escrito en ${destino}`);
  process.exit(codigo);
}

// Solo corre como script, no al importarse.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    principal();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
