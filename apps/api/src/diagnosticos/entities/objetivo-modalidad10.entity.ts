import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('objetivo_modalidad_10')
export class ObjetivoModalidad10 {
  @PrimaryColumn('smallint')
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
