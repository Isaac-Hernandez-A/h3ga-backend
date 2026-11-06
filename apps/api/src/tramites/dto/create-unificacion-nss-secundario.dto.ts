import { IsOptional, IsString, Matches } from 'class-validator';
import { NSS_REGEX } from './create-unificacion-nss-detalle.dto';

export class CreateUnificacionNssSecundarioDto {
  @Matches(NSS_REGEX, { message: 'nss debe tener 11 dígitos.' })
  nss: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
