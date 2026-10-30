import { PartialType } from '@nestjs/swagger';
import { CreateDocumentoClienteDto } from './create-documento-cliente.dto';

export class UpdateDocumentoClienteDto extends PartialType(CreateDocumentoClienteDto) {}
