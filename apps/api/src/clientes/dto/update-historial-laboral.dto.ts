import { PartialType } from '@nestjs/swagger';
import { CreateHistorialLaboralDto } from './create-historial-laboral.dto';

export class UpdateHistorialLaboralDto extends PartialType(CreateHistorialLaboralDto) {}
