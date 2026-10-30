import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateEventoAgendaDto } from './dto/create-evento-agenda.dto';
import { ListarAgendaQueryDto } from './dto/listar-agenda-query.dto';
import { UpdateEventoAgendaDto } from './dto/update-evento-agenda.dto';
import { EventoAgenda } from './entities/evento-agenda.entity';

@Injectable()
export class AgendaService {
  async listarEventos(consulta: ListarAgendaQueryDto): Promise<EventoAgenda[]> {
    throw new NotImplementedException();
  }

  async obtenerEvento(eventoId: string): Promise<EventoAgenda> {
    throw new NotImplementedException();
  }

  async crearEvento(dto: CreateEventoAgendaDto): Promise<EventoAgenda> {
    throw new NotImplementedException();
  }

  async actualizarEvento(eventoId: string, dto: UpdateEventoAgendaDto): Promise<EventoAgenda> {
    throw new NotImplementedException();
  }
}
