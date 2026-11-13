import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { AuxiliarRespuesta } from './dto/auxiliar-respuesta.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';
import { ListarUsuariosQueryDto } from './dto/listar-usuarios-query.dto';
import { UsuarioRespuesta } from './dto/usuario-respuesta.dto';
import { Rol } from './entities/rol.entity';
import { TipoAsesor } from './entities/tipo-asesor.entity';
import { UsuariosRolesService } from './usuarios-roles.service';

@ApiTags('usuarios-roles')
@Controller()
export class UsuariosRolesController {
  constructor(private readonly service: UsuariosRolesService) {}

  @Get('usuarios')
  @Roles(...PERMISOS.usuarios.leer)
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiOkResponse({ type: UsuarioRespuesta, isArray: true })
  listarUsuarios(@Query() consulta: ListarUsuariosQueryDto): Promise<UsuarioRespuesta[]> {
    return this.service.listar({ activo: consulta.activo });
  }

  @Get('auxiliares')
  @Roles(...PERMISOS.usuarios.listarAuxiliares)
  @ApiOperation({
    summary: 'Listar los usuarios con rol auxiliar',
    description:
      'Para el selector "Autorizar a un auxiliar" y para mostrar el nombre de cada auxiliar autorizado. ' +
      'Incluye activos e inactivos, ordenados por nombre; nunca devuelve la contraseña ni datos de acceso.',
  })
  @ApiOkResponse({ type: AuxiliarRespuesta, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido.' })
  @ApiForbiddenResponse({ description: 'El rol no puede consultar los auxiliares (auxiliar).' })
  listarAuxiliares(): Promise<AuxiliarRespuesta[]> {
    return this.service.listarAuxiliares();
  }

  @Get('usuarios/:usuarioId')
  @Roles(...PERMISOS.usuarios.leer)
  @ApiOperation({ summary: 'Obtener un usuario' })
  @ApiOkResponse({ type: UsuarioRespuesta })
  obtenerUsuario(@Param('usuarioId', ParseUUIDPipe) usuarioId: string): Promise<UsuarioRespuesta> {
    return this.service.obtener(usuarioId);
  }

  @Post('usuarios')
  @Roles(...PERMISOS.usuarios.escribir)
  @ApiOperation({ summary: 'Crear un usuario' })
  @ApiCreatedResponse({ type: UsuarioRespuesta })
  crearUsuario(@Body() dto: CrearUsuarioDto): Promise<UsuarioRespuesta> {
    return this.service.crear(dto);
  }

  @Patch('usuarios/:usuarioId')
  @Roles(...PERMISOS.usuarios.escribir)
  @ApiOperation({ summary: 'Actualizar o desactivar un usuario' })
  @ApiOkResponse({ type: UsuarioRespuesta })
  actualizarUsuario(
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
    @Body() dto: ActualizarUsuarioDto,
  ): Promise<UsuarioRespuesta> {
    return this.service.actualizar(usuarioId, dto);
  }

  @Patch('usuarios/:usuarioId/contrasena')
  @Roles(...PERMISOS.usuarios.restablecerContrasena)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Restablecer la contraseña de un usuario',
    description:
      'Solo supervisor. Fija una contraseña nueva sin pedir la actual; funciona también con usuarios ' +
      'inactivos. No devuelve cuerpo.',
  })
  @ApiNoContentResponse({ description: 'Contraseña restablecida.' })
  @ApiBadRequestResponse({ description: 'Contraseña ausente o fuera de 8 a 72 caracteres.' })
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido.' })
  @ApiForbiddenResponse({ description: 'El rol no es supervisor.' })
  @ApiNotFoundResponse({ description: 'El usuario no existe.' })
  restablecerContrasena(
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
    @Body() dto: RestablecerContrasenaDto,
  ): Promise<void> {
    return this.service.restablecerContrasena(usuarioId, dto.contrasena);
  }

  @Get('catalogos/roles')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar roles' })
  @ApiOkResponse({ type: Rol, isArray: true })
  listarRoles(): Promise<Rol[]> {
    return this.service.listarRoles();
  }

  @Get('catalogos/tipos-asesor')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar tipos de asesor (tabla de otro módulo)' })
  @ApiOkResponse({ type: TipoAsesor, isArray: true })
  listarTiposAsesor(): Promise<TipoAsesor[]> {
    return this.service.listarTiposAsesor();
  }
}
