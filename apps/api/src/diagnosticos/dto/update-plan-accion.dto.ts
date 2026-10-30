import { PartialType } from '@nestjs/swagger';
import { CreatePlanAccionDto } from './create-plan-accion.dto';

export class UpdatePlanAccionDto extends PartialType(CreatePlanAccionDto) {}
