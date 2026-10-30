// Genera un JWT de PRUEBA para desarrollo, con el contrato del token: HS256, claims sub, rol, exp.
// Uso: pnpm dev:token --rol asesor [--sub <uuid>]
// Imprime solo el token por stdout. El secreto sale de JWT_SECRET (.env); nunca se escribe en código.
// Se niega a ejecutarse si NODE_ENV=production. El token real lo emite el módulo de login.
import { createHmac, randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

const ROLES = ['asesor', 'auxiliar', 'supervisor'];
const JWT_SECRET_EJEMPLO = 'CAMBIAR_SECRETO_JWT';
const VIGENCIA_SEGUNDOS = 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fallar(mensaje) {
  console.error(`Error: ${mensaje}`);
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  fallar('dev:token no se ejecuta con NODE_ENV=production.');
}

let valores;
try {
  ({ values: valores } = parseArgs({
    options: { rol: { type: 'string' }, sub: { type: 'string' } },
    strict: true,
  }));
} catch (e) {
  fallar(`${e.message}\nUso: pnpm dev:token --rol <${ROLES.join('|')}> [--sub <uuid>]`);
}

if (!ROLES.includes(valores.rol)) {
  fallar(`--rol es obligatorio y debe ser uno de: ${ROLES.join(', ')}.`);
}
if (valores.sub !== undefined && !UUID.test(valores.sub)) {
  fallar('--sub debe ser un uuid (el id de usuarios.id).');
}

const secreto = process.env.JWT_SECRET;
if (!secreto || secreto.trim() === '' || secreto === JWT_SECRET_EJEMPLO) {
  fallar('define JWT_SECRET en .env con un valor propio (no el de ejemplo).');
}

const base64url = (objeto) => Buffer.from(JSON.stringify(objeto)).toString('base64url');
const ahora = Math.floor(Date.now() / 1000);
const sub = valores.sub ?? randomUUID();
const cuerpo = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub, rol: valores.rol, iat: ahora, exp: ahora + VIGENCIA_SEGUNDOS })}`;
const firma = createHmac('sha256', secreto).update(cuerpo).digest('base64url');

console.error(`Token de prueba: rol=${valores.rol} sub=${sub} (vigencia 1 hora)`);
console.log(`${cuerpo}.${firma}`);
