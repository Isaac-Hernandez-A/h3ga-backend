import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { codigoPostgres, PG_VIOLACION_UNICA } from '../common/database/errores-postgres';
import { Cliente } from '../clientes/entities/cliente.entity';
import { CreateCorreccionClienteDto } from './dto/create-correccion-cliente.dto';
import { CreateUnificacionNssDetalleDto } from './dto/create-unificacion-nss-detalle.dto';
import { CreateUnificacionNssSecundarioDto } from './dto/create-unificacion-nss-secundario.dto';
import { UpdateCorreccionClienteDto } from './dto/update-correccion-cliente.dto';
import { CorreccionCliente } from './entities/correccion-cliente.entity';
import { TipoCorreccion } from './entities/tipo-correccion.entity';
import { UnificacionNssDetalle } from './entities/unificacion-nss-detalle.entity';
import { UnificacionNssSecundario } from './entities/unificacion-nss-secundario.entity';
import { columnaDeCorreccion, errorDeDatoCorrecto } from './reglas-correcciones';

const TIPO_UNIFICACION_NSS = 'Unificación de NSS (Duplicidad / Multiplicidad)';

@Injectable()
export class TramitesService {
  constructor(private readonly ds: DataSource) {}

  async listarCorrecciones(clienteId: string): Promise<CorreccionCliente[]> {
    throw new NotImplementedException();
  }

  // Registra la corrección F2. Si el tipo modifica el expediente (CURP, RFC, nacimiento, sexo, nombre),
  // dato_correcto es obligatorio y se valida AQUÍ; el expediente se actualiza hasta que la etapa 2
  // pasa a Finalizado (aplicarCorreccionesAlExpediente).
  async crearCorreccion(
    _usuario: AuthenticatedUser,
    clienteId: string,
    dto: CreateCorreccionClienteDto,
  ): Promise<CorreccionCliente> {
    const tipo = await this.ds
      .getRepository(TipoCorreccion)
      .findOneBy({ id: dto.tipo_correccion_id });
    if (!tipo) throw new BadRequestException('El tipo de corrección indicado no existe.');
    const error = errorDeDatoCorrecto(tipo.nombre, dto.dato_correcto);
    if (error) throw new BadRequestException(error);
    const repo = this.ds.getRepository(CorreccionCliente);
    return repo.save(
      repo.create({ ...dto, cliente_id: clienteId, dato_correcto: dto.dato_correcto?.trim() }),
    );
  }

  // Regla D2: copia dato_correcto al expediente según el tipo (CURP a curp, RFC a rfc, fecha de
  // nacimiento, sexo y nombre; el nombre solo toca clientes.nombre, no los apellidos). Los demás tipos
  // no sobrescriben nada. Corre dentro de la transacción de quien la llama: si falla, se deshace todo.
  // Si hay varias correcciones del mismo tipo, prevalece la registrada al final.
  async aplicarCorreccionesAlExpediente(manager: EntityManager, clienteId: string): Promise<void> {
    const filas = await manager.query<{ tipo: string; dato_correcto: string }[]>(
      `SELECT t.nombre AS tipo, c.dato_correcto
         FROM correcciones_cliente c JOIN tipo_correccion t ON t.id = c.tipo_correccion_id
        WHERE c.cliente_id = $1 AND c.dato_correcto IS NOT NULL
        ORDER BY c.ctid`,
      [clienteId],
    );
    const cambios: Record<string, string> = {};
    for (const fila of filas) {
      const columna = columnaDeCorreccion(fila.tipo);
      if (columna) cambios[columna] = fila.dato_correcto.trim();
    }
    if (Object.keys(cambios).length === 0) return;
    try {
      await manager.update(Cliente, { id: clienteId }, cambios as unknown as Partial<Cliente>);
    } catch (error) {
      if (codigoPostgres(error) === PG_VIOLACION_UNICA) {
        throw new ConflictException('La CURP corregida ya pertenece a otro cliente.');
      }
      throw error;
    }
  }

