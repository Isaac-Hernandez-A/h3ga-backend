import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('etapas_tramite')
export class EtapaTramite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cliente_id: string;

  @Column({ type: 'smallint' })
  etapa_id: number;

  @Column({ type: 'smallint' })
  estatus_id: number;

  @Column({ type: 'smallint' })
  avance_porcentaje: number;

  @Column({ type: 'text', nullable: true })
  accion_a_realizar: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_compromiso: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_completada: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reactivado_en: Date | null;

  @Column({ type: 'timestamptz' })
  creado_el: Date;

  @Column({ type: 'timestamptz' })
  actualizado_el: Date;

  @Column({ type: 'text', nullable: true })
  motivo_rechazo: string | null;
}
