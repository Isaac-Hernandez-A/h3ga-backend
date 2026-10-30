import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser, REQUEST_USER_KEY, Rol } from './authenticated-user';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

const SUB = '11111111-1111-4111-8111-111111111111';

class ControladorDePrueba {
  @Roles('asesor', 'supervisor')
  variosRoles(): void {}

  @Roles()
  sinNadie(): void {}

  sinRoles(): void {}
}

@Roles('supervisor')
class ControladorConRolEnClase {
  heredaDeLaClase(): void {}

  @Roles('asesor')
  anulaLaClase(): void {}
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  const contexto = (
    clase: new () => object,
    metodo: string,
    usuario?: AuthenticatedUser,
  ): ExecutionContext => {
    const peticion = { [REQUEST_USER_KEY]: usuario };
    return {
      getClass: () => clase,
      getHandler: () => (clase.prototype as Record<string, () => void>)[metodo],
      switchToHttp: () => ({ getRequest: () => peticion }),
    } as unknown as ExecutionContext;
  };
  const como = (rol: Rol): AuthenticatedUser => ({ sub: SUB, rol });

  it('deja pasar a un rol permitido', () => {
    expect(guard.canActivate(contexto(ControladorDePrueba, 'variosRoles', como('asesor')))).toBe(
      true,
    );
  });

  it('acepta cualquiera de los roles declarados', () => {
    expect(
      guard.canActivate(contexto(ControladorDePrueba, 'variosRoles', como('supervisor'))),
    ).toBe(true);
  });

  it('responde 403 a un rol no permitido', () => {
    expect(() =>
      guard.canActivate(contexto(ControladorDePrueba, 'variosRoles', como('auxiliar'))),
    ).toThrow(ForbiddenException);
  });

  it('responde 401 si hay @Roles pero no hay usuario en la petición', () => {
    expect(() => guard.canActivate(contexto(ControladorDePrueba, 'variosRoles'))).toThrow(
      UnauthorizedException,
    );
  });

  it('no restringe una ruta sin @Roles', () => {
    expect(guard.canActivate(contexto(ControladorDePrueba, 'sinRoles', como('auxiliar')))).toBe(
      true,
    );
    expect(guard.canActivate(contexto(ControladorDePrueba, 'sinRoles'))).toBe(true);
  });

  it('un @Roles() vacío no permite a nadie', () => {
    expect(() =>
      guard.canActivate(contexto(ControladorDePrueba, 'sinNadie', como('supervisor'))),
    ).toThrow(ForbiddenException);
  });

  it('usa el @Roles del controlador cuando el método no declara los suyos', () => {
    expect(
      guard.canActivate(contexto(ControladorConRolEnClase, 'heredaDeLaClase', como('supervisor'))),
    ).toBe(true);
    expect(() =>
      guard.canActivate(contexto(ControladorConRolEnClase, 'heredaDeLaClase', como('asesor'))),
    ).toThrow(ForbiddenException);
  });

  it('el @Roles del método anula al del controlador', () => {
    expect(
      guard.canActivate(contexto(ControladorConRolEnClase, 'anulaLaClase', como('asesor'))),
    ).toBe(true);
    expect(() =>
      guard.canActivate(contexto(ControladorConRolEnClase, 'anulaLaClase', como('supervisor'))),
    ).toThrow(ForbiddenException);
  });
});
