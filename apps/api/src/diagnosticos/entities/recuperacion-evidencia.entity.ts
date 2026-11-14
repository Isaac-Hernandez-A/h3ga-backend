import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('recuperacion_evidencias')
export class RecuperacionEvidencia {
  @PrimaryColumn('uuid')
  analisis_id: string;

  @PrimaryColumn('smallint')
  tipo_evidencia_id: number;

  @Column({ type: 'text', nullable: true })
  detalle_otro: string | null;
}
