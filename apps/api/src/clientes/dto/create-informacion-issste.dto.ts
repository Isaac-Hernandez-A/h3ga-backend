import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateInformacionIsssteDto {
  @IsUUID()
  id: string;

  @IsString()
  @MaxLength(20)
  nss_issste: string;

  @IsString()
  regimen_pensionario: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  anios_laborados?: number;

  @IsBoolean()
  activo: boolean;
}
