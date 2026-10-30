import { IsDateString, IsEnum, IsString, IsUUID, Matches } from 'class-validator';
import { EstatusEventoAgenda } from '../../common/enums/db-enums';

export class CreateEventoAgendaDto {
  @IsUUID()
  asesor_id: string;

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
