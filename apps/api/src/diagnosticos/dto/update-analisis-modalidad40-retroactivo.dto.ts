import { PartialType } from '@nestjs/swagger';
import { CreateAnalisisModalidad40RetroactivoDto } from './create-analisis-modalidad40-retroactivo.dto';

export class UpdateAnalisisModalidad40RetroactivoDto extends PartialType(
  CreateAnalisisModalidad40RetroactivoDto,
) {}
