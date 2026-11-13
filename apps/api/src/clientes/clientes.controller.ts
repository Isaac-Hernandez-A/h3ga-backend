import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { ClienteAccessGuard } from '../common/auth/cliente-access.guard';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { PERMISOS } from '../common/auth/permisos';
import { Roles } from '../common/auth/roles.decorator';
import { CreateClienteAuxiliarDto } from './dto/create-cliente-auxiliar.dto';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { CreateHistorialLaboralDto } from './dto/create-historial-laboral.dto';
import { CreateInformacionIsssteDto } from './dto/create-informacion-issste.dto';
import { ReasignarClienteDto } from './dto/reasignar-cliente.dto';
import { ReemplazarObjetivosEspecificosDto } from './dto/reemplazar-objetivos-especificos.dto';
import { UpdateClienteAuxiliarDto } from './dto/update-cliente-auxiliar.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Afore } from './entities/afore.entity';
import { Cliente } from './entities/cliente.entity';
import { ClienteAuxiliar } from './entities/cliente-auxiliar.entity';
import { ClienteObjetivoEspecifico } from './entities/cliente-objetivo-especifico.entity';
import { HistorialLaboral } from './entities/historial-laboral.entity';
import { InformacionIssste } from './entities/informacion-issste.entity';
import { LeyProbable } from './entities/ley-probable.entity';
import { ObjetivoEspecificoInicial } from './entities/objetivo-especifico-inicial.entity';
import { RegimenPrincipal } from './entities/regimen-principal.entity';
import { F0PdfService } from '../reportes/pdf/f0-pdf.service';
import { ClientesService } from './clientes.service';

@ApiTags('clientes')
@UseGuards(ClienteAccessGuard)
@Controller()
export class ClientesController {
  constructor(
    private readonly service: ClientesService,
    private readonly f0Pdf: F0PdfService,
  ) {}

  @Get('clientes')
  @Roles(...PERMISOS.clientes.consultar)
  @ApiOperation({ summary: 'Listar clientes' })
  @ApiOkResponse({ type: Cliente, isArray: true })
  listarClientes(@CurrentUser() usuario: AuthenticatedUser): Promise<Cliente[]> {
    return this.service.listar(usuario);
  }

  // Autenticación (JwtAuthGuard) y rol (RolesGuard) son globales; la pertenencia al cliente
  // (ClienteAccessGuard) se aplica a todo el controlador.
  @Get('clientes/:clienteId')
  @Roles(...PERMISOS.clientes.consultar)
  @ApiOperation({ summary: 'Obtener un cliente' })
  @ApiOkResponse({ type: Cliente })
  @ApiNotFoundResponse({ description: 'El cliente no existe o el usuario no tiene acceso a él.' })
  obtenerCliente(@Param('clienteId', ParseUUIDPipe) clienteId: string): Promise<Cliente> {
    return this.service.obtenerCliente(clienteId);
  }

  @Post('clientes')
  @Roles(...PERMISOS.clientes.crear)
  @ApiOperation({ summary: 'Registrar un cliente' })
  @ApiCreatedResponse({ type: Cliente })
  crearCliente(
    @CurrentUser() usuario: AuthenticatedUser,
    @Body() dto: CreateClienteDto,
  ): Promise<Cliente> {
    return this.service.crear(usuario, dto);
  }

  @Patch('clientes/:clienteId')
  @Roles(...PERMISOS.clientes.editar)
  @ApiOperation({ summary: 'Actualizar un cliente' })
  @ApiOkResponse({ type: Cliente })
  actualizarCliente(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: UpdateClienteDto,
  ): Promise<Cliente> {
    return this.service.actualizar(clienteId, dto);
  }

  @Patch('clientes/:clienteId/asesor')
  @Roles(...PERMISOS.clientes.reasignar)
  @ApiOperation({ summary: 'Reasignar el expediente del cliente a otro asesor' })
  @ApiOkResponse({ type: Cliente })
  reasignarAsesor(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReasignarClienteDto,
  ): Promise<Cliente> {
    return this.service.reasignarAsesor(clienteId, dto.asesor_id);
  }

