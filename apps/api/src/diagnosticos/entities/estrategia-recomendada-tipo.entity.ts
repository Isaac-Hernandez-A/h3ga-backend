import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('estrategia_recomendada_tipo')
export class EstrategiaRecomendadaTipo {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
