import { Column, Entity, PrimaryColumn } from 'typeorm';
import { CategoriaTramite } from '../../common/enums/db-enums';

@Entity('estatus_tramite')
export class EstatusTramite {
  @PrimaryColumn('smallint')
  id: number;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'enum', enum: CategoriaTramite, enumName: 'categoria_tramite' })
  categoria: CategoriaTramite;

  @Column({ type: 'smallint', nullable: true })
  avance_porcentaje_fijo: number | null;

  @Column({ type: 'boolean' })
  avance_editable: boolean;

  @Column({ type: 'smallint', nullable: true })
  avance_min: number | null;

  @Column({ type: 'smallint', nullable: true })
  avance_max: number | null;
}
