import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('situacion_patrimonial_hijos')
export class SituacionPatrimonialHijos {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  situacion_patrimonial_id: string;

  @Column({ type: 'smallint' })
  numero_hijos: number;

  @Column({ type: 'boolean' })
  tiene_discapacidad: boolean;

  @Column({ type: 'smallint' })
  edad: number;
}
