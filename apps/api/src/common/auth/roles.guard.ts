import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUEST_USER_KEY, RequestConUsuario, Rol } from './authenticated-user';
import { ROLES_KEY } from './roles.decorator';

// Hace cumplir @Roles(...): 403 si el rol del usuario no está entre los permitidos.
// Va después de JwtAuthGuard, que es quien deja al usuario en la petición.
// Una ruta sin @Roles no se restringe por rol (la autenticación la exige JwtAuthGuard);
// un @Roles() vacío no permite a nadie.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // El @Roles del método anula al del controlador.
    const permitidos = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (permitidos === undefined) return true;

    const usuario = context.switchToHttp().getRequest<RequestConUsuario>()[REQUEST_USER_KEY];
    if (!usuario) throw new UnauthorizedException();
    if (!permitidos.includes(usuario.rol)) {
      throw new ForbiddenException('No tienes permiso para esta operación.');
    }
    return true;
  }
}
