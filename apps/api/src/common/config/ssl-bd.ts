// TLS hacia PostgreSQL, activable por variable de entorno. Sin DATABASE_SSL todo queda como en local (sin TLS).
//
//   DATABASE_SSL     vacío, false, 0 o disable: sin TLS (por defecto)
//                    true o require:            TLS verificando el certificado del servidor
//                    no-verify:                 TLS sin verificar el certificado (solo para depurar)
//   DATABASE_SSL_CA  contenido PEM de la CA del servidor (opcional); acepta los saltos de línea escritos como \n
//
// db/ssl-bd.mjs repite esta lógica para los scripts de migración (que son .mjs); ssl-bd.spec.ts comprueba
// que den lo mismo.
export interface OpcionesSsl {
  rejectUnauthorized: boolean;
  ca?: string;
}

export function opcionesSslBd(env: Record<string, string | undefined>): OpcionesSsl | undefined {
  const modo = (env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (['', 'false', '0', 'disable'].includes(modo)) return undefined;
  if (modo === 'no-verify') return { rejectUnauthorized: false };
  if (modo === 'true' || modo === 'require') {
    const ca = (env.DATABASE_SSL_CA ?? '').trim().replace(/\\n/g, '\n');
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
