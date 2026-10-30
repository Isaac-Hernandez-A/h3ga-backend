import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('afore')
export class Afore {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
