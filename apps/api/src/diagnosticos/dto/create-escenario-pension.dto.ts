import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateEscenarioPensionDto {
  @IsString()
  nombre_escenario: string;

  @IsInt()
  orden: number;

  @IsInt()
  semanas_proyectadas: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  salario_promedio_proyectado: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  inversion_total_estimada?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  pension_mensual_estimada: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  incremento_mensual: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  meses_recuperacion_inversion?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  beneficio_a_5_anios?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  beneficio_a_10_anios?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  beneficio_a_15_anios?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  salario_modalidad_40?: number;

  @IsOptional()
  @IsInt()
  meses_modalidad_40?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  costo_mensual_estimado?: number;
}
