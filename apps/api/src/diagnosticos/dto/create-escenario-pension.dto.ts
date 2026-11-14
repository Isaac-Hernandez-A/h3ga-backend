import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

const OPCIONES_DINERO = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false };

// Escenario de pensión (sección 10 y 11). nombre_escenario y orden (1 a 3, sin repetirse) identifican al
// escenario; el resto es opcional para poder guardar por pasos.
export class CreateEscenarioPensionDto {
  @IsString()
  @IsNotEmpty()
  nombre_escenario: string;

  @IsInt()
  @Min(1)
  @Max(3)
  orden: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  semanas_proyectadas?: number | null;

  @IsOptional()
  @IsNumber(OPCIONES_DINERO)
  @Max(99999999.99)
  salario_promedio_proyectado?: number | null;

  @IsOptional()
  @IsNumber(OPCIONES_DINERO)
  @Max(9999999999.99)
  inversion_total_estimada?: number;

  @IsOptional()
  @IsNumber(OPCIONES_DINERO)
  @Max(9999999999.99)
  pension_mensual_estimada?: number | null;

  @IsOptional()
  @IsNumber(OPCIONES_DINERO)
  @Max(9999999999.99)
  incremento_mensual?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1, allowNaN: false, allowInfinity: false })
  @Max(99999.9)
  meses_recuperacion_inversion?: number | null;

  @IsOptional()
  @IsNumber(OPCIONES_DINERO)
  @Max(9999999999.99)
  beneficio_a_5_anios?: number | null;

  @IsOptional()
  @IsNumber(OPCIONES_DINERO)
  @Max(9999999999.99)
  beneficio_a_10_anios?: number | null;

  @IsOptional()
  @IsNumber(OPCIONES_DINERO)
  @Max(9999999999.99)
  beneficio_a_15_anios?: number | null;

  @IsOptional()
  @IsNumber(OPCIONES_DINERO)
  @Max(99999999.99)
  salario_modalidad_40?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(32767)
  meses_modalidad_10?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(32767)
  meses_modalidad_40?: number | null;

  @IsOptional()
  @IsNumber(OPCIONES_DINERO)
  @Max(9999999999.99)
  costo_mensual_estimado?: number | null;
}
