import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('correcciones_cliente')
export class CorreccionCliente {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cliente_id: string;

  @Column({ type: 'smallint' })
  tipo_correccion_id: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ type: 'text', nullable: true })
  tiempo_promedio: string | null;

  @Column({ type: 'text', nullable: true })
  dato_actual: string | null;

  @Column({ type: 'text', nullable: true })
  dato_correcto: string | null;
}
