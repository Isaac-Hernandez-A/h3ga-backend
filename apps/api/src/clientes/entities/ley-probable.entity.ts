import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ley_probable')
export class LeyProbable {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
