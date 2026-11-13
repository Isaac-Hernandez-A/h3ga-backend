import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import {
  ConvenienciaPension,
  EvaluacionModalidad,
  SiNoParcial,
  TipoPension,
  ValidacionEstado,
} from '../../common/enums/db-enums';
import { numericTransformer } from '../../common/database/numeric.transformer';

@Entity('diagnostico_especializado')
export class DiagnosticoEspecializado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cliente_id: string;

  @Column({ type: 'date' })
  fecha_analisis: string;

  @Column({ type: 'uuid' })
  asesor_id: string;

  @Column({ type: 'date', nullable: true })
  fecha_primera_cotizacion: string | null;

  @Column({ type: 'boolean', nullable: true })
  cotizo_antes_julio_1997: boolean | null;

  @Column({ type: 'enum', enum: TipoPension, enumName: 'tipo_pension', nullable: true })
  tipo_pension_probable: TipoPension | null;

  @Column({ type: 'smallint', nullable: true })
  edad_objetivo_pension: number | null;

  @Column({ type: 'text', nullable: true })
  comentarios_cliente: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones_regimen: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_ultima_baja: string | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  ultimo_salario_cotizado: number | null;

  @Column({ type: 'date', nullable: true })
  fecha_vencimiento_conservacion: string | null;

  @Column({ type: 'enum', enum: ValidacionEstado, enumName: 'validacion_estado', nullable: true })
  tiene_conservacion_derechos: ValidacionEstado | null;

  @Column({ type: 'integer', nullable: true })
  tiempo_estimado_conservacion_meses: number | null;

  @Column({ type: 'enum', enum: ValidacionEstado, enumName: 'validacion_estado', nullable: true })
  dentro_de_conservacion: ValidacionEstado | null;

  @Column({ type: 'boolean' })
  requiere_reactivacion: boolean;

  @Column({
    type: 'enum',
    enum: ConvenienciaPension,
    enumName: 'conveniencia_pension',
    nullable: true,
  })
  conviene_pensionar_ahora: ConvenienciaPension | null;

  @Column({ type: 'text', nullable: true })
  comentarios_conservacion: string | null;

  @Column({ type: 'integer', nullable: true })
  semanas_reconocidas_al_baja: number | null;

  @Column({ type: 'integer' })
  semanas_descontadas: number;

  @Column({ type: 'integer' })
  semanas_reintegradas: number;

  @Column({ type: 'integer', nullable: true })
  semanas_efectivas_pension: number | null;

  @Column({ type: 'integer', nullable: true })
  semanas_requeridas_pension: number | null;

  @Column({ type: 'enum', enum: SiNoParcial, enumName: 'si_no_parcial', nullable: true })
  trabaja_cuenta_propia: SiNoParcial | null;

  @Column({ type: 'text', nullable: true })
  actividad_economica: string | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  ingreso_mensual_aproximado: number | null;

  @Column({
    type: 'enum',
    enum: EvaluacionModalidad,
    enumName: 'evaluacion_modalidad',
    nullable: true,
  })
  conclusion_modalidad_10: EvaluacionModalidad | null;

  @Column({ type: 'text', nullable: true })
  comentarios_modalidad_10: string | null;

  @Column({ type: 'enum', enum: ValidacionEstado, enumName: 'validacion_estado', nullable: true })
  dado_de_baja_regimen_obligatorio: ValidacionEstado | null;

  @Column({
    type: 'enum',
    enum: EvaluacionModalidad,
    enumName: 'evaluacion_modalidad',
    nullable: true,
  })
  conclusion_modalidad_40: EvaluacionModalidad | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
    nullable: true,
  })
  salario_propuesto_m40: number | null;

  @Column({ type: 'smallint', nullable: true })
  meses_propuestos_m40: number | null;

  @Column({ type: 'boolean' })
  evalua_retroactivo_m40: boolean;

  @Column({ type: 'text', nullable: true })
  comentarios_modalidad_40: string | null;

  @Column({ type: 'text', nullable: true })
  justificacion_estrategia: string | null;

  @Column({ type: 'text', nullable: true })
  siguiente_paso_sugerido: string | null;

  @Column({ type: 'text', nullable: true })
  conclusion_financiera: string | null;

  @Column({ type: 'text', nullable: true })
  firma_cliente_path: string | null;

  @Column({ type: 'text', nullable: true })
  firma_asesor_path: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_firma: Date | null;

  @Column({ type: 'timestamptz' })
  creado_en: Date;

  @Column({ type: 'timestamptz' })
  actualizado_en: Date;
}
