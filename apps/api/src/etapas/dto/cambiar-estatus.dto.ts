import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

// Cambio de estatus o de avance de una etapa. La etapa (etapa_id) no cambia. El avance solo se pide
// para los estatus En proceso; en los demás lo fija la regla de avance (reglas-avance.ts).
export class CambiarEstatusDto {
  @IsOptional()
  @IsInt()
  estatus_id?: number;

  @IsOptional()
  @IsInt()
  avance_porcentaje?: number;

  @IsOptional()
  @IsString()
  accion_a_realizar?: string;

  @IsOptional()
  @IsDateString()
  fecha_compromiso?: string;

  // Obligatorio al pasar a Bloqueado; en otros estatus se ignora.
  @IsOptional()
  @IsString()
  motivo_rechazo?: string;
}
