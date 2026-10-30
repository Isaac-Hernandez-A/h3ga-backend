import { PartialType } from '@nestjs/swagger';
import { CreateInformacionIsssteDto } from './create-informacion-issste.dto';

export class UpdateInformacionIsssteDto extends PartialType(CreateInformacionIsssteDto) {}
