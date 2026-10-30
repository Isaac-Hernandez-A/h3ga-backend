import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isUUID } from 'class-validator';
import { AuthenticatedUser, REQUEST_USER_KEY, RequestConUsuario } from './authenticated-user';
import { normalizarRol } from './normalizar-rol';

interface PeticionHttp extends RequestConUsuario {
  headers: Record<string, string | string[] | undefined>;
}

interface PayloadJwt {
  sub?: unknown;
  rol?: unknown;
  exp?: unknown;
}

// Valida el JWT (Authorization: Bearer, HS256, secreto JWT_SECRET) y deja { sub, rol } en la petición.
// No emite tokens y no consulta la base de datos: el login es de otro módulo.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const peticion = context.switchToHttp().getRequest<PeticionHttp>();
    const token = extraerBearer(peticion.headers.authorization);
    if (!token) throw new UnauthorizedException('Token ausente.');

    let payload: PayloadJwt;
    try {
      // Se fija el algoritmo para impedir que un token declare otro (p. ej. "none").
      payload = await this.jwt.verifyAsync<PayloadJwt>(token, { algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException('Token inválido o vencido.');
    }

    peticion[REQUEST_USER_KEY] = aUsuario(payload);
    return true;
  }
}

function extraerBearer(cabecera: string | string[] | undefined): string | null {
  if (typeof cabecera !== 'string') return null;
  const [esquema, token] = cabecera.split(' ');
  return esquema?.toLowerCase() === 'bearer' && token ? token : null;
}

// Claims obligatorios del contrato: sub (uuid), rol y exp.
function aUsuario(payload: PayloadJwt): AuthenticatedUser {
  const rol = normalizarRol(payload.rol);
  if (
    typeof payload.exp !== 'number' ||
    typeof payload.sub !== 'string' ||
    !isUUID(payload.sub) ||
    !rol
  ) {
    throw new UnauthorizedException('Token inválido o vencido.');
  }
  return { sub: payload.sub, rol };
}
