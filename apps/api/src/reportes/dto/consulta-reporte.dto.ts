import { IsIn, IsOptional, Matches } from 'class-validator';
import { PeriodoReporte } from '../../common/fechas';

// GET /reportes: periodo semanal (lunes a domingo) o mensual (mes calendario) que contiene a `fecha`
// (por defecto, hoy en Cancún). Que la fecha exista en el calendario se valida en el servicio.
export class ConsultaReporteDto {
  @IsIn(['semanal', 'mensual'])
  periodo: PeriodoReporte;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'fecha debe tener el formato AAAA-MM-DD.' })
  fecha?: string;
}
