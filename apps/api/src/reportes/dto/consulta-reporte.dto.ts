import { IsDateString, IsOptional } from 'class-validator';

// Esbozo: el diccionario no define reportes todavía; solo se acota por rango de fechas.
export class ConsultaReporteDto {
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}
