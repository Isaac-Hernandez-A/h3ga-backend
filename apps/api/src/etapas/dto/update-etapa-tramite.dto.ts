import { PartialType } from '@nestjs/swagger';
import { CreateEtapaTramiteDto } from './create-etapa-tramite.dto';

export class UpdateEtapaTramiteDto extends PartialType(CreateEtapaTramiteDto) {}
