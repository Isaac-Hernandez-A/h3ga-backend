import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Publico } from '../common/auth/publico.decorator';
import { AuthService } from './auth.service';
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
}
