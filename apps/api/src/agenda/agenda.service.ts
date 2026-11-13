import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { aplicarAlcanceClientes } from '../common/auth/clientes-accesibles';
import { reabrirAvisoAtendido } from '../avisos/alerta';
import { traducirErrorBd } from '../common/database/errores-postgres';
import { Cliente } from '../clientes/entities/cliente.entity';
import { CreateEventoAgendaDto } from './dto/create-evento-agenda.dto';
import { ListarAgendaQueryDto } from './dto/listar-agenda-query.dto';
import { UpdateEventoAgendaDto } from './dto/update-evento-agenda.dto';
import { EventoAgenda } from './entities/evento-agenda.entity';

const ERRORES_EVENTO = {
  llaveForanea: 'El cliente indicado no existe.',
  dato: 'La fecha u hora del evento no es válida.',
};

@Injectable()
export class AgendaService {
  constructor(
    @InjectRepository(EventoAgenda) private readonly eventos: Repository<EventoAgenda>,
    private readonly ds: DataSource,
  ) {}

  // Eventos de los clientes dentro del alcance del usuario (asesor: sus clientes; auxiliar: los
  // autorizados activos; supervisor: todos). Opcionalmente filtra por fecha y estatus.
  async listarEventos(
    usuario: AuthenticatedUser,
    consulta: ListarAgendaQueryDto,
  ): Promise<EventoAgenda[]> {
    const qb = this.conAlcance(usuario);
    if (consulta.fecha) qb.andWhere('e.fecha = :fecha', { fecha: consulta.fecha });
    if (consulta.estatus) qb.andWhere('e.estatus = :estatus', { estatus: consulta.estatus });
    return qb
      .orderBy('e.fecha', 'ASC')
      .addOrderBy('e.hora', 'ASC')
      .addOrderBy('e.id', 'ASC')
      .getMany();
  }

  // 404 si el evento no existe o es de un cliente fuera del alcance (mismo mensaje en ambos casos).
  async obtenerEvento(usuario: AuthenticatedUser, eventoId: string): Promise<EventoAgenda> {
    const evento = await this.conAlcance(usuario)
      .andWhere('e.id = :eventoId', { eventoId })
      .getOne();
    if (!evento) throw new NotFoundException('Evento no encontrado.');
    return evento;
  }

  // asesor_id sale siempre del token. El acceso al cliente lo validó ClienteAccessGuard (cliente_id
  // del cuerpo).
  async crearEvento(usuario: AuthenticatedUser, dto: CreateEventoAgendaDto): Promise<EventoAgenda> {
    try {
      return await this.eventos.save(this.eventos.create({ ...dto, asesor_id: usuario.sub }));
    } catch (error) {
      return traducirErrorBd(error, ERRORES_EVENTO);
    }
  }

  async actualizarEvento(
    usuario: AuthenticatedUser,
    eventoId: string,
    dto: UpdateEventoAgendaDto,
  ): Promise<EventoAgenda> {
    const actual = await this.obtenerEvento(usuario, eventoId);
    if (Object.keys(dto).length > 0) {
      // Reagendar = cambiar la fecha o la hora. Si el aviso de la fecha resultante ya existía y estaba
      // atendido, vuelve a quedar pendiente; el cambio y la reapertura van en la misma transacción.
      const reagenda =
        (dto.fecha !== undefined && dto.fecha !== actual.fecha) ||
        (dto.hora !== undefined && normalizarHora(dto.hora) !== normalizarHora(actual.hora));
      try {
        await this.ds.transaction(async (manager) => {
          await manager.update(EventoAgenda, { id: eventoId }, dto);
          if (reagenda)
            await reabrirAvisoAtendido(manager, { eventoId }, dto.fecha ?? actual.fecha);
        });
      } catch (error) {
        traducirErrorBd(error, ERRORES_EVENTO);
      }
    }
    return this.obtenerEvento(usuario, eventoId);
  }

  private conAlcance(usuario: AuthenticatedUser) {
    const qb = this.eventos.createQueryBuilder('e').innerJoin(Cliente, 'c', 'c.id = e.cliente_id');
    return aplicarAlcanceClientes(qb, usuario, 'c');
  }
}

// '10:00' y '10:00:00' son la misma hora: se comparan con segundos.
function normalizarHora(hora: string): string {
  return /^\d{2}:\d{2}$/.test(hora) ? `${hora}:00` : hora;
}
