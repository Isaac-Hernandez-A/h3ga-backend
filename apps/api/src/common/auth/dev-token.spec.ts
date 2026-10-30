import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { REQUEST_USER_KEY } from './authenticated-user';
import { JwtAuthGuard } from './jwt-auth.guard';

// Valores ficticios solo para pruebas: no son secretos ni tokens reales.
const SECRETO_PRUEBA = 'secreto-ficticio-solo-para-pruebas';
const SUB = '22222222-2222-4222-8222-222222222222';
const SCRIPT = resolve(__dirname, '../../../scripts/dev-token.mjs');

function ejecutar(args: string[], entorno: Record<string, string | undefined> = {}) {
  const env: Record<string, string | undefined> = {
    ...process.env,
    NODE_ENV: 'development',
    JWT_SECRET: SECRETO_PRUEBA,
    ...entorno,
  };
  for (const clave of Object.keys(env)) if (env[clave] === undefined) delete env[clave];
  const r = spawnSync(process.execPath, [SCRIPT, ...args], {
    env: env as NodeJS.ProcessEnv,
    encoding: 'utf8',
  });
  return { codigo: r.status, token: r.stdout.trim(), error: r.stderr };
}

describe('script dev:token', () => {
  it.each(['asesor', 'auxiliar', 'supervisor'] as const)(
    'genera un token de %s que JwtAuthGuard acepta',
    async (rol) => {
      const { codigo, token } = ejecutar(['--rol', rol, '--sub', SUB]);
      expect(codigo).toBe(0);

      const peticion: Record<string, unknown> = { headers: { authorization: `Bearer ${token}` } };
      const ctx = { switchToHttp: () => ({ getRequest: () => peticion }) } as ExecutionContext;
      const guard = new JwtAuthGuard(new JwtService({ secret: SECRETO_PRUEBA }));
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(peticion[REQUEST_USER_KEY]).toEqual({ sub: SUB, rol });
    },
  );

  it('genera un sub uuid cuando no se indica --sub', () => {
    const { codigo, token } = ejecutar(['--rol', 'asesor']);
    expect(codigo).toBe(0);
    const payload = new JwtService({ secret: SECRETO_PRUEBA }).verify<{ sub: string }>(token);
    expect(payload.sub).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('el token firmado con otro secreto no pasa la validación', () => {
    const { token } = ejecutar(['--rol', 'asesor'], { JWT_SECRET: 'otro-secreto-ficticio-1234' });
    expect(() => new JwtService({ secret: SECRETO_PRUEBA }).verify(token)).toThrow();
  });

  it('se niega a ejecutarse con NODE_ENV=production y no imprime ningún token', () => {
    const { codigo, token, error } = ejecutar(['--rol', 'asesor'], { NODE_ENV: 'production' });
    expect(codigo).toBe(1);
    expect(token).toBe('');
    expect(error).toContain('production');
  });

  it.each([
    ['falta JWT_SECRET', undefined],
    ['JWT_SECRET es el valor de ejemplo', 'CAMBIAR_SECRETO_JWT'],
  ])('se niega a generar el token si %s', (_caso, secreto) => {
    const { codigo, token } = ejecutar(['--rol', 'asesor'], { JWT_SECRET: secreto });
    expect(codigo).toBe(1);
    expect(token).toBe('');
  });

  it.each([
    ['sin --rol', []],
    ['con un rol fuera del contrato', ['--rol', 'administrador']],
    ['con un --sub que no es uuid', ['--rol', 'asesor', '--sub', 'no-es-uuid']],
  ])('falla %s', (_caso, args) => {
    const { codigo, token } = ejecutar(args);
    expect(codigo).toBe(1);
    expect(token).toBe('');
  });
});
