import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EstadoConfirmacion } from '../../common/enums/db-enums';

@Entity('documentos_clientes')
export class DocumentoCliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cliente_id: string;

  @Column({ type: 'smallint' })
  tipo_documento_id: number;

  @Column({ type: 'text' })
  archivo_path: string;

  @Column({ type: 'text' })
  nombre_archivo_original: string;

  @Column({ type: 'text' })
  mime_type: string;

  @Column({ type: 'enum', enum: EstadoConfirmacion, enumName: 'estado_confirmacion' })
  estatus: EstadoConfirmacion;

  @Column({ type: 'text', nullable: true })
  numero_referencia: string | null;

  @Column({ type: 'timestamptz' })
  fecha_carga: Date;

  @Column({ type: 'uuid' })
  subido_por: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;
}
