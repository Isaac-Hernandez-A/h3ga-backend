// TLS hacia PostgreSQL para los scripts de db/ (migrate, seed-supervisor). Misma lógica que
// apps/api/src/common/config/ssl-bd.ts; ssl-bd.spec.ts comprueba que den lo mismo.
//
//   DATABASE_SSL     vacío, false, 0 o disable: sin TLS (por defecto)
//                    true o require:            TLS verificando el certificado del servidor
//                    no-verify:                 TLS sin verificar el certificado (solo para depurar)
//   DATABASE_SSL_CA  PEM de la CA del servidor (opcional); tolera \n escritos, CRLF, una sola línea y comillas
//   DATABASE_SSL_CA_BASE64  el mismo PEM en base64 (recomendado en paneles); manda sobre DATABASE_SSL_CA

const MARCAS = /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const sinComillas = (t) => t.trim().replace(/^(["'])([\s\S]*)\1$/, '$2');

function normalizarPem(texto, variable) {
  const plano = sinComillas(texto).replace(/\\r/g, '').replace(/\\n/g, '\n');
  const cuerpos = [...plano.matchAll(MARCAS)].map((m) => m[1]);
  if (cuerpos.length === 0 && !plano.includes('-----')) cuerpos.push(plano);
  const bloques = cuerpos.map((c) => c.replace(/\s+/g, '')).filter((c) => c !== '');
  if (bloques.length === 0 || bloques.some((c) => !BASE64.test(c))) {
    throw new Error(`${variable} no contiene un certificado PEM legible.`);
  }
  return bloques
    .map(
      (c) =>
        `-----BEGIN CERTIFICATE-----\n${c.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`,
    )
    .join('\n');
}

function leerCa(env) {
  const b64 = sinComillas(env.DATABASE_SSL_CA_BASE64 ?? '').replace(/\s+/g, '');
  if (b64) {
    if (!BASE64.test(b64)) throw new Error('DATABASE_SSL_CA_BASE64 no es base64 válido.');
    return normalizarPem(Buffer.from(b64, 'base64').toString('utf8'), 'DATABASE_SSL_CA_BASE64');
  }
  const ca = (env.DATABASE_SSL_CA ?? '').trim();
  return ca ? normalizarPem(ca, 'DATABASE_SSL_CA') : undefined;
}

export function opcionesSslBd(env) {
  const modo = (env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (['', 'false', '0', 'disable'].includes(modo)) return undefined;
  if (modo === 'no-verify') return { rejectUnauthorized: false };
  if (modo === 'true' || modo === 'require') {
    const ca = leerCa(env);
    return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
  }
  throw new Error('DATABASE_SSL debe ser true, no-verify o false.');
}

// La URL del proveedor suele traer ?sslmode=require; se quita para que mande DATABASE_SSL.
export function urlSinSslmode(url) {
  return url
    .replace(/([?&])sslmode=[^&]*&?/i, (m, sep) => (m.endsWith('&') ? sep : ''))
    .replace(/[?&]$/, '');
}

// Opciones de pg.Client para una URL: con TLS activo quita sslmode de la URL y agrega ssl.
export function opcionesCliente(url, env) {
  const ssl = opcionesSslBd(env);
  return ssl ? { connectionString: urlSinSslmode(url), ssl } : { connectionString: url };
}
