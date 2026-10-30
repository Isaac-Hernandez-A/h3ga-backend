import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateCorreccionClienteDto {
  @IsInt()
  tipo_correccion_id: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  tiempo_promedio?: string;

  @IsOptional()
  @IsString()
  dato_actual?: string;

  @IsOptional()
  @IsString()
  dato_correcto?: string;
}
