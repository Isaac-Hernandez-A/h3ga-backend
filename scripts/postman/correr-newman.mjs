// Corre la colección de Postman con Newman contra la API local (h3ga_test).
// Las credenciales NO están en el repositorio: se leen de variables de entorno (ver entorno.json).
//   PRUEBAS_BASE_URL (por defecto http://localhost:3001/api/v1)
//   PRUEBAS_SUPERVISOR_CORREO / _CONTRASENA, PRUEBAS_ASESOR1_..., PRUEBAS_ASESOR2_..., PRUEBAS_AUXILIAR_...
// Salidas en docs/pruebas-integrales/postman/: newman-reporte.json (resumen, sin cuerpos ni cabeceras),
// newman-reporte.html y matriz-resultados.csv. Ningún reporte guarda contraseñas ni tokens.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const newman = require('newman');
const carpeta = resolve(import.meta.dirname, '../../docs/pruebas-integrales/postman');
const env = process.env;
const salto = String.fromCharCode(10);

const ROLES = ['supervisor', 'asesor1', 'asesor2', 'auxiliar'];
const variables = [
  ['baseUrl', env.PRUEBAS_BASE_URL ?? 'http://localhost:3001/api/v1'],
  ...ROLES.flatMap((rol) => [
    [`${rol}Correo`, env[`PRUEBAS_${rol.toUpperCase()}_CORREO`] ?? ''],
    [`${rol}Contrasena`, env[`PRUEBAS_${rol.toUpperCase()}_CONTRASENA`] ?? ''],
  ]),
];
const contrasenas = ROLES.map((rol) => env[`PRUEBAS_${rol.toUpperCase()}_CONTRASENA`]).filter(
  Boolean,
);

// Quita de un texto cualquier JWT y cualquier contraseña de prueba.
function limpiar(texto) {
  let salida = texto.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[JWT]');
  for (const c of contrasenas) salida = salida.split(c).join('[CONTRASENA]');
  return salida;
}

newman.run(
  {
    collection: resolve(carpeta, 'coleccion.json'),
    environment: resolve(carpeta, 'entorno.json'),
    envVar: variables.map(([key, value]) => ({ key, value })),
    reporters: ['cli', 'htmlextra'],
    reporter: {
      htmlextra: {
        export: resolve(carpeta, 'newman-reporte.html'),
        omitHeaders: true,
        omitRequestBodies: true,
        omitResponseBodies: true,
        title: 'H3GA pruebas integrales (Actividad 6)',
      },
    },
    workingDir: carpeta,
    insecureFileRead: true,
    iterationCount: Number(env.PRUEBAS_ITERACIONES ?? 1),
  },
  (error, resumen) => {
    if (error) {
      console.error(error.message);
      process.exit(2);
    }
    const run = resumen.run;
    const porEjecucion = run.executions.map((e) => ({
      carpeta: e.item.parent?.()?.name,
      peticion: e.item.name,
      metodo: e.request?.method,
      url: limpiar(e.request?.url?.toString() ?? ''),
      codigo: e.response?.code ?? null,
      tiempo_ms: e.response?.responseTime ?? null,
      aserciones: (e.assertions ?? []).map((a) => ({
        nombre: a.assertion,
        paso: !a.error,
        ...(a.error ? { error: limpiar(a.error.message) } : {}),
      })),
    }));
    const reporte = {
      coleccion: resumen.collection.name,
      inicio: new Date(run.timings.started).toISOString(),
      duracion_ms: run.timings.completed - run.timings.started,
      totales: {
        peticiones: run.stats.requests.total,
        peticiones_falladas: run.stats.requests.failed,
        aserciones: run.stats.assertions.total,
        aserciones_falladas: run.stats.assertions.failed,
        scripts_de_prueba_con_error: run.stats.testScripts.failed,
      },
      fallas: run.failures.map((f) => ({
        peticion: f.source?.name,
        aserciones: f.error?.test,
        mensaje: limpiar(f.error?.message ?? ''),
      })),
      ejecuciones: porEjecucion,
    };
    writeFileSync(
      resolve(carpeta, 'newman-reporte.json'),
      JSON.stringify(reporte, null, 2) + salto,
    );
    const rutaHtml = resolve(carpeta, 'newman-reporte.html');
    writeFileSync(rutaHtml, limpiar(readFileSync(rutaHtml, 'utf8')));

    // Registro del código obtenido en cada fila de la matriz de acceso (carpeta 02).
    const filas = ['rol,metodo,ruta,esperado,codigo_obtenido,tiempo_ms'];
    for (const e of run.executions) {
      const m = /^\[(\w+)\] (\w+) (\S+) \| esperado: (.+)$/.exec(e.item.name);
      if (m && e.response) {
        filas.push([m[1], m[2], m[3], m[4], e.response.code, e.response.responseTime].join(','));
      }
    }
    writeFileSync(resolve(carpeta, 'matriz-resultados.csv'), filas.join(salto) + salto);
    process.exit(run.failures.length > 0 ? 1 : 0);
  },
);