  @Get('clientes/:clienteId/auxiliares')
  @Roles(...PERMISOS.clientes.leer)
  @ApiOperation({ summary: 'Listar auxiliares asignados al cliente' })
  @ApiOkResponse({ type: ClienteAuxiliar, isArray: true })
  listarAuxiliares(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<ClienteAuxiliar[]> {
    return this.service.listarAuxiliares(clienteId);
  }

  @Post('clientes/:clienteId/auxiliares')
  @Roles(...PERMISOS.clientes.auxiliares)
  @ApiOperation({ summary: 'Asignar un auxiliar al cliente' })
  @ApiCreatedResponse({ type: ClienteAuxiliar })
  asignarAuxiliar(
    @CurrentUser() usuario: AuthenticatedUser,
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateClienteAuxiliarDto,
  ): Promise<ClienteAuxiliar> {
    return this.service.autorizarAuxiliar(usuario, clienteId, dto.auxiliar_id);
  }

  @Patch('clientes/:clienteId/auxiliares/:clienteAuxiliarId')
  @Roles(...PERMISOS.clientes.auxiliares)
  @ApiOperation({ summary: 'Activar o desactivar la asignación de un auxiliar' })
  @ApiOkResponse({ type: ClienteAuxiliar })
  actualizarAuxiliar(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Param('clienteAuxiliarId', ParseUUIDPipe) clienteAuxiliarId: string,
    @Body() dto: UpdateClienteAuxiliarDto,
  ): Promise<ClienteAuxiliar> {
    return this.service.cambiarAutorizacion(clienteId, clienteAuxiliarId, dto.activo);
  }

  @Get('clientes/:clienteId/historial-laboral')
  @Roles(...PERMISOS.clientes.leer)
  @ApiOperation({
    summary: 'Obtener el historial laboral',
    description: 'Un cliente sin historial laboral responde 200 con el cuerpo vacío.',
  })
  @ApiOkResponse({ type: HistorialLaboral })
  obtenerHistorialLaboral(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<HistorialLaboral | null> {
    return this.service.obtenerHistorialLaboral(clienteId);
  }

  @Put('clientes/:clienteId/historial-laboral')
  @Roles(...PERMISOS.clientes.editar)
  @ApiOperation({ summary: 'Crear o reemplazar el historial laboral' })
  @ApiOkResponse({ type: HistorialLaboral })
  guardarHistorialLaboral(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateHistorialLaboralDto,
  ): Promise<HistorialLaboral> {
    return this.service.reemplazarHistorialLaboral(clienteId, dto);
  }

  @Get('clientes/:clienteId/historial-laboral/issste')
  @Roles(...PERMISOS.clientes.leer)
  @ApiOperation({
    summary: 'Obtener la información ISSSTE',
    description: 'Sin historial laboral o sin información ISSSTE responde 200 con el cuerpo vacío.',
  })
  @ApiOkResponse({ type: InformacionIssste })
  obtenerInformacionIssste(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<InformacionIssste | null> {
    return this.service.obtenerInformacionIssste(clienteId);
  }

  @Put('clientes/:clienteId/historial-laboral/issste')
  @Roles(...PERMISOS.clientes.editar)
  @ApiOperation({
    summary: 'Crear o reemplazar la información ISSSTE',
    description:
      'Upsert por historial laboral: dos PUT dejan una sola fila y conservan su id. Si el cliente no tiene ' +
      'historial laboral responde 409 ("Primero registra el historial laboral del cliente."). Solo el ' +
      'asesor dueño; supervisor y auxiliar reciben 403.',
  })
  @ApiConflictResponse({
    description: 'El cliente no tiene historial laboral, o el id ya es de otra fila.',
  })
  @ApiBadRequestResponse({ description: 'Cuerpo inválido (nss, régimen o años fuera de rango).' })
  @ApiOkResponse({ type: InformacionIssste })
  guardarInformacionIssste(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: CreateInformacionIsssteDto,
  ): Promise<InformacionIssste> {
    return this.service.guardarInformacionIssste(clienteId, dto);
  }

  @Get('clientes/:clienteId/objetivos-especificos')
  @Roles(...PERMISOS.clientes.leer)
  @ApiOperation({ summary: 'Listar los objetivos específicos marcados (F0)' })
  @ApiOkResponse({ type: ClienteObjetivoEspecifico, isArray: true })
  listarObjetivosEspecificos(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
  ): Promise<ClienteObjetivoEspecifico[]> {
    return this.service.listarObjetivosEspecificos(clienteId);
  }

  @Put('clientes/:clienteId/objetivos-especificos')
  @Roles(...PERMISOS.clientes.editar)
  @ApiOperation({ summary: 'Reemplazar los objetivos específicos marcados (F0)' })
  @ApiOkResponse({ type: ClienteObjetivoEspecifico, isArray: true })
  reemplazarObjetivosEspecificos(
    @Param('clienteId', ParseUUIDPipe) clienteId: string,
    @Body() dto: ReemplazarObjetivosEspecificosDto,
  ): Promise<ClienteObjetivoEspecifico[]> {
    return this.service.reemplazarObjetivosEspecificos(clienteId, dto.objetivo_ids);
  }

  @Get('clientes/:clienteId/diagnostico-inicial/pdf')
  @Roles(...PERMISOS.clientes.consultar)
  @ApiOperation({ summary: 'Descargar el formato F0 (Diagnóstico Inicial) del cliente en PDF' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'El PDF del formato F0.' })
  @ApiNotFoundResponse({ description: 'El cliente no existe o el usuario no tiene acceso a él.' })
  async descargarF0(@Param('clienteId', ParseUUIDPipe) clienteId: string): Promise<StreamableFile> {
    const pdf = await this.f0Pdf.generar(clienteId);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="F0-${clienteId}.pdf"`,
      length: pdf.length,
    });
  }

  @Get('catalogos/regimenes')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar regímenes' })
  @ApiOkResponse({ type: RegimenPrincipal, isArray: true })
  listarRegimenes(): Promise<RegimenPrincipal[]> {
    return this.service.listarRegimenes();
  }

  @Get('catalogos/leyes-probables')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar leyes probables' })
  @ApiOkResponse({ type: LeyProbable, isArray: true })
  listarLeyesProbables(): Promise<LeyProbable[]> {
    return this.service.listarLeyesProbables();
  }

  @Get('catalogos/afores')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar AFORE' })
  @ApiOkResponse({ type: Afore, isArray: true })
  listarAfores(): Promise<Afore[]> {
    return this.service.listarAfores();
  }

  @Get('catalogos/objetivos-especificos')
  @Roles(...PERMISOS.catalogos.leer)
  @ApiOperation({ summary: 'Listar el catálogo de objetivos específicos (F0)' })
  @ApiOkResponse({ type: ObjetivoEspecificoInicial, isArray: true })
  listarObjetivosEspecificosInicial(): Promise<ObjetivoEspecificoInicial[]> {
    return this.service.listarObjetivosEspecificosInicial();
  }
}
