import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { ClienteAccessGuard } from '../common/auth/cliente-access.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { CreateEventoAgendaDto } from './dto/create-evento-agenda.dto';
import { ListarAgendaQueryDto } from './dto/listar-agenda-query.dto';
import { UpdateEventoAgendaDto } from './dto/update-evento-agenda.dto';
import { EventoAgenda } from './entities/evento-agenda.entity';
import { AgendaService } from './agenda.service';

// ClienteAccessGuard valida el cliente_id del cuerpo (alta y reagendado); las demás rutas no llevan
// cliente y las limita el servicio por alcance.
@ApiTags('agenda')
@UseGuards(ClienteAccessGuard)
@Controller()
export class AgendaController {
  constructor(private readonly service: AgendaService) {}

  @Get('agenda')
  @Roles(...PERMISOS.agenda.leer)
  @ApiOperation({ summary: 'Listar eventos de la agenda' })
  @ApiOkResponse({ type: EventoAgenda, isArray: true })
  listarEventos(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() consulta: ListarAgendaQueryDto,
  ): Promise<EventoAgenda[]> {
    return this.service.listarEventos(usuario, consulta);
  }

  @Get('agenda/:eventoId')
  @Roles(...PERMISOS.agenda.leer)
  @ApiOperation({ summary: 'Obtener un evento' })
  @ApiOkResponse({ type: EventoAgenda })
  obtenerEvento(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('eventoId', ParseUUIDPipe) eventoId: string,
  ): Promise<EventoAgenda> {
    return this.service.obtenerEvento(usuario, eventoId);
  }

  @Post('agenda')
  @Roles(...PERMISOS.agenda.escribir)
  @ApiOperation({ summary: 'Agendar un evento' })
  @ApiCreatedResponse({ type: EventoAgenda })
  crearEvento(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: CreateEventoAgendaDto,
  ): Promise<EventoAgenda> {
    return this.service.crearEvento(usuario, dto);
  }

  @Patch('agenda/:eventoId')
  @Roles(...PERMISOS.agenda.escribir)
  @ApiOperation({ summary: 'Reagendar, cumplir o cancelar un evento' })
  @ApiOkResponse({ type: EventoAgenda })
  actualizarEvento(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('eventoId', ParseUUIDPipe) eventoId: string,
    @Body() dto: UpdateEventoAgendaDto,
  ): Promise<EventoAgenda> {
    return this.service.actualizarEvento(usuario, eventoId, dto);
  }
}
