import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EvaluacionRetroactivo, ValidacionEstado } from '../../common/enums/db-enums';
import { numericTransformer } from '../../common/database/numeric.transformer';

@Entity('analisis_modalidad40_retroactivo')
export class AnalisisModalidad40Retroactivo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  diagnostico_id: string;

  @Column({ type: 'date', nullable: true })
  fecha_propuesta_inicio_m40: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_solicitud: string | null;

  @Column({ type: 'smallint', nullable: true })
  meses_retroactivos_estimados: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  salario_diario_propuesto: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  cuotas_estimadas: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  recargos_actualizaciones_estimadas: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  total_estimado_pagar: number | null;

  @Column({ type: 'boolean', nullable: true })
  baja_por_mora_previa: boolean | null;

  @Column({ type: 'enum', enum: ValidacionEstado, enumName: 'validacion_estado' })
  dentro_de_plazo_reingreso: ValidacionEstado;

  @Column({ type: 'enum', enum: EvaluacionRetroactivo, enumName: 'evaluacion_retroactivo' })
  conclusion_retroactivo: EvaluacionRetroactivo;

  @Column({ type: 'text', nullable: true })
  comentarios: string | null;
}
