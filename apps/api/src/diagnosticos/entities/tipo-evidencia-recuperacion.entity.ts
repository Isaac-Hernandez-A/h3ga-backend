import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tipo_evidencia_recuperacion')
export class TipoEvidenciaRecuperacion {
  @PrimaryGeneratedColumn('identity', { type: 'smallint', generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'text' })
  nombre: string;
}
