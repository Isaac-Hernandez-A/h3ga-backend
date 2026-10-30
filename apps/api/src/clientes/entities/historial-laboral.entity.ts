import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EstadoConfirmacion } from '../../common/enums/db-enums';
import { numericTransformer } from '../../common/database/numeric.transformer';

@Entity('historial_laboral')
export class HistorialLaboral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cliente_id: string;

  @Column({ type: 'integer' })
  semanas_issste: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
  salario_promedio: number;

  @Column({ type: 'text' })
  ultimo_patron: string;

  @Column({ type: 'enum', enum: EstadoConfirmacion, enumName: 'estado_confirmacion' })
  vigencia_derechos: EstadoConfirmacion;

  @Column({ type: 'boolean' })
  activo: boolean;
}
