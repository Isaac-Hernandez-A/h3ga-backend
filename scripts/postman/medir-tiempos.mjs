// Mide tiempos de respuesta: corre 30 iteraciones de los flujos y consultas clave de la colección (todas las
// carpetas menos la matriz de acceso) y calcula p50, p95 y máximo por petición. Usa los mismos usuarios y
// datos que `pnpm pruebas:datos` (credenciales en .env.pruebas) y la API arrancada contra h3ga_test.
// Escribe docs/pruebas-integrales/tiempos.csv y tiempos.md. NO son tiempos de la nube: es un equipo local.
//   Uso: pnpm pruebas:tiempos     (variable opcional PRUEBAS_ITERACIONES, por defecto 30)
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import { resolve } from 'node:path';
import pg from 'pg';

const require = createRequire(import.meta.url);
const newman = require('newman');
const RAIZ = resolve(import.meta.dirname, '../..');
const POSTMAN = resolve(RAIZ, 'docs/pruebas-integrales/postman');
const SALIDA = resolve(RAIZ, 'docs/pruebas-integrales');
const env = process.env;
const ITERACIONES = Number(env.PRUEBAS_ITERACIONES ?? 30);
const UMBRAL_RNF01_MS = 5000; // requerimiento (RNF-01): agenda y avisos
const REFERENCIA_MS = 1000; // solo referencia
const salto = String.fromCharCode(10);

const ROLES = ['supervisor', 'asesor1', 'asesor2', 'auxiliar'];
const variables = [
  ['baseUrl', env.PRUEBAS_BASE_URL ?? 'http://localhost:3001/api/v1'],
  ...ROLES.flatMap((rol) => [
    [`${rol}Correo`, env[`PRUEBAS_${rol.toUpperCase()}_CORREO`] ?? ''],
    [`${rol}Contrasena`, env[`PRUEBAS_${rol.toUpperCase()}_CONTRASENA`] ?? ''],
  ]),
];

// Percentil por rango más cercano: el valor en la posición ceil(p x n) de la muestra ordenada.
const percentil = (ordenada, p) => ordenada[Math.max(0, Math.ceil(p * ordenada.length) - 1)];

async function tamanoDeDatos() {
  const cliente = new pg.Client({ connectionString: env.TEST_DATABASE_URL });
  await cliente.connect();
  try {
    const [{ version }] = (await cliente.query('SELECT version()')).rows;
    const filas = (
      await cliente.query(
        `SELECT (SELECT count(*) FROM clientes) AS clientes, (SELECT count(*) FROM eventos_agenda) AS eventos,
                (SELECT count(*) FROM avisos) AS avisos, (SELECT count(*) FROM etapas_tramite) AS etapas`,
      )
    ).rows[0];
    return {
      version,
      ...Object.fromEntries(Object.entries(filas).map(([k, v]) => [k, Number(v)])),
    };
  } finally {
    await cliente.end();
  }
}

const antes = await tamanoDeDatos();
const carpetas = [
  '00 Salud',
  '01 Acceso',
  '03 Clientes y etapas',
  '04 Documentos',
  '05 F0',
  '06 F1 por pasos',
  '07 Agenda y avisos',
  '08 Reportes',
  '09 ETL',
  '10 Consultas clave',
];

