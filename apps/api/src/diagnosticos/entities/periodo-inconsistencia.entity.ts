import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EstatusInconsistencia } from '../../common/enums/db-enums';

@Entity('periodos_inconsistencias')
export class PeriodoInconsistencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cliente_id: string;

  @Column({ type: 'text' })
  nombre_patron: string;

  @Column({ type: 'text' })
  periodo_reclamado: string;

  @Column({ type: 'integer' })
  semanas_esperadas: number;

  @Column({ type: 'integer' })
  semanas_reconocidas: number;

  @Column({ type: 'text' })
  evidencia_disponible: string;

  @Column({ type: 'text' })
  accion_sugerida: string;

  @Column({ type: 'enum', enum: EstatusInconsistencia, enumName: 'estatus_inconsistencia' })
  estatus: EstatusInconsistencia;
}
