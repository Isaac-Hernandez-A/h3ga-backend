import { PartialType } from '@nestjs/swagger';
import { CreateDiagnosticoEspecializadoDto } from './create-diagnostico-especializado.dto';

export class UpdateDiagnosticoEspecializadoDto extends PartialType(
  CreateDiagnosticoEspecializadoDto,
) {}
