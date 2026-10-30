import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { EstadoConfirmacion } from '../../common/enums/db-enums';

export class CreateHistorialLaboralDto {
  @IsInt()
  semanas_issste: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  salario_promedio: number;

  @IsString()
  ultimo_patron: string;

  @IsEnum(EstadoConfirmacion)
  vigencia_derechos: EstadoConfirmacion;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
