import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('etapas_tramite_historial')
export class EtapaTramiteHistorial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  etapa_tramite_id: string;

  @Column({ type: 'smallint', nullable: true })
  estatus_anterior_id: number | null;

  @Column({ type: 'smallint' })
  estatus_nuevo_id: number;

  @Column({ type: 'text', nullable: true })
  motivo_rechazo: string | null;

  @Column({ type: 'uuid' })
  cambiado_por: string;

  @Column({ type: 'timestamptz' })
  fecha_cambio: Date;
}
