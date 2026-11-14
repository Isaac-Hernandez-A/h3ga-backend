import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Cuerpo de PUT /clientes/:clienteId/historial-laboral/issste. historial_laboral_id lo fija el servidor
// (el del cliente de la ruta): no se acepta en el cuerpo.
export class CreateInformacionIsssteDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Opcional. Si la información ISSSTE ya existe se conserva su id; si no, se usa este o se genera uno.',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ maxLength: 20, example: '12345678901' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  nss_issste: string;

  @ApiProperty({ example: 'Décimo transitorio' })
  @IsString()
  @IsNotEmpty()
  regimen_pensionario: string;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: 999.99,
    example: 18.5,
    description: 'Años laborados (NUMERIC(5,2)): de 0 a 999.99, máximo 2 decimales.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(999.99)
  anios_laborados?: number | null;

  @ApiPropertyOptional({ default: true, description: 'Por omisión true.' })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
