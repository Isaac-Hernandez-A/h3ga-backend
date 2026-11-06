import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { ClienteAccessGuard } from '../common/auth/cliente-access.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { CreateCorreccionClienteDto } from './dto/create-correccion-cliente.dto';
import { CreateUnificacionNssDetalleDto } from './dto/create-unificacion-nss-detalle.dto';
import { CreateUnificacionNssSecundarioDto } from './dto/create-unificacion-nss-secundario.dto';
import { UpdateCorreccionClienteDto } from './dto/update-correccion-cliente.dto';
import { CorreccionCliente } from './entities/correccion-cliente.entity';
import { TipoCorreccion } from './entities/tipo-correccion.entity';
import { UnificacionNssDetalle } from './entities/unificacion-nss-detalle.entity';
import { UnificacionNssSecundario } from './entities/unificacion-nss-secundario.entity';
import { TramitesService } from './tramites.service';

@ApiTags('tramites')
@UseGuards(ClienteAccessGuard)
@Controller()
export class TramitesController {
  constructor(private readonly service: TramitesService) {}

  @Get('clientes/:clienteId/correcciones')
  @Roles(...PERMISOS.tramites.leer)
  @ApiOperation({ summary: 'Listar correcciones del cliente' })
  @ApiOkResponse({ type: CorreccionCliente, isArray: true })
  listarCorrecciones(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<CorreccionCliente[]> {
    return this.service.listarCorrecciones(clienteId);
  }

  @Post('clientes/:clienteId/correcciones')
  @Roles(...PERMISOS.tramites.escribir)
  @ApiOperation({ summary: 'Registrar una corrección' })
  @ApiCreatedResponse({ type: CorreccionCliente })
  crearCorreccion(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateCorreccionClienteDto,
  ): Promise<CorreccionCliente> {
    return this.service.crearCorreccion(usuario, clienteId, dto);
  }

  @Get('clientes/:clienteId/correcciones/:correccionId')
  @Roles(...PERMISOS.tramites.leer)
  @ApiOperation({ summary: 'Obtener una corrección' })
  @ApiOkResponse({ type: CorreccionCliente })
  obtenerCorreccion(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('correccionId', ParseUUIDPipe) correccionId: string,
  ): Promise<CorreccionCliente> {
    return this.service.obtenerCorreccion(clienteId, correccionId);
  }

  @Patch('clientes/:clienteId/correcciones/:correccionId')
  @Roles(...PERMISOS.tramites.escribir)
  @ApiOperation({ summary: 'Actualizar una corrección' })
  @ApiOkResponse({ type: CorreccionCliente })
  actualizarCorreccion(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('correccionId', ParseUUIDPipe) correccionId: string,
    @Body() dto: UpdateCorreccionClienteDto,
  ): Promise<CorreccionCliente> {
    return this.service.actualizarCorreccion(clienteId, correccionId, dto);
  }

  @Get('clientes/:clienteId/correcciones/:correccionId/unificacion-nss')
  @Roles(...PERMISOS.tramites.leer)
  @ApiOperation({ summary: 'Obtener el detalle de unificación de NSS' })
  @ApiOkResponse({ type: UnificacionNssDetalle })
  obtenerUnificacionNss(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('correccionId', ParseUUIDPipe) correccionId: string,
  ): Promise<UnificacionNssDetalle> {
    return this.service.obtenerUnificacionNss(clienteId, correccionId);
  }

  @Put('clientes/:clienteId/correcciones/:correccionId/unificacion-nss')
  @Roles(...PERMISOS.tramites.escribir)
  @ApiOperation({ summary: 'Crear o reemplazar el detalle de unificación de NSS' })
  @ApiOkResponse({ type: UnificacionNssDetalle })
  guardarUnificacionNss(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('correccionId', ParseUUIDPipe) correccionId: string,
    @Body() dto: CreateUnificacionNssDetalleDto,
  ): Promise<UnificacionNssDetalle> {
    return this.service.guardarUnificacionNss(clienteId, correccionId, dto);
  }

  @Get('clientes/:clienteId/correcciones/:correccionId/unificacion-nss/secundarios')
  @Roles(...PERMISOS.tramites.leer)
  @ApiOperation({ summary: 'Listar los NSS secundarios' })
  @ApiOkResponse({ type: UnificacionNssSecundario, isArray: true })
  listarNssSecundarios(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('correccionId', ParseUUIDPipe) correccionId: string,
  ): Promise<UnificacionNssSecundario[]> {
    return this.service.listarNssSecundarios(clienteId, correccionId);
  }

  @Post('clientes/:clienteId/correcciones/:correccionId/unificacion-nss/secundarios')
  @Roles(...PERMISOS.tramites.escribir)
  @ApiOperation({ summary: 'Agregar un NSS secundario' })
  @ApiCreatedResponse({ type: UnificacionNssSecundario })
  agregarNssSecundario(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('correccionId', ParseUUIDPipe) correccionId: string,
    @Body() dto: CreateUnificacionNssSecundarioDto,
  ): Promise<UnificacionNssSecundario> {
    return this.service.agregarNssSecundario(clienteId, correccionId, dto);
  }

  @Get('catalogos/tipos-correccion')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar tipos de corrección' })
  @ApiOkResponse({ type: TipoCorreccion, isArray: true })
  listarTiposCorreccion(): Promise<TipoCorreccion[]> {
    return this.service.listarTiposCorreccion();
  }
}
