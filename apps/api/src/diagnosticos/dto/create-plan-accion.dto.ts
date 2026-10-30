import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { EstatusPlanAccion } from '../../common/enums/db-enums';

export class CreatePlanAccionDto {
  @IsString()
  accion: string;

  @IsOptional()
  @IsDateString()
  fecha_objetivo?: string;

  @IsEnum(EstatusPlanAccion)
  estatus: EstatusPlanAccion;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
