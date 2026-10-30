import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtension,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Rol } from './permisos';

export const ROLES_KEY = 'roles';

// Declara los roles permitidos en la ruta. Por ahora solo documenta (metadata y Swagger);
// el RolesGuard que la hace cumplir se implementa con el control de acceso.
export const Roles = (...roles: Rol[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    ApiBearerAuth(),
    ApiExtension('x-roles', roles),
    ApiUnauthorizedResponse({ description: 'Token ausente, vencido o inválido.' }),
    ApiForbiddenResponse({ description: 'El rol del usuario no tiene permiso en esta ruta.' }),
  );
