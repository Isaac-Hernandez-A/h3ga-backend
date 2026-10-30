import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUnificacionNssSecundarioDto {
  @IsString()
  @MaxLength(11)
  nss: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
