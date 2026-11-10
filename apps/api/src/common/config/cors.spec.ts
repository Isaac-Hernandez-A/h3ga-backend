import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { configureApp } from '../../app.setup';
import { ORIGEN_POR_DEFECTO, origenesPermitidos } from './cors';

// CORS del frontend: solo los orígenes de CORS_ORIGINS, sin comodines y sin credenciales. Datos ficticios.
const PERMITIDO = 'http://localhost:3000';
const OTRO_PERMITIDO = 'http://127.0.0.1:3000';
const AJENO = 'http://sitio-ajeno.invalid';

@Controller('ping')
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

async function iniciar(origenes?: string): Promise<{ app: INestApplication; base: string }> {
  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => (origenes === undefined ? {} : { CORS_ORIGINS: origenes })],
      }),
    ],
    controllers: [PingController],
  })
  class AplicacionDePrueba {}

  const modulo = await Test.createTestingModule({ imports: [AplicacionDePrueba] }).compile();
  const app = modulo.createNestApplication();
  configureApp(app);
  await app.listen(0);
  return { app, base: `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}` };
}

describe('origenesPermitidos', () => {
  it('sin valor usa http://localhost:3000', () => {
    expect(ORIGEN_POR_DEFECTO).toBe('http://localhost:3000');
    expect(origenesPermitidos(undefined)).toEqual([ORIGEN_POR_DEFECTO]);
    expect(origenesPermitidos('   ')).toEqual([ORIGEN_POR_DEFECTO]);
  });

  it('separa por comas, recorta espacios y quita la barra final', () => {
    expect(origenesPermitidos(` ${PERMITIDO} , ${OTRO_PERMITIDO}/ `)).toEqual([
      PERMITIDO,
      OTRO_PERMITIDO,
    ]);
  });

  it('rechaza el comodín y las entradas vacías', () => {
    expect(() => origenesPermitidos('*')).toThrow(/comod/i);
    expect(() => origenesPermitidos(`${PERMITIDO},*`)).toThrow(/comod/i);
    expect(() => origenesPermitidos(`${PERMITIDO},,${OTRO_PERMITIDO}`)).toThrow(/vac/i);
  });
});

describe('CORS de la aplicación', () => {
  let app: INestApplication;
  let base: string;

  afterEach(async () => {
    await app.close();
  });

  const preflight = (origen: string) =>
    fetch(`${base}/api/v1/ping`, {
      method: 'OPTIONS',
      headers: {
        Origin: origen,
        'Access-Control-Request-Method': 'PATCH',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    });

  it('CP-74 un origen permitido recibe Access-Control-Allow-Origin; otro origen no recibe permiso; sin comodín', async () => {
    ({ app, base } = await iniciar(`${PERMITIDO},${OTRO_PERMITIDO}`));

    for (const origen of [PERMITIDO, OTRO_PERMITIDO]) {
      const r = await preflight(origen);
      expect(r.headers.get('access-control-allow-origin')).toBe(origen);
      expect(r.headers.get('access-control-allow-origin')).not.toBe('*');
    }

    const ajeno = await preflight(AJENO);
    expect(ajeno.headers.get('access-control-allow-origin')).toBeNull();
    const simple = await fetch(`${base}/api/v1/ping`, { headers: { Origin: AJENO } });
    expect(simple.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('CP-74 solo concede lo acordado: métodos, cabeceras, Content-Disposition expuesta y sin credenciales', async () => {
    ({ app, base } = await iniciar(PERMITIDO));
    const r = await preflight(PERMITIDO);
    const metodos = (r.headers.get('access-control-allow-methods') ?? '').split(',');
    expect(metodos.map((m) => m.trim()).sort()).toEqual(['GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']);
    const cabeceras = (r.headers.get('access-control-allow-headers') ?? '').toLowerCase();
    expect(cabeceras).toContain('authorization');
    expect(cabeceras).toContain('content-type');
    expect(r.headers.get('access-control-allow-credentials')).toBeNull();

    const normal = await fetch(`${base}/api/v1/ping`, { headers: { Origin: PERMITIDO } });
    expect(normal.headers.get('access-control-expose-headers')?.toLowerCase()).toContain(
      'content-disposition',
    );
  });

  it('CP-74 sin CORS_ORIGINS solo permite http://localhost:3000', async () => {
    ({ app, base } = await iniciar(undefined));
    expect((await preflight(ORIGEN_POR_DEFECTO)).headers.get('access-control-allow-origin')).toBe(
      ORIGEN_POR_DEFECTO,
    );
    expect((await preflight(AJENO)).headers.get('access-control-allow-origin')).toBeNull();
  });
});
