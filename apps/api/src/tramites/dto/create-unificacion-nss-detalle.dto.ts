import { IsEnum, IsString, MaxLength } from 'class-validator';
import { CriterioSeleccionNss, EtapaInstitucionalNss } from '../../common/enums/db-enums';

export class CreateUnificacionNssDetalleDto {
  @IsString()
  @MaxLength(11)
  nss_principal_elegido: string;

  @IsEnum(CriterioSeleccionNss)
  criterio_seleccion: CriterioSeleccionNss;

  @IsEnum(EtapaInstitucionalNss)
  etapa_institucional_actual: EtapaInstitucionalNss;
}
