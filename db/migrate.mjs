// Runner de migraciones SQL versionadas (db/migrations/AAAAMMDDHHMM_descripcion.sql).
// Uso: pnpm db:migrate [--dry-run] [--permitir-remota]
//
// - Aplica en orden los archivos pendientes; cada uno en su propia transacción.
// - Registra lo aplicado en la tabla schema_migrations (versión, nombre, checksum, fecha).
// - --dry-run: lista lo pendiente sin tocar la base (ni siquiera crea schema_migrations).
// - Rechaza migraciones con DROP o TRUNCATE (regla 1 de CLAUDE.md); solo admite DROP NOT NULL (relaja una
//   restricción sin borrar nada).
// - Por defecto solo corre contra una base local; para otra hay que pasar --permitir-remota.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
const NOMBRE_VALIDO = /^(\d{12})_[a-z0-9_]+\.sql$/;
const PROHIBIDO = /\b(DROP|TRUNCATE)\b/i;
const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const permitirRemota = args.has('--permitir-remota');

function fallar(mensaje) {
  console.error(`Error: ${mensaje}`);
  process.exit(1);
}

const sinComentarios = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
// ALTER COLUMN ... DROP NOT NULL solo relaja una restricción (no borra columnas, tablas ni datos): es la única
// forma de DROP que se admite; DROP TABLE, DROP COLUMN, etc. siguen prohibidos.
const sinRelajaciones = (sql) => sql.replace(/\bDROP\s+NOT\s+NULL\b/gi, '');
// Se normalizan los saltos de línea para que el checksum no dependa de CRLF/LF (autocrlf en Windows).
const checksum = (sql) => createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');

async function leerMigraciones() {
  const nombres = (await readdir(MIGRATIONS_DIR)).filter((n) => n.endsWith('.sql')).sort();
  const migraciones = [];
  for (const nombre of nombres) {
    const m = NOMBRE_VALIDO.exec(nombre);
    if (!m)
      fallar(
        `el nombre "${nombre}" no cumple AAAAMMDDHHMM_descripcion.sql (minúsculas y guion bajo).`,
      );
    const sql = await readFile(join(MIGRATIONS_DIR, nombre), 'utf8');
    if (PROHIBIDO.test(sinRelajaciones(sinComentarios(sql))))
      fallar(`"${nombre}" contiene DROP o TRUNCATE, prohibidos por CLAUDE.md.`);
    migraciones.push({ version: m[1], nombre, sql, checksum: checksum(sql) });
  }
  const repetidas = migraciones.filter(
    (m, i) => migraciones.findIndex((o) => o.version === m.version) !== i,
  );
  if (repetidas.length)
    fallar(`versiones repetidas: ${repetidas.map((m) => m.version).join(', ')}.`);
  return migraciones;
}

const url = process.env.DATABASE_URL;
if (!url) fallar('falta DATABASE_URL (defínela en .env).');
let host;
try {
  host = new URL(url).hostname;
} catch {
  fallar('DATABASE_URL no es una URL válida.');
}
if (!HOSTS_LOCALES.has(host) && !permitirRemota) {
  fallar(
    `DATABASE_URL apunta a "${host}", que no es local. Si es intencional, agrega --permitir-remota.`,
  );
}

const migraciones = await leerMigraciones();
const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const existe =
    (await client.query("SELECT to_regclass('public.schema_migrations') AS t")).rows[0].t !== null;
  if (!existe && !dryRun) {
    await client.query(`CREATE TABLE schema_migrations (
      version     CHAR(12) PRIMARY KEY,
      nombre      TEXT NOT NULL,
      checksum    CHAR(64) NOT NULL,
      aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  }
  const aplicadas = new Map();
  if (existe || !dryRun) {
    for (const r of (await client.query('SELECT version, checksum FROM schema_migrations')).rows) {
      aplicadas.set(r.version.trim(), r.checksum.trim());
    }
  }

  for (const m of migraciones) {
    const previo = aplicadas.get(m.version);
    if (previo && previo !== m.checksum)
      fallar(
        `"${m.nombre}" ya se aplicó y su contenido cambió. Crea una migración nueva en lugar de editarla.`,
      );
  }
  const conocidas = new Set(migraciones.map((m) => m.version));
  for (const v of aplicadas.keys())
    if (!conocidas.has(v))
      fallar(`la base tiene aplicada la versión ${v} que no existe en db/migrations.`);

  const pendientes = migraciones.filter((m) => !aplicadas.has(m.version));
  if (!pendientes.length) {
    console.log('Base al día: no hay migraciones pendientes.');
  } else if (dryRun) {
    console.log(`[dry-run] Pendientes (${pendientes.length}); no se aplicó nada:`);
    for (const m of pendientes) console.log(`  - ${m.nombre}`);
  } else {
    await client.query('SELECT pg_advisory_lock(727001)'); // evita corridas simultáneas
    for (const m of pendientes) {
      try {
        await client.query('BEGIN');
        await client.query(m.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, nombre, checksum) VALUES ($1, $2, $3)',
          [m.version, m.nombre, m.checksum],
        );
        await client.query('COMMIT');
        console.log(`  aplicada: ${m.nombre}`);
      } catch (e) {
        await client.query('ROLLBACK');
        fallar(`falló "${m.nombre}" (se revirtió): ${e.message}`);
      }
    }
    console.log(`Listo: ${pendientes.length} migración(es) aplicada(s).`);
  }
} finally {
  await client.end();
}
