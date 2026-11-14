import { IsUUID } from 'class-validator';

// autorizado_por y fecha_autorizacion no se piden: salen del token y de la hora del servidor (RF-41).
export class CreateClienteAuxiliarDto {
  @IsUUID()
  auxiliar_id: string;
}
