import {
  HttpCode,
  Delete,
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
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { ClienteAccessGuard } from '../common/auth/cliente-access.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { CorreccionesListadoRespuesta } from './dto/correcciones-listado-respuesta.dto';
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

  @Get('correcciones')
  @Roles(...PERMISOS.tramites.leer)
  @ApiOperation({
    summary: 'Clientes del asesor que requieren correcciones (fases F2, F3 y F4)',
    description:
      'Solo los clientes del asesor que requieren al menos una fase (F2 corrección de datos, F3 unificación ' +
      'de NSS, F4 recuperación de semanas), por actualizado_el descendente, máximo 500. Cada cliente trae ' +
      'siempre las fases 2, 3 y 4 con `requiere`, `correcciones` y `documentos_cargados`; si no tiene la ' +
      'etapa, estatus null y avance 0. Solo el asesor.',
  })
  @ApiOkResponse({ type: CorreccionesListadoRespuesta })
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido.' })
  @ApiForbiddenResponse({ description: 'Solo el asesor puede consultar este listado.' })
  listarTramites(@CurrentUser() usuario: AuthenticatedUser): Promise<CorreccionesListadoRespuesta> {
    return this.service.listarCorreccionesDelAsesor(usuario);
  }

  @Get('clientes/:clienteId/correcciones')
  @Roles(...PERMISOS.tramites.leer)
  @ApiOperation({
    summary: 'Listar correcciones del cliente',
    description:
      'En el orden de inserción (el del PDF del F0). Sin correcciones responde 200 con []. Una corrección ' +
      'editada pasa al final de la lista.',
  })
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
  @ApiNotFoundResponse({ description: 'No existe o es de otro cliente.' })
  @ApiOkResponse({ type: CorreccionCliente })
  obtenerCorreccion(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('correccionId', ParseUUIDPipe) correccionId: string,
  ): Promise<CorreccionCliente> {
    return this.service.obtenerCorreccion(clienteId, correccionId);
  }

  @Patch('clientes/:clienteId/correcciones/:correccionId')
  @Roles(...PERMISOS.tramites.escribir)
  @ApiOperation({
    summary: 'Actualizar una corrección',
    description:
      'Actualización parcial de observaciones, tiempo_promedio, dato_actual y dato_correcto (null borra el ' +
      'campo; el tipo no se cambia). En los tipos que modifican el expediente, dato_correcto es obligatorio ' +
      'y no puede borrarse. Con cuerpo {} responde 200 sin cambios.',
  })
  @ApiBadRequestResponse({ description: 'Cuerpo inválido o dato_correcto inválido para el tipo.' })
  @ApiNotFoundResponse({ description: 'No existe o es de otro cliente.' })
  @ApiOkResponse({ type: CorreccionCliente })
  actualizarCorreccion(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('correccionId', ParseUUIDPipe) correccionId: string,
    @Body() dto: UpdateCorreccionClienteDto,
  ): Promise<CorreccionCliente> {
    return this.service.actualizarCorreccion(clienteId, correccionId, dto);
  }

  @Delete('clientes/:clienteId/correcciones/:correccionId')
  @Roles(...PERMISOS.tramites.escribir)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Quitar una corrección',
    description:
      'Borra la corrección del cliente. Si es una unificación de NSS, borra también su detalle y sus NSS ' +
      'secundarios (en una transacción). Responde 204 sin cuerpo. No revierte lo que la corrección ya haya ' +
      'aplicado al expediente. Cambia el cálculo de GET /correcciones (F2 deja de requerirse si ya no quedan ' +
      'correcciones que no sean de unificación de NSS).',
  })
  @ApiNoContentResponse({ description: 'La corrección se borró.' })
  @ApiNotFoundResponse({ description: 'No existe o es de otro cliente.' })
  eliminarCorreccion(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('correccionId', ParseUUIDPipe) correccionId: string,
  ): Promise<void> {
    return this.service.eliminarCorreccion(clienteId, correccionId);
  }

  @Get('clientes/:clienteId/correcciones/:correccionId/unificacion-nss')
  @Roles(...PERMISOS.tramites.leer)
  @ApiOperation({
    summary: 'Obtener el detalle de unificación de NSS',
    description: '404 si la corrección no es del cliente o todavía no tiene detalle.',
  })
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
  @ApiOperation({
    summary: 'Listar los NSS secundarios',
    description:
      'Sin detalle de unificación o sin secundarios responde 200 con []. 404 si la corrección no es del cliente.',
  })
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
