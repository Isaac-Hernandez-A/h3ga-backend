import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { ClienteAuxiliar } from '../../clientes/entities/cliente-auxiliar.entity';
import { REQUEST_USER_KEY, RequestConUsuario } from './authenticated-user';

interface PeticionConCliente extends RequestConUsuario {
  params?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
}

// Limita el acceso por cliente en rutas con :clienteId (o cliente_id en el cuerpo). Va después de
// los guards globales (JwtAuthGuard y RolesGuard). Si el cliente no existe o no es accesible para el
// usuario, responde 404 con el mismo mensaje: no revela si el cliente existe. Las rutas sin id de
// cliente no se restringen.
//  - asesor: solo clientes con clientes.asesor_id = sub.
//  - auxiliar: solo clientes con un registro activo en cliente_auxiliares para ese auxiliar.
//  - supervisor: todos los clientes existentes.
@Injectable()
export class ClienteAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    @InjectRepository(ClienteAuxiliar) private readonly auxiliares: Repository<ClienteAuxiliar>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const peticion = context.switchToHttp().getRequest<PeticionConCliente>();
    const clienteId = peticion.params?.clienteId ?? peticion.body?.cliente_id;
    // Se puede aplicar a todo un controlador: las rutas sin cliente (p. ej. los catálogos) se ignoran.
    if (clienteId === undefined) return true;

    const usuario = peticion[REQUEST_USER_KEY];
    if (!usuario) throw new UnauthorizedException();
    // Se valida el formato aquí: este guard corre antes que ParseUUIDPipe y un id mal formado
    // provocaría un error de la base en lugar de un 404.
    if (typeof clienteId !== 'string' || !isUUID(clienteId)) throw noEncontrado();

    const tieneAcceso = await this.tieneAcceso(usuario.rol, usuario.sub, clienteId);
    if (!tieneAcceso) throw noEncontrado();
    return true;
  }

  private tieneAcceso(rol: string, sub: string, clienteId: string): Promise<boolean> {
    switch (rol) {
      case 'asesor':
        return this.clientes.exists({ where: { id: clienteId, asesor_id: sub } });
      case 'auxiliar':
        return this.auxiliares.exists({
          where: { cliente_id: clienteId, auxiliar_id: sub, activo: true },
        });
      case 'supervisor':
        return this.clientes.exists({ where: { id: clienteId } });
      default:
        return Promise.resolve(false);
    }
  }
}

const noEncontrado = () => new NotFoundException('Cliente no encontrado.');
