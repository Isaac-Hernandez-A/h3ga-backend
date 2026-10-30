import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('objetivo_modalidad_40')
export class ObjetivoModalidad40 {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
