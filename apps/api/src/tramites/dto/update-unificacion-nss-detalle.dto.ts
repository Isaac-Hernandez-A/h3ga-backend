import { PartialType } from '@nestjs/swagger';
import { CreateUnificacionNssDetalleDto } from './create-unificacion-nss-detalle.dto';

export class UpdateUnificacionNssDetalleDto extends PartialType(CreateUnificacionNssDetalleDto) {}
