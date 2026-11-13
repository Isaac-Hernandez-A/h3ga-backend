import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EstatusPlanAccion } from '../../common/enums/db-enums';

// Fila del plan de acción (sección 13). El estatus por omisión es pendiente.
export class CreatePlanAccionDto {
  @IsString()
  @IsNotEmpty()
  accion: string;

  @IsOptional()
  @IsDateString()
  fecha_objetivo?: string | null;

  @IsOptional()
  @IsEnum(EstatusPlanAccion)
  estatus?: EstatusPlanAccion;

  @IsOptional()
  @IsString()
  observaciones?: string | null;
}
