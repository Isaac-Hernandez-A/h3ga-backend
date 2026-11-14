import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  EstadoCivil,
  EstadoConfirmacion,
  ObjetivoCliente,
  SexoCliente,
} from '../../common/enums/db-enums';

// Estructura de la CURP (18 caracteres): 4 letras, fecha AAMMDD, sexo H/M, entidad (2 letras),
// 3 consonantes internas, homoclave y dígito verificador.
export const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{2}[A-Z]{3}[A-Z0-9]\d$/;

export class CreateClienteDto {
  @IsString()
  nombre: string;

  @IsString()
  apellido_paterno: string;

  @IsString()
  apellido_materno: string;

  @IsString()
  referido_por: string;

  @IsString()
  telefono: string;

  // Se ignora: el expediente queda a nombre del asesor que lo registra (el `sub` del token).
  @IsOptional()
  @IsUUID()
  asesor_id?: string;

  @IsDateString()
  fecha_ingreso: string;

  @IsString()
  correo_electronico: string;

  @IsOptional()
  @IsString()
  @Matches(CURP_REGEX, { message: 'curp debe tener el formato de una CURP (18 caracteres).' })
  curp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(13)
  rfc?: string;

  @IsDateString()
  fecha_nacimiento: string;

  @IsEnum(EstadoCivil)
  estado_civil: EstadoCivil;

  @IsInt()
  dependientes_economicos: number;

  @IsInt()
  regimen_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(11)
  nss?: string;

  @IsInt()
  ley_probable_id: number;

  @IsInt()
  semanas_imss_reconocidas: number;

  @IsOptional()
  @IsInt()
  semanas_a_recuperar?: number;

  @IsEnum(EstadoConfirmacion)
  tiene_issste: EstadoConfirmacion;

  @IsInt()
  afore_id: number;

  @IsString()
  observaciones_generales: string;

  @IsEnum(EstadoConfirmacion)
  requiere_contadora: EstadoConfirmacion;

  @IsEnum(SexoCliente)
  sexo: SexoCliente;

  @IsOptional()
  @IsString()
  ocupacion?: string;

  @IsString()
  domicilio: string;

  @IsString()
  estado: string;

  @IsString()
  subdelegacion_imss_probable: string;

  @IsEnum(EstadoConfirmacion)
  cambio_afore: EstadoConfirmacion;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  ine?: string;

  @IsEnum(ObjetivoCliente)
  objetivo_cliente: ObjetivoCliente;
}
