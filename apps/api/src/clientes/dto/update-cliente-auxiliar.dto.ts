import { PartialType } from '@nestjs/swagger';
import { CreateClienteAuxiliarDto } from './create-cliente-auxiliar.dto';

export class UpdateClienteAuxiliarDto extends PartialType(CreateClienteAuxiliarDto) {}
