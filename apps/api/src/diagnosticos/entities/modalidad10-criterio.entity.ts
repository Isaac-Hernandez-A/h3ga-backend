import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('modalidad10_criterios')
export class Modalidad10Criterio {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  diagnostico_id: string;

  @Column({ type: 'text' })
  criterio: string;

  @Column({ type: 'boolean', nullable: true })
  cumple: boolean | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;
}
