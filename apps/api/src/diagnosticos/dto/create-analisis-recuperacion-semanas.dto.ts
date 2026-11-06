import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AplicabilidadRecuperacion } from '../../common/enums/db-enums';

export class CreateAnalisisRecuperacionSemanasDto {
  @IsEnum(AplicabilidadRecuperacion)
  aplica: AplicabilidadRecuperacion;

  @IsOptional()
  @IsString()
  observaciones?: string;

  // F4 (D3): semanas que el IMSS reconoce según el dictamen. Si se envía, actualiza
  // clientes.semanas_imss_reconocidas en la misma transacción. No toca semanas_a_recuperar.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  semanas_imss_reconocidas?: number;
}
