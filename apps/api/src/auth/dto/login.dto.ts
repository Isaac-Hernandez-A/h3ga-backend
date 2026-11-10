import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  @MaxLength(254)
  correo_electronico: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  contrasena: string;
}

export class UsuarioSesion {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Nombre y apellido paterno.' })
  nombre: string;

  @ApiProperty({ enum: ['asesor', 'auxiliar', 'supervisor'] })
  rol: 'asesor' | 'auxiliar' | 'supervisor';
}

export class SesionRespuesta {
  @ApiProperty({ description: 'JWT HS256 con sub, rol y exp.' })
  access_token: string;

  @ApiProperty({ example: 28800, description: 'Vigencia en segundos (8 horas).' })
  expires_in: number;

  @ApiProperty({ type: UsuarioSesion })
  usuario: UsuarioSesion;
}
