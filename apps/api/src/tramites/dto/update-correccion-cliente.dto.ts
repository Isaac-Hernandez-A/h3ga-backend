import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Actualización parcial de una corrección F2. No incluye tipo_correccion_id (el tipo no se cambia) ni
// cliente_id. Un campo enviado como null se borra; uno omitido se conserva.
export class UpdateCorreccionClienteDto {
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  observaciones?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  tiempo_promedio?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  dato_actual?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'En los tipos que modifican el expediente (CURP, RFC, nacimiento, sexo, nombre) es obligatorio y ' +
      'no puede borrarse.',
  })
  @IsOptional()
  @IsString()
  dato_correcto?: string | null;
}
