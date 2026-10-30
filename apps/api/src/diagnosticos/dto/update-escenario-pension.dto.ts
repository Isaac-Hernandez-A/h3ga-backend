import { PartialType } from '@nestjs/swagger';
import { CreateEscenarioPensionDto } from './create-escenario-pension.dto';

export class UpdateEscenarioPensionDto extends PartialType(CreateEscenarioPensionDto) {}
