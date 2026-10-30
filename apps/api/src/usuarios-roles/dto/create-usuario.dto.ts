import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateUsuarioDto {
  @IsInt()
  rol_id: number;

  @IsOptional()
  @IsInt()
  tipo_asesor_id?: number;

  @IsString()
  nombre: string;

  @IsString()
  apellido_paterno: string;

  @IsString()
  apellido_materno: string;

  @IsString()
  correo_electronico: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
