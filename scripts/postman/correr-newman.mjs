// Corre la colección de Postman con Newman contra la API local (h3ga_test).
// Las credenciales NO están en el repositorio: se leen de variables de entorno (ver entorno.json).
//   PRUEBAS_BASE_URL (por defecto http://localhost:3001/api/v1)
//   PRUEBAS_SUPERVISOR_CORREO / _CONTRASENA, PRUEBAS_ASESOR1_..., PRUEBAS_ASESOR2_..., PRUEBAS_AUXILIAR_...
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const newman = require('newman');
const carpeta = resolve(import.meta.dirname, '../../docs/pruebas-integrales/postman');
const env = process.env;

const variables = [
  ['baseUrl', env.PRUEBAS_BASE_URL ?? 'http://localhost:3001/api/v1'],
  ...['supervisor', 'asesor1', 'asesor2', 'auxiliar'].flatMap((rol) => [
    [`${rol}Correo`, env[`PRUEBAS_${rol.toUpperCase()}_CORREO`] ?? ''],
    [`${rol}Contrasena`, env[`PRUEBAS_${rol.toUpperCase()}_CONTRASENA`] ?? ''],
  ]),
];

newman.run(
  {
    collection: resolve(carpeta, 'coleccion.json'),
    environment: resolve(carpeta, 'entorno.json'),
    envVar: variables.map(([key, value]) => ({ key, value })),
    reporters: ['cli', 'json', 'htmlextra'],
    reporter: {
      json: { export: resolve(carpeta, 'newman-reporte.json') },
      htmlextra: { export: resolve(carpeta, 'newman-reporte.html') },
    },
    iterationCount: Number(env.PRUEBAS_ITERACIONES ?? 1),
  },
  (error, resumen) => {
    if (error) {
      console.error(error.message);
      process.exit(2);
    }
    process.exit(resumen.run.failures.length > 0 ? 1 : 0);
  },
);
