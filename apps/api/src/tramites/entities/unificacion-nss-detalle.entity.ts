import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CriterioSeleccionNss, EtapaInstitucionalNss } from '../../common/enums/db-enums';

@Entity('unificacion_nss_detalle')
export class UnificacionNssDetalle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  correccion_id: string;

  @Column({ type: 'varchar', length: 11 })
  nss_principal_elegido: string;

  @Column({ type: 'enum', enum: CriterioSeleccionNss, enumName: 'criterio_seleccion_nss' })
  criterio_seleccion: CriterioSeleccionNss;

  @Column({ type: 'enum', enum: EtapaInstitucionalNss, enumName: 'etapa_institucional_nss' })
  etapa_institucional_actual: EtapaInstitucionalNss;
}
