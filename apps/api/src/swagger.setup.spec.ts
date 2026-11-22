import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { configureApp } from './app.setup';
import { HealthController } from './health/health.controller';
import { setupSwagger } from './swagger.setup';
import { DataSource } from 'typeorm';

// Swagger (/api/docs) se publica salvo cuando NODE_ENV=production. Aplicación mínima, sin base real.
describe('setupSwagger según NODE_ENV', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function iniciar(
    nodeEnv: string | undefined,
  ): Promise<{ publicada: boolean; raiz: string }> {
    const modulo = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DataSource, useValue: { query: () => Promise.resolve([]) } }],
    }).compile();
    app = modulo.createNestApplication();
    configureApp(app);
    const publicada = setupSwagger(app, nodeEnv);
    await app.listen(0);
    return {
      publicada,
      raiz: `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`,
    };
  }

  it('CP-362 en production no publica /api/docs ni /api/docs-json (404)', async () => {
    const { publicada, raiz } = await iniciar('production');
    expect(publicada).toBe(false);
    expect((await fetch(`${raiz}/api/docs`)).status).toBe(404);
    expect((await fetch(`${raiz}/api/docs-json`)).status).toBe(404);
  });

  it.each(['development', 'test', undefined])(
    'CP-363 con NODE_ENV=%s sí publica /api/docs',
    async (nodeEnv) => {
      const { publicada, raiz } = await iniciar(nodeEnv);
      expect(publicada).toBe(true);
      expect((await fetch(`${raiz}/api/docs`)).status).toBe(200);
      expect((await fetch(`${raiz}/api/docs-json`)).status).toBe(200);
    },
  );
});
