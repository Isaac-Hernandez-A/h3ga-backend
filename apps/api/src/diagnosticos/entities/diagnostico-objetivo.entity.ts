import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('diagnostico_objetivos')
export class DiagnosticoObjetivo {
  @PrimaryColumn('uuid')
  diagnostico_id: string;

  @PrimaryColumn('smallint')
  objetivo_id: number;

  @Column({ type: 'text', nullable: true })
  detalle_otro: string | null;
}
