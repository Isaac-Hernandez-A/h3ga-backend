import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CambiarContrasenaDto {
  @ApiProperty({ maxLength: 128, description: 'Contraseña actual del usuario autenticado.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  contrasena_actual: string;

  // Mismas reglas que CrearUsuarioDto.contrasena.
  @ApiProperty({
    minLength: 8,
    maxLength: 72,
    description: 'Nueva contraseña; distinta de la actual.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  contrasena_nueva: string;
}
