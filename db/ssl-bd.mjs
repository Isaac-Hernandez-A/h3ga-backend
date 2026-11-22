// TLS hacia PostgreSQL para los scripts de db/ (migrate, seed-supervisor). Misma lógica que
// apps/api/src/common/config/ssl-bd.ts; ssl-bd.spec.ts comprueba que den lo mismo.
//
//   DATABASE_SSL     vacío, false, 0 o disable: sin TLS (por defecto)
//                    true o require:            TLS verificando el certificado del servidor
//                    no-verify:                 TLS sin verificar el certificado (solo para depurar)
//   DATABASE_SSL_CA  contenido PEM de la CA del servidor (opcional); acepta los saltos de línea escritos como \n

export function opcionesSslBd(env) {
  const modo = (env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (['', 'false', '0', 'disable'].includes(modo)) return undefined;
  if (modo === 'no-verify') return { rejectUnauthorized: false };
  if (modo === 'true' || modo === 'require') {
    const ca = (env.DATABASE_SSL_CA ?? '').trim().replace(/\\n/g, '\n');
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
