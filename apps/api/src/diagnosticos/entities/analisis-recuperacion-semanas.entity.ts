import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AplicabilidadRecuperacion } from '../../common/enums/db-enums';

@Entity('analisis_recuperacion_semanas')
export class AnalisisRecuperacionSemanas {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  diagnostico_id: string;

  @Column({ type: 'enum', enum: AplicabilidadRecuperacion, enumName: 'aplicabilidad_recuperacion' })
  aplica: AplicabilidadRecuperacion;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;
}
