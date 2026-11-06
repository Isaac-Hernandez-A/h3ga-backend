import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { EstatusEventoAgenda } from '../../common/enums/db-enums';

export class CreateEventoAgendaDto {
  // Se ignora: el evento queda a nombre del asesor que lo agenda (el `sub` del token).
  @IsOptional()
  @IsUUID()
  asesor_id?: string;

  @IsUUID()
  cliente_id: string;

  @IsDateString()
  fecha: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'La hora debe tener formato HH:mm o HH:mm:ss',
  })
  hora: string;

  @IsString()
  motivo: string;

  @IsEnum(EstatusEventoAgenda)
  estatus: EstatusEventoAgenda;
}
