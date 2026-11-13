import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { EstatusInconsistencia } from '../../common/enums/db-enums';

// Fila de "Detalle de periodos a revisar" (sección 4). Cuelga del cliente.
export class CreatePeriodoInconsistenciaDto {
  @IsString()
  @IsNotEmpty()
  nombre_patron: string;

  @IsString()
  @IsNotEmpty()
  periodo_reclamado: string;

  @IsInt()
  @Min(0)
  @Max(2147483647)
  semanas_esperadas: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  semanas_reconocidas?: number;

  @IsString()
  @IsNotEmpty()
  evidencia_disponible: string;

  @IsString()
  @IsNotEmpty()
  accion_sugerida: string;

  @IsOptional()
  @IsEnum(EstatusInconsistencia)
  estatus?: EstatusInconsistencia;
}
