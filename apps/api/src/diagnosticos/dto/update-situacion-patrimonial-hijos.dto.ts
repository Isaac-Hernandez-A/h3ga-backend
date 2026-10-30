import { PartialType } from '@nestjs/swagger';
import { CreateSituacionPatrimonialHijosDto } from './create-situacion-patrimonial-hijos.dto';

export class UpdateSituacionPatrimonialHijosDto extends PartialType(
  CreateSituacionPatrimonialHijosDto,
) {}
