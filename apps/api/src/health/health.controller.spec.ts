import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { DataSource } from 'typeorm';
import { configureApp } from '../app.setup';
import { HealthController } from './health.controller';

// /health dice que el proceso vive (no toca la base); /health/db además consulta la base (SELECT 1) y sirve
// de comprobación de que la API ve PostgreSQL. Ambos son públicos. La base se simula: sin datos reales.
describe('Salud', () => {
  let app: INestApplication;
  const consultas: string[] = [];
  let base: () => Promise<unknown>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: {
            query: (sql: string) => {
              consultas.push(sql);
              return base();
            },
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);
  });

  beforeEach(() => {
    consultas.length = 0;
    base = () => Promise.resolve([{ '?column?': 1 }]);
  });

  afterAll(async () => {
    await app.close();
  });

  const url = (ruta: string) =>
    `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}${ruta}`;

  it('GET /api/v1/health responde 200 con { status: "ok" }', async () => {
    const res = await fetch(url('/api/v1/health'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('CP-359 GET /api/v1/health no consulta la base (sigue en 200 aunque la base falle)', async () => {
    base = () => Promise.reject(new Error('la base no responde'));
    const res = await fetch(url('/api/v1/health'));
    expect(res.status).toBe(200);
    expect(consultas).toEqual([]);
  });

  it('CP-360 GET /api/v1/health/db responde 200 y ejecuta SELECT 1', async () => {
    const res = await fetch(url('/api/v1/health/db'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', base_de_datos: 'ok' });
    expect(consultas).toEqual(['SELECT 1']);
  });

  it('CP-361 GET /api/v1/health/db responde 503 si la base falla, sin filtrar el error', async () => {
    base = () => Promise.reject(new Error('password authentication failed for user "secreto"'));
    const res = await fetch(url('/api/v1/health/db'));
    expect(res.status).toBe(503);
    const texto = await res.text();
    expect(texto).not.toContain('secreto');
    expect(texto).not.toContain('password');
    expect(JSON.parse(texto)).toMatchObject({ statusCode: 503 });
  });
});
