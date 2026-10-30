import { IsUUID } from 'class-validator';

export class ReasignarClienteDto {
  @IsUUID()
  asesor_id: string;
}
