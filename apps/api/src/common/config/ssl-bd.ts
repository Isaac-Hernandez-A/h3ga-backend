// TLS hacia PostgreSQL, activable por variable de entorno. Sin DATABASE_SSL todo queda como en local (sin TLS).
//
//   DATABASE_SSL     vacío, false, 0 o disable: sin TLS (por defecto)
//                    true o require:            TLS verificando el certificado del servidor
//                    no-verify:                 TLS sin verificar el certificado (solo para depurar)
//   DATABASE_SSL_CA  PEM de la CA del servidor (opcional); tolera \n escritos, CRLF, una sola línea y comillas
//   DATABASE_SSL_CA_BASE64  el mismo PEM en base64 (recomendado en paneles); manda sobre DATABASE_SSL_CA
//
// db/ssl-bd.mjs repite esta lógica para los scripts de migración (que son .mjs); ssl-bd.spec.ts comprueba
// que den lo mismo.
const MARCAS = /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const sinComillas = (t: string) => t.trim().replace(/^(["'])([\s\S]*)\1$/, '$2');

// Reconstruye un PEM bien formado a partir de lo que pegue el panel: saltos reales, \n escritos como texto,
// CRLF, aplanado en una línea con espacios, entre comillas o solo el cuerpo base64. Si pg recibe una CA
// ilegible la descarta sin avisar y verifica contra las raíces del sistema (SELF_SIGNED_CERT_IN_CHAIN).
function normalizarPem(texto: string, variable: string): string {
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
        `-----BEGIN CERTIFICATE-----\n${c.match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----`,
    )
    .join('\n');
}

// DATABASE_SSL_CA_BASE64 (el PEM completo en base64) no depende de los saltos de línea del panel y manda
// sobre DATABASE_SSL_CA.
function leerCa(env: Record<string, string | undefined>): string | undefined {
  const b64 = sinComillas(env.DATABASE_SSL_CA_BASE64 ?? '').replace(/\s+/g, '');
  if (b64) {
    if (!BASE64.test(b64)) throw new Error('DATABASE_SSL_CA_BASE64 no es base64 válido.');
    return normalizarPem(Buffer.from(b64, 'base64').toString('utf8'), 'DATABASE_SSL_CA_BASE64');
  }
  const ca = (env.DATABASE_SSL_CA ?? '').trim();
  return ca ? normalizarPem(ca, 'DATABASE_SSL_CA') : undefined;
}

export interface OpcionesSsl {
  rejectUnauthorized: boolean;
  ca?: string;
}

export function opcionesSslBd(env: Record<string, string | undefined>): OpcionesSsl | undefined {
  const modo = (env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (['', 'false', '0', 'disable'].includes(modo)) return undefined;
  if (modo === 'no-verify') return { rejectUnauthorized: false };
  if (modo === 'true' || modo === 'require') {
    const ca = leerCa(env);
    return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
  }
  throw new Error('DATABASE_SSL debe ser true, no-verify o false.');
}

// La URL que entrega el proveedor suele traer ?sslmode=require. Se quita para que mande DATABASE_SSL y no
// dos criterios distintos.
export function urlSinSslmode(url: string): string {
  return url
    .replace(/([?&])sslmode=[^&]*&?/i, (_m, sep: string) => (_m.endsWith('&') ? sep : ''))
    .replace(/[?&]$/, '');
}
