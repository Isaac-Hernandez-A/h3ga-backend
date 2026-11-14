import { INestApplication } from '@nestjs/common';
import { AddressInfo } from 'node:net';
import { configureApp } from './app.setup';
import { describeConBd, urlBdPruebas } from './common/testing/bd-pruebas';
import { SECRETO_PRUEBA } from './common/testing/tokens';
import { setupSwagger } from './swagger.setup';

// El contrato Swagger se sirve con la aplicación real (AppModule) y la misma configuración de main.ts.
jest.setTimeout(60_000);

describeConBd('Swagger (aplicación real y base de pruebas)', () => {
  let app: INestApplication;
  let raiz: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = urlBdPruebas();
    process.env.JWT_SECRET = SECRETO_PRUEBA;
    const { Test } = await import('@nestjs/testing');
    const { AppModule } = await import('./app.module');
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configureApp(app);
    setupSwagger(app);
    await app.listen(0);
    raiz = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('el JSON de Swagger responde 200 en /api/docs-json y lista la ruta /api/v1/auth/login', async () => {
    const r = await fetch(`${raiz}/api/docs-json`);
    expect(r.status).toBe(200);
    const doc = (await r.json()) as {
      paths: Record<string, Record<string, { tags?: string[]; responses?: object }>>;
    };
    expect(Object.keys(doc.paths)).toContain('/api/v1/auth/login');
    expect(doc.paths['/api/v1/auth/login'].post).toBeDefined();
    // Cada operación documentada declara su módulo (tag) y al menos una respuesta.
    const sinTag: string[] = [];
    const sinRespuesta: string[] = [];
    for (const [ruta, operaciones] of Object.entries(doc.paths)) {
      for (const [metodo, op] of Object.entries(operaciones)) {
        if (!op.tags?.length) sinTag.push(`${metodo} ${ruta}`);
        if (!op.responses || Object.keys(op.responses).length === 0)
          sinRespuesta.push(`${metodo} ${ruta}`);
      }
    }
    expect(sinTag).toEqual([]);
    expect(sinRespuesta).toEqual([]);
  });

  it('el JSON de Swagger documenta todas las rutas del router (mismo conteo que la matriz de acceso)', async () => {
    const doc = (await (await fetch(`${raiz}/api/docs-json`)).json()) as {
      paths: Record<string, Record<string, unknown>>;
    };
    const documentadas = Object.values(doc.paths).reduce(
      (n, ops) => n + Object.keys(ops).length,
      0,
    );
    const endpoints = (await import('node:fs')).readFileSync(
      `${__dirname}/../../../docs/endpoints.md`,
      'utf-8',
    );
    const total = Number(/Total: (\d+) rutas/.exec(endpoints)![1]);
    expect(documentadas).toBe(total);
  });

  it('la interfaz /api/docs responde 200', async () => {
    expect((await fetch(`${raiz}/api/docs`)).status).toBe(200);
  });
});
