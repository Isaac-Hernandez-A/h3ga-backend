import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RestablecerContrasenaDto {
  // Mismas reglas que CrearUsuarioDto.contrasena. 72 es el máximo útil de bcrypt (bytes).
  @ApiProperty({ minLength: 8, maxLength: 72, description: 'Nueva contraseña en texto plano.' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  contrasena: string;
}
