import { IsEnum, Matches } from 'class-validator';
import { CriterioSeleccionNss, EtapaInstitucionalNss } from '../../common/enums/db-enums';

// El NSS tiene exactamente 11 dígitos.
export const NSS_REGEX = /^\d{11}$/;

export class CreateUnificacionNssDetalleDto {
  @Matches(NSS_REGEX, { message: 'nss_principal_elegido debe tener 11 dígitos.' })
  nss_principal_elegido: string;

  @IsEnum(CriterioSeleccionNss)
  criterio_seleccion: CriterioSeleccionNss;

  @IsEnum(EtapaInstitucionalNss)
  etapa_institucional_actual: EtapaInstitucionalNss;
}
