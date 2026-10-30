import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateClienteDto } from './create-cliente.dto';

// asesor_id se cambia solo con la reasignación del supervisor (PATCH clientes/:clienteId/asesor).
export class UpdateClienteDto extends PartialType(OmitType(CreateClienteDto, ['asesor_id'])) {}
