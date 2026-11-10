// Crea (o actualiza) el usuario Supervisor inicial. Uso: pnpm db:seed:supervisor
//
// Variables de entorno (se leen del .env; ver .env.example):
//   DATABASE_URL                 base a la que se conecta (solo local, salvo --permitir-remota)
//   SEED_SUPERVISOR_CORREO       correo del Supervisor
//   SEED_SUPERVISOR_CONTRASENA   contraseña (8 a 72 caracteres); se cifra con bcrypt, costo 10
//   SEED_SUPERVISOR_NOMBRE       nombre (opcional; por defecto "Supervisor")
//
// - Busca el correo sin distinguir mayúsculas: si ya existe, actualiza su contraseña y lo deja activo con el
//   rol Supervisor; si no, lo crea. Repetirlo no duplica.
// - La contraseña no se guarda en el repositorio ni se imprime; en la base solo queda el hash.
// - Los apellidos son obligatorios en la tabla: se guardan "Administrador" (paterno) e "Inicial" (materno).
import { createRequire } from 'node:module';
import pg from 'pg';

const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const ROL_SUPERVISOR = 3; // roles.id de "Supervisor Operativo (Admin)" (migración 202610301007)
const COSTO_BCRYPT = 10; // el mismo que BcryptPasswordHasher
const requerir = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { hash } = requerir('bcryptjs');

function fallar(mensaje) {
  console.error(`Error: ${mensaje}`);
  process.exit(1);
}

const permitirRemota = process.argv.slice(2).includes('--permitir-remota');
const { DATABASE_URL, SEED_SUPERVISOR_CORREO, SEED_SUPERVISOR_CONTRASENA } = process.env;
const nombre = process.env.SEED_SUPERVISOR_NOMBRE?.trim() || 'Supervisor';

const faltan = ['SEED_SUPERVISOR_CORREO', 'SEED_SUPERVISOR_CONTRASENA'].filter(
  (variable) => !process.env[variable]?.trim(),
);
if (faltan.length) fallar(`faltan variables de entorno: ${faltan.join(', ')} (ver .env.example).`);
if (!DATABASE_URL) fallar('falta DATABASE_URL (defínela en .env).');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(SEED_SUPERVISOR_CORREO.trim())) {
  fallar('SEED_SUPERVISOR_CORREO no parece un correo válido.');
}
if (SEED_SUPERVISOR_CONTRASENA.length < 8 || SEED_SUPERVISOR_CONTRASENA.length > 72) {
  fallar('SEED_SUPERVISOR_CONTRASENA debe tener entre 8 y 72 caracteres.');
}

let host;
try {
  host = new URL(DATABASE_URL).hostname;
} catch {
  fallar('DATABASE_URL no es una URL válida.');
}
if (!HOSTS_LOCALES.has(host) && !permitirRemota) {
  fallar(
    `DATABASE_URL apunta a "${host}", que no es una base local. ` +
      'Hoy cada estudiante usa su base local; para otra, agrega --permitir-remota.',
  );
}

const correo = SEED_SUPERVISOR_CORREO.trim();
const contrasenaHash = await hash(SEED_SUPERVISOR_CONTRASENA, COSTO_BCRYPT);

const cliente = new pg.Client({ connectionString: DATABASE_URL });
await cliente.connect();
try {
  await cliente.query('BEGIN');
  const existente = await cliente.query(
    'SELECT id FROM usuarios WHERE LOWER(correo_electronico) = LOWER($1) ORDER BY fecha_creacion LIMIT 1',
    [correo],
  );
  if (existente.rows.length) {
    await cliente.query(
      'UPDATE usuarios SET rol_id = $2, contrasena_hash = $3, activo = true WHERE id = $1',
      [existente.rows[0].id, ROL_SUPERVISOR, contrasenaHash],
    );
    console.log(`Supervisor actualizado: ${correo}`);
  } else {
    await cliente.query(
      `INSERT INTO usuarios (rol_id, nombre, apellido_paterno, apellido_materno,
         correo_electronico, contrasena_hash, activo, fecha_creacion)
       VALUES ($1, $2, 'Administrador', 'Inicial', $3, $4, true, now())`,
      [ROL_SUPERVISOR, nombre, correo, contrasenaHash],
    );
    console.log(`Supervisor creado: ${correo}`);
  }
  await cliente.query('COMMIT');
} catch (error) {
  await cliente.query('ROLLBACK').catch(() => undefined);
  fallar(`no se pudo guardar el Supervisor (${error.code ?? error.message}).`);
} finally {
  await cliente.end();
}
