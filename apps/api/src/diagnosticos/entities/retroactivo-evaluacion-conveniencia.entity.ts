import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('retroactivo_evaluacion_conveniencia')
export class RetroactivoEvaluacionConveniencia {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  retroactivo_id: string;

  @Column({ type: 'text' })
  pregunta: string;

  @Column({ type: 'boolean', nullable: true })
  respuesta: boolean | null;
}
