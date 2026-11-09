import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// roles.id y tipos_asesor.id son SMALLINT: fuera de este rango PostgreSQL rechaza el valor (sería un 500).
const ID_MIN = 1;
const ID_MAX = 32767;

export class CrearUsuarioDto {
  @IsInt()
  @Min(ID_MIN)
  @Max(ID_MAX)
  rol_id: number;

  // Solo aplica a asesores; para auxiliar y supervisor debe quedar vacío (NULL).
  @IsOptional()
  @IsInt()
  @Min(ID_MIN)
  @Max(ID_MAX)
  tipo_asesor_id?: number | null;

  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  apellido_paterno: string;

  // Puede ir vacío: la columna es NOT NULL y hay personas sin segundo apellido.
  @IsString()
  apellido_materno: string;

  @IsEmail()
  correo_electronico: string;

  // Contraseña en texto plano SOLO de entrada: se cifra y se guarda en usuarios.contrasena_hash.
  // 72 es el máximo útil de bcrypt (bytes).
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  contrasena: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
