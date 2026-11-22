const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export interface OpcionesDestino {
  // --permitir-staging: acepta una base remota o con otro nombre (una base de staging). Sin el flag solo se
  // admite una base local cuyo nombre termina en _test.
  permitirStaging?: boolean;
}

// Valida la base contra la que corre pnpm pruebas:datos. Los mensajes no incluyen la URL (trae la contraseña).
export function validarBdPruebas(url: string | undefined, opciones: OpcionesDestino): string {
  if (!url) throw new Error('Falta TEST_DATABASE_URL (defínela en .env).');
  let destino: URL;
  try {
    destino = new URL(url);
  } catch {
    throw new Error('TEST_DATABASE_URL no es una URL válida.');
  }
  const nombre = decodeURIComponent(destino.pathname.replace(/^\//, ''));
  if (nombre === '') throw new Error('TEST_DATABASE_URL no indica el nombre de la base.');
  if (opciones.permitirStaging) return url;
  if (!HOSTS_LOCALES.has(destino.hostname)) {
    throw new Error('La base de pruebas debe ser local (para staging usa --permitir-staging).');
  }
  if (!/^[a-z0-9_]+_test$/.test(nombre)) {
    throw new Error(
      'La base de pruebas debe llamarse *_test (para staging usa --permitir-staging).',
    );
  }
  return url;
}

// Servidor y base, sin usuario ni contraseña: para avisar a qué base se va a escribir.
export function describirDestino(url: string): string {
  const destino = new URL(url);
  return `${destino.hostname}${destino.port ? `:${destino.port}` : ''}/${decodeURIComponent(destino.pathname.replace(/^\//, ''))}`;
}
