// Prepara la base de datos de PRUEBAS: la crea si no existe y le aplica las migraciones.
// Uso: pnpm db:test:prepare   (lee TEST_DATABASE_URL del .env)
// Seguridad: solo corre contra una base local cuyo nombre termina en "_test"; nunca toca la de desarrollo.
// Solo CREA la base (no hay DROP): para empezar de cero se hace a mano.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function fallar(mensaje) {
  console.error(`Error: ${mensaje}`);
  process.exit(1);
}

const url = process.env.TEST_DATABASE_URL;
if (!url) fallar('falta TEST_DATABASE_URL (defínela en .env; ver .env.example).');

let destino;
try {
  destino = new URL(url);
} catch {
  fallar('TEST_DATABASE_URL no es una URL válida.');
}
const nombre = decodeURIComponent(destino.pathname.replace(/^\//, ''));
if (!HOSTS_LOCALES.has(destino.hostname)) fallar(`"${destino.hostname}" no es un host local.`);
if (!/^[a-z0-9_]+_test$/.test(nombre)) {
  fallar(
    `el nombre de la base ("${nombre}") debe terminar en "_test" y usar solo minúsculas, dígitos y guion bajo.`,
  );
}

// Conexión de mantenimiento: la base "postgres" del mismo servidor.
const mantenimiento = new URL(url);
mantenimiento.pathname = '/postgres';
const cliente = new pg.Client({ connectionString: mantenimiento.toString() });
await cliente.connect();
try {
  const existe = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombre]);
  if (existe.rowCount === 0) {
    await cliente.query(`CREATE DATABASE "${nombre}"`);
    console.log(`Base de pruebas creada: ${nombre}`);
  } else {
    console.log(`Base de pruebas existente: ${nombre}`);
  }
} finally {
  await cliente.end();
}

const migrar = join(dirname(fileURLToPath(import.meta.url)), 'migrate.mjs');
const resultado = spawnSync(process.execPath, [migrar], {
  env: { ...process.env, DATABASE_URL: url },
  stdio: 'inherit',
});
process.exit(resultado.status ?? 1);
