import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tipo_gestion_recuperacion')
export class TipoGestionRecuperacion {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
