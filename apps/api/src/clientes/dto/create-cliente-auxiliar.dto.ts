import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateClienteAuxiliarDto {
  @IsUUID()
  auxiliar_id: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
