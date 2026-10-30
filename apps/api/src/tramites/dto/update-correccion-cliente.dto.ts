import { PartialType } from '@nestjs/swagger';
import { CreateCorreccionClienteDto } from './create-correccion-cliente.dto';

export class UpdateCorreccionClienteDto extends PartialType(CreateCorreccionClienteDto) {}
