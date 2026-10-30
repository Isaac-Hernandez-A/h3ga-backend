import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('recuperacion_gestiones')
export class RecuperacionGestion {
  @PrimaryColumn('uuid')
  analisis_id: string;

  @PrimaryColumn('smallint')
  tipo_gestion_id: number;

  @Column({ type: 'text', nullable: true })
  detalle_otro: string | null;
}
