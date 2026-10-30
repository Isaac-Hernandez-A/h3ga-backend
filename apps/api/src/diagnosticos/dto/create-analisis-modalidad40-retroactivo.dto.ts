import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { EvaluacionRetroactivo, ValidacionEstado } from '../../common/enums/db-enums';

export class CreateAnalisisModalidad40RetroactivoDto {
  @IsOptional()
  @IsDateString()
  fecha_propuesta_inicio_m40?: string;

  @IsOptional()
  @IsDateString()
  fecha_solicitud?: string;

  @IsOptional()
  @IsInt()
  meses_retroactivos_estimados?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  salario_diario_propuesto?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  cuotas_estimadas?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  recargos_actualizaciones_estimadas?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  total_estimado_pagar?: number;

  @IsOptional()
  @IsBoolean()
  baja_por_mora_previa?: boolean;

  @IsEnum(ValidacionEstado)
  dentro_de_plazo_reingreso: ValidacionEstado;

  @IsEnum(EvaluacionRetroactivo)
  conclusion_retroactivo: EvaluacionRetroactivo;

  @IsOptional()
  @IsString()
  comentarios?: string;
}
