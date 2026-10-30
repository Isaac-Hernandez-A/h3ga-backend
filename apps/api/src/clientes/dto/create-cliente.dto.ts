import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  EstadoCivil,
  EstadoConfirmacion,
  ObjetivoCliente,
  SexoCliente,
} from '../../common/enums/db-enums';

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

  @IsUUID()
  asesor_id: string;

  @IsDateString()
  fecha_ingreso: string;

  @IsString()
  correo_electronico: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
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
