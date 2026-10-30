import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('unificacion_nss_secundarios')
export class UnificacionNssSecundario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  unificacion_id: string;

  @Column({ type: 'varchar', length: 11 })
  nss: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;
}
