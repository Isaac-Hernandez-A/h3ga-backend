import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { ListarAvisosQueryDto } from './dto/listar-avisos-query.dto';
import { Aviso } from './entities/aviso.entity';
import { AvisosService } from './avisos.service';

@ApiTags('avisos')
@Controller()
export class AvisosController {
  constructor(private readonly service: AvisosService) {}

  @Get('avisos')
  @Roles(...PERMISOS.avisos.leer)
  @ApiOperation({ summary: 'Listar avisos' })
  @ApiOkResponse({ type: Aviso, isArray: true })
  listarAvisos(
    @CurrentUser() usuario: AuthenticatedUser,
    @Query() consulta: ListarAvisosQueryDto,
  ): Promise<Aviso[]> {
    return this.service.listar(usuario, consulta);
  }

  @Get('avisos/:avisoId')
  @Roles(...PERMISOS.avisos.leer)
  @ApiOperation({ summary: 'Obtener un aviso' })
  @ApiOkResponse({ type: Aviso })
  obtenerAviso(@Param('avisoId', ParseUUIDPipe) avisoId: string): Promise<Aviso> {
    return this.service.obtenerAviso(avisoId);
  }

  @Patch('avisos/:avisoId/atender')
  @Roles(...PERMISOS.avisos.atender)
  @ApiOperation({ summary: 'Marcar un aviso como atendido' })
  @ApiOkResponse({ type: Aviso })
  atenderAviso(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('avisoId', ParseUUIDPipe) avisoId: string,
  ): Promise<Aviso> {
    return this.service.atender(usuario, avisoId);
  }
}
