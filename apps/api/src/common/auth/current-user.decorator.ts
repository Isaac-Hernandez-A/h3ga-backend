import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser, REQUEST_USER_KEY, RequestConUsuario } from './authenticated-user';

// Devuelve el usuario que dejó JwtAuthGuard. Si se usa en una ruta sin ese guard, responde 401.
export const CurrentUser = createParamDecorator(
  (_datos: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const usuario = ctx.switchToHttp().getRequest<RequestConUsuario>()[REQUEST_USER_KEY];
    if (!usuario) throw new UnauthorizedException();
    return usuario;
  },
);
