import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { configureApp } from '../app.setup';
import { HealthController } from './health.controller';

describe('GET /api/v1/health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 con { status: "ok" }', async () => {
    const { port } = app.getHttpServer().address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
