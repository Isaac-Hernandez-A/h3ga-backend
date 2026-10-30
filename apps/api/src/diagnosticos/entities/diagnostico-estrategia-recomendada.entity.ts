import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('diagnostico_estrategias_recomendadas')
export class DiagnosticoEstrategiaRecomendada {
  @PrimaryColumn('uuid')
  diagnostico_id: string;

  @PrimaryColumn('smallint')
  estrategia_id: number;

  @Column({ type: 'text', nullable: true })
  detalle_otro: string | null;
}
