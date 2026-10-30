import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class CreateSituacionPatrimonialHijosDto {
  @IsOptional()
  @IsInt()
  numero_hijos?: number;

  @IsOptional()
  @IsBoolean()
  tiene_discapacidad?: boolean;

  @IsInt()
  edad: number;
}
