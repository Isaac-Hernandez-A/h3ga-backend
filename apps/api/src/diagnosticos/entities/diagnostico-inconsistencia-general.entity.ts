import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('diagnostico_inconsistencias_generales')
export class DiagnosticoInconsistenciaGeneral {
  @PrimaryColumn('uuid')
  diagnostico_id: string;

  @PrimaryColumn('smallint')
  tipo_id: number;

  @Column({ type: 'text', nullable: true })
  detalle_otro: string | null;
}
