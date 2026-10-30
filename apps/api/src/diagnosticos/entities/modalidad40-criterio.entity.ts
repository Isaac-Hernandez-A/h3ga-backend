import { Column, Entity, PrimaryColumn } from 'typeorm';
import { CumplimientoCriterio } from '../../common/enums/db-enums';

@Entity('modalidad40_criterios')
export class Modalidad40Criterio {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  diagnostico_id: string;

  @Column({ type: 'text' })
  criterio: string;

  @Column({ type: 'enum', enum: CumplimientoCriterio, enumName: 'cumplimiento_criterio' })
  cumplimiento: CumplimientoCriterio;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;
}
