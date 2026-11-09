import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EstadoConfirmacion } from '../../common/enums/db-enums';

// Revisión de un documento: solo estatus, observaciones y número de referencia. El archivo, su tipo y
// quién lo subió no se modifican (para cambiar el archivo se sube uno nuevo).
export class RevisarDocumentoDto {
  @IsOptional()
  @IsEnum(EstadoConfirmacion)
  estatus?: EstadoConfirmacion;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  numero_referencia?: string;
}
