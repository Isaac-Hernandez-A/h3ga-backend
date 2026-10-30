import { PartialType } from '@nestjs/swagger';
import { CreateSituacionPatrimonialDto } from './create-situacion-patrimonial.dto';

export class UpdateSituacionPatrimonialDto extends PartialType(CreateSituacionPatrimonialDto) {}
