import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { EstadoCivil, EstadoSalud } from '../../common/enums/db-enums';

const DINERO = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false };
const MAX_DINERO = 9999999999.99; // NUMERIC(12, 2)

// Situación patrimonial y de ahorro para el retiro (sección 11). Todo es opcional: se guarda por pasos y
// el PUT reemplaza el registro (lo no enviado queda vacío).
export class CreateSituacionPatrimonialDto {
  @IsOptional()
  @IsNumber(DINERO)
  @Min(0)
  @Max(MAX_DINERO)
  saldo_cuenta_individual?: number | null;

  @IsOptional()
  @IsNumber(DINERO)
  @Min(0)
  @Max(MAX_DINERO)
  aportaciones_voluntarias?: number | null;

  @IsOptional()
  @IsNumber(DINERO)
  @Min(0)
  @Max(MAX_DINERO)
  ahorros_inversiones_adicionales?: number | null;

  @IsOptional()
  @IsString()
  bienes_patrimoniales?: string | null;

  @IsOptional()
  @IsString()
  creditos_deudas_vigentes?: string | null;

  @IsOptional()
  @IsNumber(DINERO)
  @Min(0)
  @Max(MAX_DINERO)
  ingreso_mensual?: number | null;

  @IsOptional()
  @IsString()
  otras_fuentes_ingreso?: string | null;

  @IsOptional()
  @IsNumber(DINERO)
  @Min(0)
  @Max(MAX_DINERO)
  ingreso_conyuge?: number | null;

  @IsOptional()
  @IsString()
  seguros?: string | null;

  @IsOptional()
  @IsEnum(EstadoSalud)
  estado_salud?: EstadoSalud | null;

  @IsOptional()
  @IsString()
  padecimientos?: string | null;

  @IsOptional()
  @IsEnum(EstadoCivil)
  estado_civil?: EstadoCivil | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  edad_conyuge?: number | null;

  @IsOptional()
  @IsString()
  actividad_economica_conyuge?: string | null;
}
