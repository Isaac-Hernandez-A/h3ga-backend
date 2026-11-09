import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
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
