import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EstadoCivil, EstadoSalud } from '../../common/enums/db-enums';
import { numericTransformer } from '../../common/database/numeric.transformer';

@Entity('situacion_patrimonial')
export class SituacionPatrimonial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  diagnostico_f1_id: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  saldo_cuenta_individual: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  aportaciones_voluntarias: number | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  ahorros_inversiones_adicionales: number | null;

  @Column({ type: 'text', nullable: true })
  bienes_patrimoniales: string | null;

  @Column({ type: 'text', nullable: true })
  creditos_deudas_vigentes: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  ingreso_mensual: number | null;

  @Column({ type: 'text', nullable: true })
  otras_fuentes_ingreso: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  ingreso_conyuge: number | null;

  @Column({ type: 'text', nullable: true })
  seguros: string | null;

  @Column({ type: 'enum', enum: EstadoSalud, enumName: 'estado_salud', nullable: true })
  estado_salud: EstadoSalud | null;

  @Column({ type: 'text', nullable: true })
  padecimientos: string | null;

  @Column({ type: 'enum', enum: EstadoCivil, enumName: 'estado_civil', nullable: true })
  estado_civil: EstadoCivil | null;

  @Column({ type: 'smallint', nullable: true })
  edad_conyuge: number | null;

  @Column({ type: 'text', nullable: true })
  actividad_economica_conyuge: string | null;
}
