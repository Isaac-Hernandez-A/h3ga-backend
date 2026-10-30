import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { EstadoConfirmacion } from '../../common/enums/db-enums';

export class CreateDocumentoClienteDto {
  @IsInt()
  tipo_documento_id: number;

  @IsString()
  archivo_path: string;

  @IsString()
  nombre_archivo_original: string;

  @IsString()
  mime_type: string;

  @IsEnum(EstadoConfirmacion)
  estatus: EstadoConfirmacion;

  @IsOptional()
  @IsString()
  numero_referencia?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
