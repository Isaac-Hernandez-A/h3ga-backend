import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('objetivo_diagnostico')
export class ObjetivoDiagnostico {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
