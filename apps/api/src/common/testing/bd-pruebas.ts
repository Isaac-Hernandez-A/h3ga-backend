import { INestApplication } from '@nestjs/common';
import { AddressInfo } from 'node:net';
import { DataSource } from 'typeorm';
import { configureApp } from '../../app.setup';
import { SECRETO_PRUEBA } from './tokens';

// Pruebas contra una base PostgreSQL REAL de pruebas (transacciones, restricciones, concurrencia).
// Nunca contra la de desarrollo: el nombre de la base debe terminar en "_test" y el host ser local.
// La base la crea y migra `pnpm db:test:prepare`. Sin TEST_DATABASE_URL, estas suites se omiten.
const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function validarUrlBdPruebas(url: string): string {
  const destino = new URL(url);
  const nombre = decodeURIComponent(destino.pathname.replace(/^\//, ''));
  if (!HOSTS_LOCALES.has(destino.hostname)) {
    throw new Error(`La base de pruebas debe ser local; "${destino.hostname}" no lo es.`);
  }
  if (!/^[a-z0-9_]+_test$/.test(nombre)) {
    throw new Error(`La base de pruebas debe llamarse *_test; "${nombre}" no cumple.`);
  }
  return url;
}

export function urlBdPruebas(): string | undefined {
  const url = process.env.TEST_DATABASE_URL;
  return url ? validarUrlBdPruebas(url) : undefined;
}

// Uso: describeConBd('suite', () => { ... }). Se omite si no hay base de pruebas configurada.
export const describeConBd: typeof describe = urlBdPruebas() ? describe : describe.skip;

export interface AppConBd {
  app: INestApplication;
  base: string;
  ds: DataSource;
}

// Levanta la aplicación REAL (AppModule) contra la base de pruebas, con guards, filtros y pipes de
// producción. AppModule se importa aquí, después de fijar el entorno, porque ConfigModule lo lee al cargarse.
export async function iniciarAppConBd(): Promise<AppConBd> {
  const url = urlBdPruebas();
  if (!url)
    throw new Error('Falta TEST_DATABASE_URL: no se puede iniciar la aplicación de pruebas.');
  process.env.DATABASE_URL = url;
  process.env.JWT_SECRET = SECRETO_PRUEBA;
  const { Test } = await import('@nestjs/testing');
  const { AppModule } = await import('../../app.module');
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication();
  configureApp(app);
  await app.listen(0);
  const base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api/v1`;
  return { app, base, ds: app.get(DataSource) };
}
