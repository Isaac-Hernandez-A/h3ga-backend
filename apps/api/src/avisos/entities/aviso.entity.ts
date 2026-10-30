import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TipoAviso } from '../../common/enums/db-enums';

@Entity('avisos')
export class Aviso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TipoAviso, enumName: 'tipo_aviso' })
  tipo: TipoAviso;

  @Column({ type: 'uuid', nullable: true })
  etapa_tramite_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  evento_id: string | null;

  @Column({ type: 'timestamptz' })
  fecha_alerta: Date;

  @Column({ type: 'boolean' })
  atendido: boolean;

  @Column({ type: 'uuid', nullable: true })
  atendido_por: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  fecha_atencion: Date | null;
}
