import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { EstatusEventoAgenda } from '../../common/enums/db-enums';

export class ListarAgendaQueryDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsEnum(EstatusEventoAgenda)
  estatus?: EstatusEventoAgenda;
}
