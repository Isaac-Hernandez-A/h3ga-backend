import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EstatusPlanAccion } from '../../common/enums/db-enums';

@Entity('plan_accion')
export class PlanAccion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  diagnostico_id: string;

  @Column({ type: 'text' })
  accion: string;

  @Column({ type: 'date', nullable: true })
  fecha_objetivo: string | null;

  @Column({ type: 'enum', enum: EstatusPlanAccion, enumName: 'estatus_plan_accion' })
  estatus: EstatusPlanAccion;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;
}
