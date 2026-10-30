import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateEtapaTramiteDto {
  @IsInt()
  etapa_id: number;

  @IsInt()
  estatus_id: number;

  @IsOptional()
  @IsInt()
  avance_porcentaje?: number;

  @IsOptional()
  @IsString()
  accion_a_realizar?: string;

  @IsOptional()
  @IsDateString()
  fecha_compromiso?: string;

  @IsOptional()
  @IsString()
  motivo_rechazo?: string;
}
