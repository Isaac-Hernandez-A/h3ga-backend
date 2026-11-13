import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, Matches } from 'class-validator';
import { PeriodoReporte } from '../../common/fechas';

// GET /reportes: periodo semanal (lunes a domingo), mensual (mes calendario) o trimestral (trimestre de
// calendario) que contiene a `fecha` (por defecto, hoy en Cancún). Que la fecha exista en el calendario se valida en el servicio.
export class ConsultaReporteDto {
  @ApiProperty({ enum: ['semanal', 'mensual', 'trimestral'], example: 'trimestral' })
  @IsIn(['semanal', 'mensual', 'trimestral'], {
    message: 'periodo debe ser semanal, mensual o trimestral.',
  })
  periodo: PeriodoReporte;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener el formato AAAA-MM-DD.' })
  fecha?: string;
}
