import { IsBoolean } from 'class-validator';

// Solo se activa o desactiva la autorización; el auxiliar de una fila no cambia.
export class UpdateClienteAuxiliarDto {
  @IsBoolean()
  activo: boolean;
}