  async obtenerCorreccion(clienteId: string, correccionId: string): Promise<CorreccionCliente> {
    throw new NotImplementedException();
  }

  async actualizarCorreccion(
    clienteId: string,
    correccionId: string,
    dto: UpdateCorreccionClienteDto,
  ): Promise<CorreccionCliente> {
    throw new NotImplementedException();
  }

  async obtenerUnificacionNss(
    clienteId: string,
    correccionId: string,
  ): Promise<UnificacionNssDetalle> {
    throw new NotImplementedException();
  }

  // F3: PUT idempotente (un detalle por corrección). Solo aplica a correcciones de unificación de NSS y
  // el principal no puede coincidir con un secundario ya registrado.
  async guardarUnificacionNss(
    clienteId: string,
    correccionId: string,
    dto: CreateUnificacionNssDetalleDto,
  ): Promise<UnificacionNssDetalle> {
    return this.ds.transaction(async (manager) => {
      const correccion = await this.correccionDelCliente(manager, clienteId, correccionId);
      const tipo = await manager.findOneByOrFail(TipoCorreccion, {
        id: correccion.tipo_correccion_id,
      });
      if (tipo.nombre !== TIPO_UNIFICACION_NSS) {
        throw new BadRequestException('La corrección indicada no es una unificación de NSS.');
      }
      const actual = await manager.findOne(UnificacionNssDetalle, {
        where: { correccion_id: correccionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (actual) {
        const choca = await manager.exists(UnificacionNssSecundario, {
          where: { unificacion_id: actual.id, nss: dto.nss_principal_elegido },
        });
        if (choca) {
          throw new BadRequestException('El NSS principal no puede ser uno de los secundarios.');
        }
      }
      await manager.upsert(UnificacionNssDetalle, { ...dto, correccion_id: correccionId }, [
        'correccion_id',
      ]);
      return manager.findOneByOrFail(UnificacionNssDetalle, { correccion_id: correccionId });
    });
  }

  async listarNssSecundarios(
    clienteId: string,
    correccionId: string,
  ): Promise<UnificacionNssSecundario[]> {
    throw new NotImplementedException();
  }

  // F3: el secundario no puede ser el principal (400) ni repetirse (409). Se bloquea la fila del detalle
  // para que dos altas simultáneas del mismo NSS no dejen duplicados (la tabla no tiene UNIQUE).
  async agregarNssSecundario(
    clienteId: string,
    correccionId: string,
    dto: CreateUnificacionNssSecundarioDto,
  ): Promise<UnificacionNssSecundario> {
    return this.ds.transaction(async (manager) => {
      await this.correccionDelCliente(manager, clienteId, correccionId);
      const detalle = await manager.findOne(UnificacionNssDetalle, {
        where: { correccion_id: correccionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!detalle) {
        throw new ConflictException('Registra primero la unificación de NSS (NSS principal).');
      }
      if (dto.nss === detalle.nss_principal_elegido) {
        throw new BadRequestException('El NSS secundario no puede ser igual al principal.');
      }
      const repetido = await manager.exists(UnificacionNssSecundario, {
        where: { unificacion_id: detalle.id, nss: dto.nss },
      });
      if (repetido) throw new ConflictException('Ese NSS secundario ya está registrado.');
      return manager.save(
        manager.create(UnificacionNssSecundario, {
          unificacion_id: detalle.id,
          nss: dto.nss,
          observaciones: dto.observaciones ?? null,
        }),
      );
    });
  }

  async listarTiposCorreccion(): Promise<TipoCorreccion[]> {
    throw new NotImplementedException();
  }

  private async correccionDelCliente(
    manager: EntityManager,
    clienteId: string,
    correccionId: string,
  ): Promise<CorreccionCliente> {
    const correccion = await manager.findOneBy(CorreccionCliente, {
      id: correccionId,
      cliente_id: clienteId,
    });
    if (!correccion) throw new NotFoundException('Corrección no encontrada.');
    return correccion;
  }
}
