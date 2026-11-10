import {
  BadRequestException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { aplicarAlcanceClientes } from '../common/auth/clientes-accesibles';
import { ROL_ID } from '../common/auth/roles-sistema';
import { traducirErrorBd } from '../common/database/errores-postgres';
import { EstatusTramite } from '../etapas/entities/estatus-tramite.entity';
import { EtapaProceso } from '../etapas/entities/etapa-proceso.entity';
import { EtapaTramite } from '../etapas/entities/etapa-tramite.entity';
import { Usuario } from '../usuarios-roles/entities/usuario.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { CreateHistorialLaboralDto } from './dto/create-historial-laboral.dto';
import { CreateInformacionIsssteDto } from './dto/create-informacion-issste.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Afore } from './entities/afore.entity';
import { Cliente } from './entities/cliente.entity';
import { ClienteAuxiliar } from './entities/cliente-auxiliar.entity';
import { ClienteObjetivoEspecifico } from './entities/cliente-objetivo-especifico.entity';
import { HistorialLaboral } from './entities/historial-laboral.entity';
import { InformacionIssste } from './entities/informacion-issste.entity';
import { LeyProbable } from './entities/ley-probable.entity';
import { ObjetivoEspecificoInicial } from './entities/objetivo-especifico-inicial.entity';
import { RegimenPrincipal } from './entities/regimen-principal.entity';

const ERRORES_CLIENTE = {
  unica: 'Ya existe un cliente con esa CURP.',
  llaveForanea: 'El régimen, la ley probable o la AFORE indicados no existen.',
};

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente) private readonly clientes: Repository<Cliente>,
    @InjectRepository(ClienteAuxiliar) private readonly auxiliares: Repository<ClienteAuxiliar>,
    @InjectRepository(HistorialLaboral) private readonly historiales: Repository<HistorialLaboral>,
    private readonly ds: DataSource,
  ) {}

  // Cada rol ve solo su alcance (ver aplicarAlcanceClientes): asesor los suyos, auxiliar los autorizados
  // activos, supervisor todos.
  async listar(usuario: AuthenticatedUser): Promise<Cliente[]> {
    const qb = this.clientes.createQueryBuilder('c');
    aplicarAlcanceClientes(qb, usuario, 'c');
    return qb.orderBy('c.fecha_ingreso', 'DESC').addOrderBy('c.id', 'ASC').getMany();
  }

  // El acceso ya lo validó ClienteAccessGuard; el 404 solo cubre una eliminación entre el guard y la consulta.
  async obtenerCliente(clienteId: string): Promise<Cliente> {
    const cliente = await this.clientes.findOneBy({ id: clienteId });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    return cliente;
  }

  // asesor_id sale siempre del token: el que venga en el cuerpo se ignora. En la misma transacción se
  // crean las 16 etapas del proceso (una por fila de etapas_proceso) en "Por iniciar": el asesor las
  // va actualizando a mano. Si algo falla, no queda ni el cliente ni sus etapas.
  async crear(usuario: AuthenticatedUser, dto: CreateClienteDto): Promise<Cliente> {
    try {
      return await this.ds.transaction(async (manager) => {
        const cliente = await manager.save(
          manager.create(Cliente, { ...dto, asesor_id: usuario.sub }),
        );
        const inicial = await manager.findOneByOrFail(EstatusTramite, { nombre: 'Por iniciar' });
        const pasos = await manager.find(EtapaProceso);
        const ahora = new Date();
        await manager.insert(
          EtapaTramite,
          pasos.map((paso) => ({
            cliente_id: cliente.id,
            etapa_id: paso.id,
            estatus_id: inicial.id,
            avance_porcentaje: inicial.avance_porcentaje_fijo ?? 0,
            creado_el: ahora,
            actualizado_el: ahora,
          })),
        );
        return cliente;
      });
    } catch (error) {
      return traducirErrorBd(error, ERRORES_CLIENTE);
    }
  }

  async actualizar(clienteId: string, dto: UpdateClienteDto): Promise<Cliente> {
    if (Object.keys(dto).length > 0) {
      let afectadas: number | undefined;
      try {
        ({ affected: afectadas } = await this.clientes.update({ id: clienteId }, dto));
      } catch (error) {
        traducirErrorBd(error, ERRORES_CLIENTE);
      }
      if (!afectadas) throw new NotFoundException('Cliente no encontrado.');
    }
    return this.obtenerCliente(clienteId);
  }

  // El destino debe ser un usuario con rol asesor.
  async reasignarAsesor(clienteId: string, nuevoAsesorId: string): Promise<Cliente> {
    await this.exigirUsuarioConRol(nuevoAsesorId, 'asesor');
    const { affected } = await this.clientes.update(
      { id: clienteId },
      { asesor_id: nuevoAsesorId },
    );
    if (!affected) throw new NotFoundException('Cliente no encontrado.');
    return this.obtenerCliente(clienteId);
  }

  async listarAuxiliares(clienteId: string): Promise<ClienteAuxiliar[]> {
    throw new NotImplementedException();
  }

  // RF-41: guarda quién autorizó (el `sub` del token) y cuándo (hora del servidor). Un solo INSERT ...
  // ON CONFLICT: repetir el par (cliente, auxiliar) reactiva la misma fila, sin duplicar aunque haya
  // peticiones simultáneas.
  async autorizarAuxiliar(
    usuario: AuthenticatedUser,
    clienteId: string,
    auxiliarId: string,
  ): Promise<ClienteAuxiliar> {
    await this.exigirUsuarioConRol(auxiliarId, 'auxiliar');
    await this.auxiliares.upsert(
      {
        cliente_id: clienteId,
        auxiliar_id: auxiliarId,
        autorizado_por: usuario.sub,
        fecha_autorizacion: new Date(),
        activo: true,
      },
      ['cliente_id', 'auxiliar_id'],
    );
    return this.auxiliares.findOneByOrFail({ cliente_id: clienteId, auxiliar_id: auxiliarId });
  }

  // Activar o desactivar. El acceso del auxiliar se evalúa en cada petición, así que desactivar surte
  // efecto en la siguiente.
  async cambiarAutorizacion(
    clienteId: string,
    clienteAuxiliarId: string,
    activo: boolean,
  ): Promise<ClienteAuxiliar> {
    const { affected } = await this.auxiliares.update(
      { id: clienteAuxiliarId, cliente_id: clienteId },
      { activo },
    );
    if (!affected) throw new NotFoundException('Autorización no encontrada.');
    return this.auxiliares.findOneByOrFail({ id: clienteAuxiliarId });
  }

  async obtenerHistorialLaboral(clienteId: string): Promise<HistorialLaboral> {
    throw new NotImplementedException();
  }

  // historial_laboral.cliente_id es UNIQUE: PUT es un upsert, dos PUT iguales dejan un solo registro.
  async reemplazarHistorialLaboral(
    clienteId: string,
    dto: CreateHistorialLaboralDto,
  ): Promise<HistorialLaboral> {
    try {
      await this.historiales.upsert({ ...dto, cliente_id: clienteId, activo: dto.activo ?? true }, [
        'cliente_id',
      ]);
    } catch (error) {
      traducirErrorBd(error, {});
    }
    return this.historiales.findOneByOrFail({ cliente_id: clienteId });
  }

  async obtenerInformacionIssste(clienteId: string): Promise<InformacionIssste> {
    throw new NotImplementedException();
  }

  async guardarInformacionIssste(
    clienteId: string,
    dto: CreateInformacionIsssteDto,
  ): Promise<InformacionIssste> {
    throw new NotImplementedException();
  }

  async listarObjetivosEspecificos(clienteId: string): Promise<ClienteObjetivoEspecifico[]> {
    throw new NotImplementedException();
  }

  // Borra e inserta en una sola transacción: si algún objetivo no existe, queda el conjunto anterior.
  async reemplazarObjetivosEspecificos(
    clienteId: string,
    objetivoIds: number[],
  ): Promise<ClienteObjetivoEspecifico[]> {
    try {
      await this.ds.transaction(async (manager) => {
        await manager.delete(ClienteObjetivoEspecifico, { cliente_id: clienteId });
        if (objetivoIds.length > 0) {
          await manager.insert(
            ClienteObjetivoEspecifico,
            objetivoIds.map((objetivo_id) => ({ cliente_id: clienteId, objetivo_id })),
          );
        }
      });
    } catch (error) {
      traducirErrorBd(error, { llaveForanea: 'Algún objetivo específico no existe.' });
    }
    return this.ds.getRepository(ClienteObjetivoEspecifico).find({
      where: { cliente_id: clienteId },
      order: { objetivo_id: 'ASC' },
    });
  }

  // Catálogos: la lista completa de la tabla, ordenada por id.
  listarRegimenes(): Promise<RegimenPrincipal[]> {
    return this.ds.getRepository(RegimenPrincipal).find({ order: { id: 'ASC' } });
  }

  listarLeyesProbables(): Promise<LeyProbable[]> {
    return this.ds.getRepository(LeyProbable).find({ order: { id: 'ASC' } });
  }

  listarAfores(): Promise<Afore[]> {
    return this.ds.getRepository(Afore).find({ order: { id: 'ASC' } });
  }

  listarObjetivosEspecificosInicial(): Promise<ObjetivoEspecificoInicial[]> {
    return this.ds.getRepository(ObjetivoEspecificoInicial).find({ order: { id: 'ASC' } });
  }

  private async exigirUsuarioConRol(usuarioId: string, rol: 'asesor' | 'auxiliar'): Promise<void> {
    const existe = await this.ds
      .getRepository(Usuario)
      .exists({ where: { id: usuarioId, rol_id: ROL_ID[rol] } });
    if (!existe) {
      throw new BadRequestException(`El usuario indicado no existe o no es ${rol}.`);
    }
  }
}
