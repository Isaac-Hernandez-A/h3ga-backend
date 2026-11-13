import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const LIMITE_POR_OMISION = 8;

export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'Filas máximas de cada lista (los totales siempre son completos).',
    minimum: 1,
    maximum: 50,
    default: LIMITE_POR_OMISION,
    example: 8,
  })
  @IsOptional()
  // Se convierte solo si es un entero escrito con dígitos; lo demás ("x", "1.5") queda como texto y falla.
  @Transform(({ value }) =>
    typeof value === 'string' && /^-?\d+$/.test(value) ? Number(value) : value,
  )
  @IsInt({ message: 'limite debe ser un número entero entre 1 y 50.' })
  @Min(1, { message: 'limite debe ser un número entero entre 1 y 50.' })
  @Max(50, { message: 'limite debe ser un número entero entre 1 y 50.' })
  limite?: number;
}
