import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

// Un hijo (una fila por hijo): el número de hijos es el número de filas.
export class CreateSituacionPatrimonialHijosDto {
  @IsInt()
  @Min(0)
  @Max(120)
  edad: number;

  @IsOptional()
  @IsBoolean()
  tiene_discapacidad?: boolean;
}
