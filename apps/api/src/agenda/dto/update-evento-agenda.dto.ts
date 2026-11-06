import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateEventoAgendaDto } from './create-evento-agenda.dto';

// El asesor del evento no se cambia por PATCH.
export class UpdateEventoAgendaDto extends PartialType(
  OmitType(CreateEventoAgendaDto, ['asesor_id']),
) {}
