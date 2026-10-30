import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { EstadoCivil, EstadoSalud } from '../../common/enums/db-enums';

export class CreateSituacionPatrimonialDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  saldo_cuenta_individual: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  aportaciones_voluntarias: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  ahorros_inversiones_adicionales: number;

  @IsString()
  bienes_patrimoniales: string;

  @IsString()
  creditos_deudas_vigentes: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  ingreso_mensual: number;

  @IsString()
  otras_fuentes_ingreso: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  ingreso_conyuge: number;

  @IsString()
  seguros: string;

  @IsEnum(EstadoSalud)
  estado_salud: EstadoSalud;

  @IsString()
  padecimientos: string;

  @IsEnum(EstadoCivil)
  estado_civil: EstadoCivil;

  @IsOptional()
  @IsInt()
  edad_conyuge?: number;

  @IsOptional()
  @IsString()
  actividad_economica_conyuge?: string;
}
