import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUEST_USER_KEY, RequestConUsuario, Rol } from './authenticated-user';
import { IS_PUBLICO_KEY } from './publico.decorator';
import { ROLES_KEY } from './roles.decorator';

// Hace cumplir @Roles(...): 403 si el rol del usuario no está entre los permitidos.
// Va después de JwtAuthGuard, que es quien deja al usuario en la petición.
// Se niega por defecto: una ruta sin @Roles ni @Publico responde 403, y un @Roles() vacío no permite a nadie.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const destinos = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLICO_KEY, destinos))
      return true;

    // El @Roles del método anula al del controlador. Sin @Roles ni @Publico la ruta se niega.
    const permitidos = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_KEY, destinos);
    if (permitidos === undefined) {
      throw new ForbiddenException('No tienes permiso para esta operación.');
    }

    const usuario = context.switchToHttp().getRequest<RequestConUsuario>()[REQUEST_USER_KEY];
    if (!usuario) throw new UnauthorizedException();
    if (!permitidos.includes(usuario.rol)) {
      throw new ForbiddenException('No tienes permiso para esta operación.');
    }
    return true;
  }
}
