import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../common/database/numeric.transformer';

@Entity('escenario_pension')
export class EscenarioPension {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  diagnostico_f1_id: string;

  @Column({ type: 'text' })
  nombre_escenario: string;

  @Column({ type: 'smallint' })
  orden: number;

  @Column({ type: 'integer', nullable: true })
  semanas_proyectadas: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  salario_promedio_proyectado: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  inversion_total_estimada: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  pension_mensual_estimada: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  incremento_mensual: number | null;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 1,
    transformer: numericTransformer,
    nullable: true,
  })
  meses_recuperacion_inversion: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  beneficio_a_5_anios: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  beneficio_a_10_anios: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  beneficio_a_15_anios: number | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  salario_modalidad_40: number | null;

  @Column({ type: 'smallint', nullable: true })
  meses_modalidad_10: number | null;

  @Column({ type: 'smallint', nullable: true })
  meses_modalidad_40: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  costo_mensual_estimado: number | null;
}
