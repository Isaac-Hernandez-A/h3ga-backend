import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tipos_asesor')
export class TipoAsesor {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'boolean' })
  activo: boolean;
}