newman.run(
  {
    collection: resolve(POSTMAN, 'coleccion.json'),
    environment: resolve(POSTMAN, 'entorno.json'),
    envVar: variables.map(([key, value]) => ({ key, value })),
    folder: carpetas,
    reporters: [],
    workingDir: POSTMAN,
    insecureFileRead: true,
    iterationCount: ITERACIONES,
  },
  async (error, resumen) => {
    if (error) {
      console.error(error.message);
      process.exit(2);
    }
    const despues = await tamanoDeDatos();
    const grupos = new Map();
    for (const e of resumen.run.executions) {
      if (!e.response) continue;
      const clave = `${e.item.parent?.()?.name ?? ''}|${e.item.name}`;
      const g = grupos.get(clave) ?? {
        carpeta: e.item.parent?.()?.name ?? '',
        peticion: e.item.name,
        metodo: e.request.method,
        ruta: e.request.url
          .getPath()
          .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, ':id'),
        tiempos: [],
        codigos: new Set(),
      };
      g.tiempos.push(e.response.responseTime);
      g.codigos.add(e.response.code);
      grupos.set(clave, g);
    }

    const filas = [...grupos.values()].map((g) => {
      const t = [...g.tiempos].sort((a, b) => a - b);
      const rnf =
        g.metodo === 'GET' && /\/(agenda|avisos)$/.test(g.ruta) && [...g.codigos].join() === '200';
      const p95 = percentil(t, 0.95);
      return {
        carpeta: g.carpeta,
        peticion: g.peticion,
        metodo: g.metodo,
        ruta: g.ruta,
        codigos: [...g.codigos].join('/'),
        n: t.length,
        p50: percentil(t, 0.5),
        p95,
        max: t[t.length - 1],
        umbral: rnf ? `RNF-01 < ${UMBRAL_RNF01_MS} ms` : `referencia ${REFERENCIA_MS} ms`,
        cumple: rnf
          ? t[t.length - 1] < UMBRAL_RNF01_MS
            ? 'sí'
            : 'NO'
          : p95 <= REFERENCIA_MS
            ? 'sí (ref.)'
            : 'no (ref.)',
      };
    });

    const comillas = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      'carpeta,peticion,metodo,ruta,codigos_http,n,p50_ms,p95_ms,max_ms,umbral,cumple',
      ...filas.map((f) =>
        [
          comillas(f.carpeta),
          comillas(f.peticion),
          f.metodo,
          comillas(f.ruta),
          f.codigos,
          f.n,
          f.p50,
          f.p95,
          f.max,
          comillas(f.umbral),
          comillas(f.cumple),
        ].join(','),
      ),
    ].join(salto);
    mkdirSync(SALIDA, { recursive: true });
    writeFileSync(resolve(SALIDA, 'tiempos.csv'), csv + salto);

    const cpu = os.cpus();
    const rnfFilas = filas.filter((f) => f.umbral.startsWith('RNF-01'));
    const masLentas = [...filas].sort((a, b) => b.p95 - a.p95).slice(0, 10);
    const tabla = (lista) =>
      [
        '| Petición | Método y ruta | Códigos | n | p50 (ms) | p95 (ms) | Máx (ms) | Umbral |',
        '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |',
        ...lista.map(
          (f) =>
            `| ${f.peticion.replace(/\|/g, '/')} | ${f.metodo} ${f.ruta} | ${f.codigos} | ${f.n} | ${f.p50} | ${f.p95} | ${f.max} | ${f.umbral}: ${f.cumple} |`,
        ),
      ].join(salto);
    const md = [
      '# Tiempos de respuesta (Actividad 6)',
      '',
      `Medición: ${new Date(resumen.run.timings.started).toISOString()}. ${ITERACIONES} iteraciones de los flujos y las consultas clave de la colección de Postman, con Newman, contra la API local y la base de pruebas.`,
      '',
      '> **No son tiempos de la nube.** Se midieron en un equipo local, sin red ni balanceador, con una sola persona usando la API a la vez. Sirven para contrastar el RNF-01 en el entorno de pruebas, no para prometer tiempos en producción.',
      '',
      '## Entorno',
      '',
      `- CPU: ${cpu[0].model.trim()} (${cpu.length} hilos lógicos)`,
      `- RAM: ${(os.totalmem() / 1024 ** 3).toFixed(1)} GB`,
      `- Sistema: ${os.type()} ${os.release()} (${os.arch()})`,
      `- Node.js: ${process.version}`,
      `- PostgreSQL: ${antes.version.split(',')[0]} (contenedor local de Docker)`,
      `- Datos antes de medir: ${antes.clientes} clientes, ${antes.etapas} etapas, ${antes.eventos} eventos de agenda y ${antes.avisos} avisos (pnpm pruebas:datos carga 44 clientes del Excel ficticio por el ETL y 1,000 eventos del Asesor 1; el resto de los clientes quedó en h3ga_test por otras suites del backend, que no se borran).`,
      `- Datos después de medir: ${despues.clientes} clientes, ${despues.etapas} etapas, ${despues.eventos} eventos y ${despues.avisos} avisos (los flujos crean un cliente, un evento y avisos por iteración).`,
      '',
      '## Cómo se calcula',
      '',
      `Cada petición se ejecutó ${ITERACIONES} veces (una por iteración, incluida la primera, que no se descarta aunque tenga el arranque en frío). Percentiles por rango más cercano: p50 y p95 son el valor en la posición ceil(p x n) de la muestra ordenada. "Máx" es el mayor tiempo observado.`,
      '',
      `- **Requerimiento (RNF-01):** agenda y avisos, menos de ${UMBRAL_RNF01_MS / 1000} s. Se evalúa contra el **máximo**.`,
      `- **Referencia:** ${REFERENCIA_MS / 1000} s para el resto, evaluada contra p95. No es un requerimiento; no se usó para aprobar o reprobar nada.`,
      '',
      '## RNF-01: agenda y avisos',
      '',
      tabla(rnfFilas),
      '',
      '## Las 10 peticiones con mayor p95',
      '',
      tabla(masLentas),
      '',
      '## Todas las peticiones',
      '',
      `El detalle completo está en \`tiempos.csv\` (${filas.length} peticiones).`,
      '',
    ].join(salto);
    writeFileSync(resolve(SALIDA, 'tiempos.md'), md);
    console.log(
      `Tiempos: ${filas.length} peticiones x ${ITERACIONES} iteraciones. Aserciones fallidas: ${resumen.run.stats.assertions.failed}.`,
    );
    for (const f of rnfFilas)
      console.log(
        `RNF-01 ${f.peticion}: p50 ${f.p50} ms, p95 ${f.p95} ms, máx ${f.max} ms -> ${f.cumple}`,
      );
    process.exit(0);
  },
);
