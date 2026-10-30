import { PartialType } from '@nestjs/swagger';
import { CreateEventoAgendaDto } from './create-evento-agenda.dto';

export class UpdateEventoAgendaDto extends PartialType(CreateEventoAgendaDto) {}
