import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('objetivo_especifico_inicial')
export class ObjetivoEspecificoInicial {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
