import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  ConvenienciaPension,
  EvaluacionModalidad,
  SiNoParcial,
  TipoPension,
  ValidacionEstado,
} from '../../common/enums/db-enums';

export class CreateDiagnosticoEspecializadoDto {
  @IsOptional()
  @IsDateString()
  fecha_analisis?: string;

  @IsUUID()
  asesor_id: string;

  @IsOptional()
  @IsDateString()
  fecha_primera_cotizacion?: string;

  @IsBoolean()
  cotizo_antes_julio_1997: boolean;

  @IsEnum(TipoPension)
  tipo_pension_probable: TipoPension;

  @IsInt()
  edad_objetivo_pension: number;

  @IsOptional()
  @IsString()
  comentarios_cliente?: string;

  @IsOptional()
  @IsString()
  observaciones_regimen?: string;

  @IsOptional()
  @IsDateString()
  fecha_ultima_baja?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  ultimo_salario_cotizado?: number;

  @IsOptional()
  @IsDateString()
  fecha_vencimiento_conservacion?: string;

  @IsEnum(ValidacionEstado)
  tiene_conservacion_derechos: ValidacionEstado;

  @IsOptional()
  @IsInt()
  tiempo_estimado_conservacion_meses?: number;

  @IsEnum(ValidacionEstado)
  dentro_de_conservacion: ValidacionEstado;

  @IsOptional()
  @IsBoolean()
  requiere_reactivacion?: boolean;

  @IsEnum(ConvenienciaPension)
  conviene_pensionar_ahora: ConvenienciaPension;

  @IsOptional()
  @IsString()
  comentarios_conservacion?: string;

  @IsOptional()
  @IsInt()
  semanas_reconocidas_al_baja?: number;

  @IsOptional()
  @IsInt()
  semanas_descontadas?: number;

  @IsOptional()
  @IsInt()
  semanas_reintegradas?: number;

  @IsInt()
  semanas_efectivas_pension: number;

  @IsOptional()
  @IsInt()
  semanas_requeridas_pension?: number;

  @IsEnum(SiNoParcial)
  trabaja_cuenta_propia: SiNoParcial;

  @IsOptional()
  @IsString()
  actividad_economica?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  ingreso_mensual_aproximado?: number;

  @IsEnum(EvaluacionModalidad)
  conclusion_modalidad_10: EvaluacionModalidad;

  @IsOptional()
  @IsString()
  comentarios_modalidad_10?: string;

  @IsEnum(ValidacionEstado)
  dado_de_baja_regimen_obligatorio: ValidacionEstado;

  @IsEnum(EvaluacionModalidad)
  conclusion_modalidad_40: EvaluacionModalidad;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  salario_propuesto_m40?: number;

  @IsOptional()
  @IsInt()
  meses_propuestos_m40?: number;

  @IsOptional()
  @IsBoolean()
  evalua_retroactivo_m40?: boolean;

  @IsOptional()
  @IsString()
  comentarios_modalidad_40?: string;

  @IsString()
  justificacion_estrategia: string;

  @IsOptional()
  @IsString()
  siguiente_paso_sugerido?: string;

  @IsOptional()
  @IsString()
  conclusion_financiera?: string;

  @IsOptional()
  @IsString()
  firma_cliente_path?: string;

  @IsOptional()
  @IsString()
  firma_asesor_path?: string;

  @IsOptional()
  @IsDateString()
  fecha_firma?: string;
}
