import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { EstatusInconsistencia } from '../../common/enums/db-enums';

export class CreatePeriodoInconsistenciaDto {
  @IsString()
  nombre_patron: string;

  @IsString()
  periodo_reclamado: string;

  @IsInt()
  semanas_esperadas: number;

  @IsOptional()
  @IsInt()
  semanas_reconocidas?: number;

  @IsString()
  evidencia_disponible: string;

  @IsString()
  accion_sugerida: string;

  @IsOptional()
  @IsEnum(EstatusInconsistencia)
  estatus?: EstatusInconsistencia;
}
