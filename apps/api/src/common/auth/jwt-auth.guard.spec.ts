import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { REQUEST_USER_KEY } from './authenticated-user';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Publico } from './publico.decorator';

// Valores ficticios solo para pruebas: no son secretos ni tokens reales.
const SECRETO_PRUEBA = 'secreto-ficticio-solo-para-pruebas';
const OTRO_SECRETO = 'otro-secreto-ficticio-solo-para-pruebas';
const SUB = '11111111-1111-4111-8111-111111111111';
const ahora = () => Math.floor(Date.now() / 1000);

class ControladorPublico {
  @Publico()
  ruta(): void {}

  protegida(): void {}
}

describe('JwtAuthGuard con @Publico', () => {
  // Se crea con inyección de dependencias para no depender de los argumentos del constructor.
  const contextoDe = (metodo: 'ruta' | 'protegida', headers: object = {}) =>
    ({
      getHandler: () => ControladorPublico.prototype[metodo],
      getClass: () => ControladorPublico,
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    }) as unknown as ExecutionContext;

  const crearGuard = async () => {
    const modulo = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: SECRETO_PRUEBA })],
      providers: [JwtAuthGuard],
    }).compile();
    return modulo.get(JwtAuthGuard);
  };

  it('deja pasar sin token una ruta @Publico', async () => {
    const guard = await crearGuard();
    await expect(guard.canActivate(contextoDe('ruta'))).resolves.toBe(true);
  });

  it('sigue exigiendo token en una ruta sin @Publico', async () => {
    const guard = await crearGuard();
    await expect(guard.canActivate(contextoDe('protegida'))).rejects.toThrow(UnauthorizedException);
  });
});

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: SECRETO_PRUEBA });
  const guard = new JwtAuthGuard(jwt, new Reflector());

  const contexto = (authorization?: string) => {
    const peticion: Record<string, unknown> = { headers: { authorization } };
    const ctx = {
      getHandler: () => function ruta() {},
      getClass: () => class Controlador {},
      switchToHttp: () => ({ getRequest: () => peticion }),
    } as unknown as ExecutionContext;
    return { ctx, peticion };
  };
  const firmar = (payload: object, secreto = SECRETO_PRUEBA) =>
    new JwtService({ secret: secreto }).sign(payload, { algorithm: 'HS256' });
  const valido = (extra: object = {}) => ({
    sub: SUB,
    rol: 'asesor',
    exp: ahora() + 300,
    ...extra,
  });

  it('acepta un token válido y deja { sub, rol } en la petición', async () => {
    const { ctx, peticion } = contexto(`Bearer ${firmar(valido({ rol: 'auxiliar' }))}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(peticion[REQUEST_USER_KEY]).toEqual({ sub: SUB, rol: 'auxiliar' });
  });

  it('rechaza con 401 si no hay cabecera Authorization', async () => {
    await expect(guard.canActivate(contexto().ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza con 401 si el esquema no es Bearer', async () => {
    const { ctx } = contexto(`Basic ${firmar(valido())}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza con 401 un token vencido', async () => {
    const { ctx } = contexto(`Bearer ${firmar(valido({ exp: ahora() - 60 }))}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza con 401 un token con firma inválida', async () => {
    const { ctx } = contexto(`Bearer ${firmar(valido(), OTRO_SECRETO)}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza con 401 un texto que no es un JWT', async () => {
    await expect(guard.canActivate(contexto('Bearer no-es-un-jwt').ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza con 401 un token sin exp', async () => {
    const { ctx } = contexto(`Bearer ${firmar({ sub: SUB, rol: 'asesor' })}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza con 401 un sub que no es uuid', async () => {
    const { ctx } = contexto(`Bearer ${firmar(valido({ sub: 'no-es-uuid' }))}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza con 401 un rol que no existe en el contrato', async () => {
    const { ctx } = contexto(`Bearer ${firmar(valido({ rol: 'administrador' }))}`);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
