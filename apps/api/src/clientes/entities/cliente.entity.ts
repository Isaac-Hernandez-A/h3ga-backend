import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import {
  EstadoCivil,
  EstadoConfirmacion,
  ObjetivoCliente,
  SexoCliente,
} from '../../common/enums/db-enums';

@Entity('clientes')
export class Cliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text' })
  apellido_paterno: string;

  @Column({ type: 'text' })
  apellido_materno: string;

  @Column({ type: 'text' })
  referido_por: string;

  @Column({ type: 'text' })
  telefono: string;

  @Column({ type: 'uuid' })
  asesor_id: string;

  @Column({ type: 'date' })
  fecha_ingreso: string;

  @Column({ type: 'text' })
  correo_electronico: string;

  @Column({ type: 'varchar', length: 18, nullable: true })
  curp: string | null;

  @Column({ type: 'varchar', length: 13, nullable: true })
  rfc: string | null;

  @Column({ type: 'date' })
  fecha_nacimiento: string;

  @Column({ type: 'enum', enum: EstadoCivil, enumName: 'estado_civil' })
  estado_civil: EstadoCivil;

  @Column({ type: 'integer' })
  dependientes_economicos: number;

  @Column({ type: 'smallint' })
  regimen_id: number;

  @Column({ type: 'varchar', length: 11, nullable: true })
  nss: string | null;

  @Column({ type: 'smallint' })
  ley_probable_id: number;

  @Column({ type: 'integer' })
  semanas_imss_reconocidas: number;

  @Column({ type: 'integer', nullable: true })
  semanas_a_recuperar: number | null;

  @Column({ type: 'enum', enum: EstadoConfirmacion, enumName: 'estado_confirmacion' })
  tiene_issste: EstadoConfirmacion;

  @Column({ type: 'smallint' })
  afore_id: number;

  @Column({ type: 'text' })
  observaciones_generales: string;

  @Column({ type: 'enum', enum: EstadoConfirmacion, enumName: 'estado_confirmacion' })
  requiere_contadora: EstadoConfirmacion;

  @Column({ type: 'enum', enum: SexoCliente, enumName: 'sexo_cliente' })
  sexo: SexoCliente;

  @Column({ type: 'text', nullable: true })
  ocupacion: string | null;

  @Column({ type: 'text' })
  domicilio: string;

  @Column({ type: 'text' })
  estado: string;

  @Column({ type: 'text' })
  subdelegacion_imss_probable: string;

  @Column({ type: 'enum', enum: EstadoConfirmacion, enumName: 'estado_confirmacion' })
  cambio_afore: EstadoConfirmacion;

  @Column({ type: 'varchar', length: 18, nullable: true })
  ine: string | null;

  @Column({ type: 'enum', enum: ObjetivoCliente, enumName: 'objetivo_cliente' })
  objetivo_cliente: ObjetivoCliente;
}
