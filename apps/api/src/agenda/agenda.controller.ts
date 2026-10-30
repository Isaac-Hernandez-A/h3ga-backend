import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { CreateEventoAgendaDto } from './dto/create-evento-agenda.dto';
import { ListarAgendaQueryDto } from './dto/listar-agenda-query.dto';
import { UpdateEventoAgendaDto } from './dto/update-evento-agenda.dto';
import { EventoAgenda } from './entities/evento-agenda.entity';
import { AgendaService } from './agenda.service';

@ApiTags('agenda')
@Controller()
export class AgendaController {
  constructor(private readonly service: AgendaService) {}

  @Get('agenda')
  @Roles(...PERMISOS.agenda.leer)
  @ApiOperation({ summary: 'Listar eventos de la agenda' })
  @ApiOkResponse({ type: EventoAgenda, isArray: true })
  listarEventos(@Query() consulta: ListarAgendaQueryDto): Promise<EventoAgenda[]> {
    return this.service.listarEventos(consulta);
  }

  @Get('agenda/:eventoId')
  @Roles(...PERMISOS.agenda.leer)
  @ApiOperation({ summary: 'Obtener un evento' })
  @ApiOkResponse({ type: EventoAgenda })
  obtenerEvento(@Param('eventoId', ParseUUIDPipe) eventoId: string): Promise<EventoAgenda> {
    return this.service.obtenerEvento(eventoId);
  }

  @Post('agenda')
  @Roles(...PERMISOS.agenda.escribir)
  @ApiOperation({ summary: 'Agendar un evento' })
  @ApiCreatedResponse({ type: EventoAgenda })
  crearEvento(@Body() dto: CreateEventoAgendaDto): Promise<EventoAgenda> {
    return this.service.crearEvento(dto);
  }

  @Patch('agenda/:eventoId')
  @Roles(...PERMISOS.agenda.escribir)
  @ApiOperation({ summary: 'Reagendar, cumplir o cancelar un evento' })
  @ApiOkResponse({ type: EventoAgenda })
  actualizarEvento(
    @Param('eventoId', ParseUUIDPipe) eventoId: string,
    @Body() dto: UpdateEventoAgendaDto,
  ): Promise<EventoAgenda> {
    return this.service.actualizarEvento(eventoId, dto);
  }
}
