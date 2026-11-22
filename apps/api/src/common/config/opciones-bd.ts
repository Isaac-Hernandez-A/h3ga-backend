import { OpcionesSsl, opcionesSslBd, urlSinSslmode } from './ssl-bd';

export interface OpcionesBd {
  type: 'postgres';
  url: string;
  ssl?: OpcionesSsl;
  autoLoadEntities: true;
  synchronize: false;
  migrationsRun: false;
  uuidExtension: 'pgcrypto';
}

// Opciones de TypeORM. CLAUDE.md regla 1: el esquema solo cambia con migraciones SQL versionadas, así que
// synchronize y migrationsRun son siempre false. DATABASE_SSL activa TLS (ver ssl-bd.ts).
export function opcionesBd(env: Record<string, string | undefined>): OpcionesBd {
  const url = env.DATABASE_URL?.trim();
  if (!url) throw new Error('Falta DATABASE_URL.');
  const ssl = opcionesSslBd(env);
  return {
    type: 'postgres',
    url: ssl ? urlSinSslmode(url) : url,
    ...(ssl ? { ssl } : {}),
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
    uuidExtension: 'pgcrypto',
  };
}
