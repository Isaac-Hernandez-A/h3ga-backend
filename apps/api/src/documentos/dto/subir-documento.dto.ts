import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

// Campos de texto del formulario multipart de subida; el archivo va en el campo "archivo".
// estatus, fecha_carga y subido_por no se piden: el documento nace "por confirmar" y los llena el servidor.
export class SubirDocumentoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32767)
  tipo_documento_id: number;

  @IsOptional()
  @IsString()
  numero_referencia?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
