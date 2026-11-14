import { PartialType } from '@nestjs/swagger';
import { CreateUnificacionNssSecundarioDto } from './create-unificacion-nss-secundario.dto';

export class UpdateUnificacionNssSecundarioDto extends PartialType(
  CreateUnificacionNssSecundarioDto,
) {}
