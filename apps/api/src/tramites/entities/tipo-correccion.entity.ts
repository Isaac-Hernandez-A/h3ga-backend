import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tipo_correccion')
export class TipoCorreccion {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
