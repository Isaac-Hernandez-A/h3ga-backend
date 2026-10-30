import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AplicabilidadRecuperacion } from '../../common/enums/db-enums';

export class CreateAnalisisRecuperacionSemanasDto {
  @IsEnum(AplicabilidadRecuperacion)
  aplica: AplicabilidadRecuperacion;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
