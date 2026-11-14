import { Body, Controller, HttpCode, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PERMISOS } from '../common/auth/permisos';
import { Publico } from '../common/auth/publico.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { AuthService } from './auth.service';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { LoginDto, SesionRespuesta } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('login')
  @Publico()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Valida el correo y la contraseña y emite el JWT (8 horas). Correo inexistente, contraseña ' +
      'incorrecta y usuario inactivo responden el mismo 401.',
  })
  @ApiOkResponse({ type: SesionRespuesta })
  @ApiBadRequestResponse({ description: 'Falta el correo o la contraseña.' })
  @ApiUnauthorizedResponse({ description: 'Correo o contraseña incorrectos.' })
  login(@Body() dto: LoginDto): Promise<SesionRespuesta> {
    return this.service.iniciarSesion(dto.correo_electronico, dto.contrasena);
  }

  @Patch('contrasena')
  @Roles(...PERMISOS.auth.cambiarContrasena)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Cambiar la contraseña propia',
    description:
      'Cualquier rol autenticado, sobre su propio usuario (sub del token). Una contraseña actual ' +
      'incorrecta responde 400 (no 401) para no cerrar la sesión del frontend.',
  })
  @ApiNoContentResponse({ description: 'Contraseña cambiada.' })
  @ApiBadRequestResponse({
    description:
      'Cuerpo inválido, "La contraseña actual es incorrecta." o la nueva es igual a la actual.',
  })
  @ApiUnauthorizedResponse({
    description: 'Falta el token o no es válido, o el usuario está inactivo o ya no existe.',
  })
  cambiarContrasena(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: CambiarContrasenaDto,
  ): Promise<void> {
    return this.service.cambiarContrasena(usuario.sub, dto.contrasena_actual, dto.contrasena_nueva);
  }
}
