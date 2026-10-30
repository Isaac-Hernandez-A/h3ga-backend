import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EstadoCivil, EstadoSalud } from '../../common/enums/db-enums';
import { numericTransformer } from '../../common/database/numeric.transformer';

@Entity('situacion_patrimonial')
export class SituacionPatrimonial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  diagnostico_f1_id: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  saldo_cuenta_individual: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  aportaciones_voluntarias: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  ahorros_inversiones_adicionales: number;

  @Column({ type: 'text' })
  bienes_patrimoniales: string;

  @Column({ type: 'text' })
  creditos_deudas_vigentes: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  ingreso_mensual: number;

  @Column({ type: 'text' })
  otras_fuentes_ingreso: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  ingreso_conyuge: number;

  @Column({ type: 'text' })
  seguros: string;

  @Column({ type: 'enum', enum: EstadoSalud, enumName: 'estado_salud' })
  estado_salud: EstadoSalud;

  @Column({ type: 'text' })
  padecimientos: string;

  @Column({ type: 'enum', enum: EstadoCivil, enumName: 'estado_civil' })
  estado_civil: EstadoCivil;

  @Column({ type: 'smallint', nullable: true })
  edad_conyuge: number | null;

  @Column({ type: 'text', nullable: true })
  actividad_economica_conyuge: string | null;
}
