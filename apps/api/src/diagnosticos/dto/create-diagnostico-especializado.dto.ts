import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  ConvenienciaPension,
  EvaluacionModalidad,
  SiNoParcial,
  TipoPension,
  ValidacionEstado,
} from '../../common/enums/db-enums';

const MAX_ENTERO = 2147483647;
const MAX_DINERO = 99999999.99; // NUMERIC(10, 2)

// Cabecera del F1. El asistente del frontend lo guarda por pasos, así que TODOS los campos son opcionales
// (y se pueden borrar con null); que el formato esté completo se valida al descargar el PDF. asesor_id no se
// recibe: es el asesor del cliente. Se omiten los NOT NULL con valor por omisión que no se capturan aparte.
export class CreateDiagnosticoEspecializadoDto {
  @IsOptional()
  @IsDateString()
  fecha_analisis?: string | null;

  @IsOptional()
  @IsDateString()
  fecha_primera_cotizacion?: string | null;

  @IsOptional()
  @IsBoolean()
  cotizo_antes_julio_1997?: boolean | null;

  @IsOptional()
  @IsEnum(TipoPension)
  tipo_pension_probable?: TipoPension | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  edad_objetivo_pension?: number | null;

  @IsOptional()
  @IsString()
  comentarios_cliente?: string | null;

  @IsOptional()
  @IsString()
  observaciones_regimen?: string | null;

  @IsOptional()
  @IsDateString()
  fecha_ultima_baja?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_DINERO)
  ultimo_salario_cotizado?: number | null;

  @IsOptional()
  @IsDateString()
  fecha_vencimiento_conservacion?: string | null;

  @IsOptional()
  @IsEnum(ValidacionEstado)
  tiene_conservacion_derechos?: ValidacionEstado | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ENTERO)
  tiempo_estimado_conservacion_meses?: number | null;

  @IsOptional()
  @IsEnum(ValidacionEstado)
  dentro_de_conservacion?: ValidacionEstado | null;

  @IsOptional()
  @IsBoolean()
  requiere_reactivacion?: boolean;

  @IsOptional()
  @IsEnum(ConvenienciaPension)
  conviene_pensionar_ahora?: ConvenienciaPension | null;

  @IsOptional()
  @IsString()
  comentarios_conservacion?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ENTERO)
  semanas_reconocidas_al_baja?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ENTERO)
  semanas_descontadas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ENTERO)
  semanas_reintegradas?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ENTERO)
  semanas_efectivas_pension?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_ENTERO)
  semanas_requeridas_pension?: number | null;

  @IsOptional()
  @IsEnum(SiNoParcial)
  trabaja_cuenta_propia?: SiNoParcial | null;

  @IsOptional()
  @IsString()
  actividad_economica?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_DINERO)
  ingreso_mensual_aproximado?: number | null;

  @IsOptional()
  @IsEnum(EvaluacionModalidad)
  conclusion_modalidad_10?: EvaluacionModalidad | null;

  @IsOptional()
  @IsString()
  comentarios_modalidad_10?: string | null;

  @IsOptional()
  @IsEnum(ValidacionEstado)
  dado_de_baja_regimen_obligatorio?: ValidacionEstado | null;

  @IsOptional()
  @IsEnum(EvaluacionModalidad)
  conclusion_modalidad_40?: EvaluacionModalidad | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(MAX_DINERO)
  salario_propuesto_m40?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(32767)
  meses_propuestos_m40?: number | null;

  @IsOptional()
  @IsBoolean()
  evalua_retroactivo_m40?: boolean;

  @IsOptional()
  @IsString()
  comentarios_modalidad_40?: string | null;

  @IsOptional()
  @IsString()
  justificacion_estrategia?: string | null;

  @IsOptional()
  @IsString()
  siguiente_paso_sugerido?: string | null;

  @IsOptional()
  @IsString()
  conclusion_financiera?: string | null;
}
