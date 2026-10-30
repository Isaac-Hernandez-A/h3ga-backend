import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('etapas_proceso')
export class EtapaProceso {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'smallint' })
  numero_paso: number;

  @Column({ type: 'text' })
  nombre: string;
}
