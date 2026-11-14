import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { ListarAvisosQueryDto } from './dto/listar-avisos-query.dto';
import { AvisoRespuesta } from './dto/aviso-respuesta.dto';
import { AvisosService } from './avisos.service';

@ApiTags('avisos')
@Controller()
export class AvisosController {
  constructor(private readonly service: AvisosService) {}

  @Get('avisos')
  @Roles(...PERMISOS.avisos.leer)
  @ApiOperation({ summary: 'Listar avisos' })
  @ApiOkResponse({ type: AvisoRespuesta, isArray: true })
  listarAvisos(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() consulta: ListarAvisosQueryDto,
  ): Promise<AvisoRespuesta[]> {
    return this.service.listar(usuario, consulta);
  }

  @Get('avisos/:avisoId')
  @Roles(...PERMISOS.avisos.leer)
  @ApiOperation({ summary: 'Obtener un aviso' })
  @ApiOkResponse({ type: AvisoRespuesta })
  @ApiNotFoundResponse({ description: 'El aviso no existe o es de un cliente fuera del alcance.' })
  obtenerAviso(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('avisoId', ParseUUIDPipe) avisoId: string,
  ): Promise<AvisoRespuesta> {
    return this.service.obtenerAviso(usuario, avisoId);
  }

  @Patch('avisos/:avisoId/atender')
  @Roles(...PERMISOS.avisos.atender)
  @ApiOperation({ summary: 'Marcar un aviso como atendido' })
  @ApiOkResponse({ type: AvisoRespuesta })
  @ApiNotFoundResponse({ description: 'El aviso no existe o es de un cliente fuera del alcance.' })
  atenderAviso(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('avisoId', ParseUUIDPipe) avisoId: string,
  ): Promise<AvisoRespuesta> {
    return this.service.atender(usuario, avisoId);
  }
}
