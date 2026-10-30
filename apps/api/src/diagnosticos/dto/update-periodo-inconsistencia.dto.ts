import { PartialType } from '@nestjs/swagger';
import { CreatePeriodoInconsistenciaDto } from './create-periodo-inconsistencia.dto';

export class UpdatePeriodoInconsistenciaDto extends PartialType(CreatePeriodoInconsistenciaDto) {}
