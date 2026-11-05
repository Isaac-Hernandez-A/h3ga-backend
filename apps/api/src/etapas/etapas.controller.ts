import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClienteAccessGuard } from '../common/auth/cliente-access.guard';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { CreateEtapaTramiteDto } from './dto/create-etapa-tramite.dto';
import { UpdateEtapaTramiteDto } from './dto/update-etapa-tramite.dto';
import { EstatusTramite } from './entities/estatus-tramite.entity';
import { EtapaProceso } from './entities/etapa-proceso.entity';
import { EtapaTramite } from './entities/etapa-tramite.entity';
import { EtapaTramiteHistorial } from './entities/etapa-tramite-historial.entity';
import { EtapasService } from './etapas.service';

@ApiTags('etapas')
@UseGuards(ClienteAccessGuard)
@Controller()
export class EtapasController {
  constructor(private readonly service: EtapasService) {}

  @Get('clientes/:clienteId/etapas')
  @Roles(...PERMISOS.etapas.leer)
  @ApiOperation({ summary: 'Listar las etapas del cliente' })
  @ApiOkResponse({ type: EtapaTramite, isArray: true })
  listarEtapas(@Param('clienteId', ParseUUIDPipe) clienteId: string): Promise<EtapaTramite[]> {
    return this.service.listarEtapas(clienteId);
  }

  @Post('clientes/:clienteId/etapas')
  @Roles(...PERMISOS.etapas.escribir)
  @ApiOperation({ summary: 'Registrar una etapa del cliente' })
  @ApiCreatedResponse({ type: EtapaTramite })
  crearEtapa(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateEtapaTramiteDto,
  ): Promise<EtapaTramite> {
    return this.service.crearEtapa(clienteId, dto);
  }

  @Patch('clientes/:clienteId/etapas/:etapaTramiteId')
  @Roles(...PERMISOS.etapas.escribir)
  @ApiOperation({ summary: 'Actualizar estatus, avance o acción de una etapa' })
  @ApiOkResponse({ type: EtapaTramite })
  actualizarEtapa(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('etapaTramiteId', ParseUUIDPipe) etapaTramiteId: string,
    @Body() dto: UpdateEtapaTramiteDto,
  ): Promise<EtapaTramite> {
    return this.service.actualizarEtapa(clienteId, etapaTramiteId, dto);
  }

  @Get('clientes/:clienteId/etapas/:etapaTramiteId/historial')
  @Roles(...PERMISOS.etapas.leer)
  @ApiOperation({ summary: 'Listar el historial de cambios de estatus de una etapa' })
  @ApiOkResponse({ type: EtapaTramiteHistorial, isArray: true })
  listarHistorialEtapa(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('etapaTramiteId', ParseUUIDPipe) etapaTramiteId: string,
  ): Promise<EtapaTramiteHistorial[]> {
    return this.service.listarHistorialEtapa(clienteId, etapaTramiteId);
  }

  @Get('catalogos/etapas')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar las etapas del proceso (0 a 15)' })
  @ApiOkResponse({ type: EtapaProceso, isArray: true })
  listarCatalogoEtapas(): Promise<EtapaProceso[]> {
    return this.service.listarCatalogoEtapas();
  }

  @Get('catalogos/estatus')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar los estatus de trámite' })
  @ApiOkResponse({ type: EstatusTramite, isArray: true })
  listarEstatus(): Promise<EstatusTramite[]> {
    return this.service.listarEstatus();
  }
}
