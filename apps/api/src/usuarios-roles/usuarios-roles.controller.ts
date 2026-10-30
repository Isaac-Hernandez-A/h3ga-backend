import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Rol } from './entities/rol.entity';
import { TipoAsesor } from './entities/tipo-asesor.entity';
import { Usuario } from './entities/usuario.entity';
import { UsuariosRolesService } from './usuarios-roles.service';

@ApiTags('usuarios-roles')
@Controller()
export class UsuariosRolesController {
  constructor(private readonly service: UsuariosRolesService) {}

  @Get('usuarios')
  @Roles(...PERMISOS.usuarios.leer)
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiOkResponse({ type: Usuario, isArray: true })
  listarUsuarios(): Promise<Usuario[]> {
    return this.service.listarUsuarios();
  }

  @Get('usuarios/:usuarioId')
  @Roles(...PERMISOS.usuarios.leer)
  @ApiOperation({ summary: 'Obtener un usuario' })
  @ApiOkResponse({ type: Usuario })
  obtenerUsuario(@Param('usuarioId', ParseUUIDPipe) usuarioId: string): Promise<Usuario> {
    return this.service.obtenerUsuario(usuarioId);
  }

  @Post('usuarios')
  @Roles(...PERMISOS.usuarios.escribir)
  @ApiOperation({ summary: 'Crear un usuario' })
  @ApiCreatedResponse({ type: Usuario })
  crearUsuario(@Body() dto: CreateUsuarioDto): Promise<Usuario> {
    return this.service.crearUsuario(dto);
  }

  @Patch('usuarios/:usuarioId')
  @Roles(...PERMISOS.usuarios.escribir)
  @ApiOperation({ summary: 'Actualizar o desactivar un usuario' })
  @ApiOkResponse({ type: Usuario })
  actualizarUsuario(
    @Param('usuarioId', ParseUUIDPipe) usuarioId: string,
    @Body() dto: UpdateUsuarioDto,
  ): Promise<Usuario> {
    return this.service.actualizarUsuario(usuarioId, dto);
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
