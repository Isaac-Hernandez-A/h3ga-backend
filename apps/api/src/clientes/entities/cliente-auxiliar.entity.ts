import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cliente_auxiliares')
export class ClienteAuxiliar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cliente_id: string;

  @Column({ type: 'uuid' })
  auxiliar_id: string;

  @Column({ type: 'uuid' })
  autorizado_por: string;

  @Column({ type: 'timestamptz' })
  fecha_autorizacion: Date;

  @Column({ type: 'boolean' })
  activo: boolean;
}
