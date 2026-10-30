import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tipo_documento')
export class TipoDocumento {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
