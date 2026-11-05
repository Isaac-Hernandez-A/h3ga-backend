import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

// Jest no lee .env. Se carga SOLO TEST_DATABASE_URL del .env de la raíz (si existe y la variable no está
// ya definida), para que `npx jest` encuentre la base de pruebas sin exponer el resto de la configuración.
const archivo = resolve(__dirname, '../../../../../.env');
if (!process.env.TEST_DATABASE_URL && existsSync(archivo)) {
  const valor = parseEnv(readFileSync(archivo, 'utf8')).TEST_DATABASE_URL;
  if (valor) process.env.TEST_DATABASE_URL = valor;
}
