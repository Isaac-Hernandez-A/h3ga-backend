import { PartialType } from '@nestjs/swagger';
import { CreateAnalisisRecuperacionSemanasDto } from './create-analisis-recuperacion-semanas.dto';

export class UpdateAnalisisRecuperacionSemanasDto extends PartialType(
  CreateAnalisisRecuperacionSemanasDto,
) {}
